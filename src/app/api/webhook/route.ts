import { NextRequest } from 'next/server';
import { getPaddleClient } from '@/lib/paddle/server';
import {
  upsertCustomer,
  upsertSubscription,
  cancelSubscription,
  saveTransaction,
  PRICE_TO_PLAN,
} from '@/lib/paddle/db';
import { EventName } from '@paddle/paddle-node-sdk';
import { db } from '@/lib/firebase';
import { doc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

function logToFile(msg: string) {
  try {
    const logPath = path.join(process.cwd(), 'scratch', 'webhook.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {
    console.error('Failed to write log to file:', e);
  }
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  logToFile('------------------- WEBHOOK REQUEST RECEIVED -------------------');
  try {
    const paddle = getPaddleClient();
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

    const signature = request.headers.get('paddle-signature') || '';
    const rawBody = await request.text();

    logToFile(`Signature: ${signature ? 'present' : 'missing'}`);
    logToFile(`Secret configured: ${webhookSecret ? 'yes' : 'no'}`);
    logToFile(`Body length: ${rawBody.length}`);
    logToFile(`Raw Body: ${rawBody}`);

    console.log('Webhook received. Signature:', signature ? 'present' : 'missing', 'Secret:', webhookSecret ? 'present' : 'missing');

    let event;
    if (webhookSecret && signature) {
      try {
        event = await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature);
        logToFile('Unmarshal succeeded');
      } catch (e: any) {
        console.error('Webhook signature verification failed:', e.message);
        logToFile(`Unmarshal failed: ${e.message}`);
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      try {
        event = JSON.parse(rawBody);
        logToFile('JSON.parse succeeded');
      } catch (e: any) {
        logToFile(`JSON.parse failed: ${e.message}`);
        return Response.json({ error: 'Invalid payload' }, { status: 400 });
      }
    }

    const eventType = event?.eventType || event?.event_type;
    logToFile(`Parsed Event Type: ${eventType}`);
    console.log('Webhook event type:', eventType);

    switch (eventType) {
      case 'customer.created':
      case 'customer.updated': {
        const data = event.data;
        await upsertCustomer({
          customerId: data.id,
          email: data.email,
        });
        break;
      }

      case 'subscription.created':
      case 'subscription.activated':
      case 'subscription.updated': {
        const data = event.data;
        const customData = data.customData || data.custom_data || {};
        const customerId = data.customerId || data.customer_id || '';
        const subscriptionId = data.id;
        const status = data.status;
        const priceId = data.items?.[0]?.priceId || data.items?.[0]?.price?.id || data.items?.[0]?.price_id || '';
        const productId = data.items?.[0]?.productId || data.items?.[0]?.product_id || data.items?.[0]?.price?.productId || data.items?.[0]?.price?.product_id || '';
        const scheduledChangeAction = data.scheduledChange?.action || data.scheduled_change?.action || undefined;
        const scheduledChangeAt = data.scheduledChange?.effectiveAt || data.scheduled_change?.effective_at || undefined;
        const userId = customData.userId || customData.user_id || undefined;
        const planName = PRICE_TO_PLAN[priceId] || '';

        logToFile(`Subscription ${eventType}: status=${status}, subscriptionId=${subscriptionId}, userId=${userId || 'unknown'}`);

        await upsertSubscription({
          subscriptionId,
          customerId,
          status,
          priceId,
          productId,
          scheduledChangeAction,
          scheduledChangeAt,
          userId,
          planName,
        });

        if (customerId) {
          await upsertCustomer({
            customerId,
            email: customData.email || data.customer?.email || '',
          });
        }

        if (status === 'past_due' && userId) {
          logToFile(`Payment past_due for user ${userId} — revoking access`);
          await updateDoc(doc(db, 'users', userId), {
            payment_past_due: true,
            updated_at: new Date(),
          }).catch((e: any) => {
            logToFile(`Failed to mark payment_past_due: ${e.message}`);
          });
        }

        break;
      }

      case 'subscription.paused': {
        const data = event.data;
        const customData = data.customData || data.custom_data || {};
        const userId = customData.userId || customData.user_id || '';
        logToFile(`Subscription paused: id=${data.id}, userId=${userId || 'unknown'}`);

        await upsertSubscription({
          subscriptionId: data.id,
          customerId: data.customerId || data.customer_id || '',
          status: 'paused',
          priceId: data.items?.[0]?.priceId || data.items?.[0]?.price?.id || data.items?.[0]?.price_id || '',
          productId: data.items?.[0]?.productId || data.items?.[0]?.product_id || '',
          userId,
          planName: '',
        });

        if (userId) {
          await updateDoc(doc(db, 'users', userId), {
            subscribed: false,
            plan: 'Free',
            payment_past_due: true,
            updated_at: new Date(),
          }).catch(() => {});
        }
        break;
      }

      case 'subscription.resumed': {
        const data = event.data;
        const customData = data.customData || data.custom_data || {};
        const userId = customData.userId || customData.user_id || '';
        logToFile(`Subscription resumed: id=${data.id}, userId=${userId || 'unknown'}`);

        await upsertSubscription({
          subscriptionId: data.id,
          customerId: data.customerId || data.customer_id || '',
          status: 'active',
          priceId: data.items?.[0]?.priceId || data.items?.[0]?.price?.id || data.items?.[0]?.price_id || '',
          productId: data.items?.[0]?.productId || data.items?.[0]?.product_id || '',
          userId,
          planName: '',
        });

        break;
      }

      case 'subscription.canceled': {
        const data = event.data;
        await cancelSubscription(data.id);
        break;
      }

      case 'transaction.past_due': {
        const data = event.data;
        const customData = data.customData || data.custom_data || {};
        const userId = customData.userId || customData.user_id || '';
        logToFile(`Transaction past_due for userId=${userId}, transactionId=${data.id}`);
        if (userId) {
          await updateDoc(doc(db, 'users', userId), {
            payment_past_due: true,
            updated_at: new Date(),
          }).catch((e: any) => {
            logToFile(`Failed to mark payment_past_due for ${userId}: ${e.message}`);
          });
        }
        break;
      }

      case 'transaction.completed': {
        const data = event.data;

        console.log('[WEBHOOK] transaction.completed payload:', JSON.stringify(data, null, 2));

        const customerId = data.customerId || data.customer_id || '';
        const customData = data.customData || data.custom_data || {};
        const userId = customData.userId || customData.user_id || '';
        const email = customData.email || customData.user_email || data.customer?.email || data.customer_details?.email || '';
        const subscriptionId = data.subscriptionId || data.subscription_id || '';
        const priceId = data.items?.[0]?.price?.id || data.items?.[0]?.price_id || '';
        const currency = data.currencyCode || data.currency_code || 'USD';
        const status = data.status || 'completed';

        if (customerId) {
          await upsertCustomer({
            customerId,
            email,
          });
        }

        // Handle payment details in all forms (camelCase list, snake_case list, or single object)
        const payments = data.payments || [];
        const payment = payments[0] || data.payment || {};
        const methodDetails = payment.methodDetails || payment.method_details || payment.details || {};
        const card = methodDetails.card || {};

        const total = data.details?.totals?.total || data.details?.totals?.grandTotal || data.details?.totals?.grand_total || '0';
        const amountInCents = Math.round(Number(total));

        console.log('[WEBHOOK] Extracted methodDetails:', JSON.stringify(methodDetails, null, 2));
        console.log('[WEBHOOK] Extracted card:', JSON.stringify(card, null, 2));
        console.log('[WEBHOOK] Extracted data.details:', JSON.stringify(data.details, null, 2));
        console.log('[WEBHOOK] Raw total:', total, 'Amount in cents:', amountInCents);

        const cardBrand = card.type || card.brand || 'card';
        const cardLast4 = card.last4 || '****';
        const cardExpiryMonth = card.expiryMonth || card.expiry_month || card.expiry?.month || 0;
        const cardExpiryYear = card.expiryYear || card.expiry_year || card.expiry?.year || 0;

        logToFile(`Parsed properties: userId=${userId}, transactionId=${data.id}, customerId=${customerId}, subscriptionId=${subscriptionId}, amountInCents=${amountInCents}`);

        if (userId && data.id) {
          logToFile('Calling saveTransaction...');
          try {
            await saveTransaction({
              transactionId: data.id,
              userId,
              customerId,
              subscriptionId,
              priceId,
              amount: amountInCents,
              currency,
              cardBrand,
              cardLast4,
              cardExpiryMonth,
              cardExpiryYear,
              status,
            });
            logToFile('saveTransaction succeeded');
          } catch (e: any) {
            logToFile(`saveTransaction failed: ${e.stack || e.message}`);
            throw e;
          }

          if (subscriptionId) {
            logToFile(`Backfilling subscription user_id for ${subscriptionId}`);
            const subRef = doc(db, 'subscriptions', subscriptionId);
            await setDoc(subRef, { user_id: userId, subscription_id: subscriptionId, updated_at: new Date() }, { merge: true }).catch(async (e: any) => {
              logToFile(`Direct setDoc (merge) failed: ${e.message}, querying by subscriptionId`);
              const q = query(
                collection(db, 'subscriptions'),
                where('subscription_id', '==', subscriptionId),
              );
              const snap = await getDocs(q);
              if (!snap.empty) {
                await updateDoc(snap.docs[0].ref, { user_id: userId });
                logToFile('Backfill subscription user_id succeeded via query');
              } else {
                logToFile('Subscription document not found for backfill');
              }
            });
          }
        } else {
          logToFile(`Skipping saveTransaction because userId (${userId}) or transactionId (${data.id}) is missing`);
        }
        break;
      }

      default:
        break;
    }

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    logToFile(`WEBHOOK ERROR: ${error.stack || error.message}`);
    return Response.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
