import { NextRequest } from 'next/server';
import { getPaddleClient } from '@/lib/paddle/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    let subscriptionId: string | null = null;

    // 1) Try subscriptions with user_id
    const subQuery = query(
      collection(db, 'subscriptions'),
      where('user_id', '==', userId),
    );
    const subSnap = await getDocs(subQuery);
    if (!subSnap.empty) {
      subscriptionId = subSnap.docs[0].data().subscription_id;
    }

    // 2) Try via latest_transaction → subscription_id
    if (!subscriptionId && userData.latest_transaction_id) {
      const txDoc = await getDoc(doc(db, 'users', userId, 'transactions', userData.latest_transaction_id));
      if (txDoc.exists() && txDoc.data().subscription_id) {
        subscriptionId = txDoc.data().subscription_id;
      }
    }

    if (!subscriptionId) {
      // Fallback: check user doc subscribed field (set by client-side save on welcome page)
      if (userData.subscribed === true && userData.plan && userData.plan !== 'Free') {
        return Response.json({
          subscription: {
            subscription_id: userData.latest_transaction_id || '',
            status: 'active',
            plan_name: userData.plan || '',
            created_at: null,
            from_user_doc: true,
          },
          payment_past_due: userData.payment_past_due === true,
        });
      }
      return Response.json({ subscription: null, payment_past_due: userData.payment_past_due === true });
    }

    const paddle = getPaddleClient();

    try {
      const paddleSub = await paddle.subscriptions.get(subscriptionId);

      const details: any = {
        subscription_id: subscriptionId,
        status: (paddleSub as any).status || 'unknown',
        plan_name: PRICE_TO_PLAN_MAP[(paddleSub as any)?.items?.[0]?.price?.id] || '',
        created_at: (paddleSub as any).createdAt,
        starts_at: (paddleSub as any).currentBillingPeriod?.startsAt || null,
        ends_at: (paddleSub as any).currentBillingPeriod?.endsAt || null,
      };

      // If Paddle returned but plan_name is empty or status isn't active,
      // fall back to Firestore user doc subscribed field (more reliable)
      if (!details.plan_name || (details.status !== 'active' && details.status !== 'trialing' && details.status !== 'canceling')) {
        if (userData.subscribed === true && userData.plan && userData.plan !== 'Free') {
          details.plan_name = details.plan_name || userData.plan;
          details.status = 'active';
          details.from_user_doc = true;
        }
      }

      if ((paddleSub as any).nextBilledAt) {
        details.next_billing = (paddleSub as any).nextBilledAt;
      } else if ((paddleSub as any).currentBillingPeriod?.endsAt) {
        details.next_billing = (paddleSub as any).currentBillingPeriod.endsAt;
      }

      if ((paddleSub as any).scheduledChange?.action === 'cancel') {
        details.canceled_at = (paddleSub as any).scheduledChange.effectiveAt;
        details.status = 'canceling';
      }

      // Card details: read from latest transaction (saved by webhook) instead of Paddle SDK (broken field)
      if (userData.latest_transaction_id) {
        const txDoc = await getDoc(doc(db, 'users', userId, 'transactions', userData.latest_transaction_id));
        if (txDoc.exists()) {
          const tx = txDoc.data();
          if (tx.card_last4 && tx.card_last4 !== '****') {
            details.card_brand = tx.card_brand || '';
            details.card_last4 = tx.card_last4 || '';
            details.card_expiry_month = tx.card_expiry_month || 0;
            details.card_expiry_year = tx.card_expiry_year || 0;
          }
        }
      }

      // Stamp user_id on subscription if missing (backfill)
      if (subSnap.empty) {
        const subQ = query(
          collection(db, 'subscriptions'),
          where('subscription_id', '==', subscriptionId),
        );
        const subS = await getDocs(subQ);
        if (!subS.empty && !subS.docs[0].data().user_id) {
          await updateDoc(subS.docs[0].ref, { user_id: userId });
        }
      }

      details.payment_past_due = userData.payment_past_due === true;

      await updateDoc(doc(db, 'subscriptions', subscriptionId), {
        status: details.status,
        next_billing: details.next_billing || null,
        cancel_at: details.canceled_at || null,
        card_brand: details.card_brand || '',
        card_last4: details.card_last4 || '',
        card_expiry_month: details.card_expiry_month || 0,
        card_expiry_year: details.card_expiry_year || 0,
        updated_at: new Date(),
      }).catch(() => {
        // Fallback: query by subscription_id
      });

      return Response.json({ subscription: details });
    } catch (paddleError) {
      // Paddle API failed — fall back to user doc subscribed field
      if (userData.subscribed === true && userData.plan && userData.plan !== 'Free') {
        return Response.json({
          subscription: {
            subscription_id: subscriptionId || userData.latest_transaction_id || '',
            status: 'active',
            plan_name: userData.plan || '',
            created_at: null,
            from_user_doc: true,
          },
          payment_past_due: userData.payment_past_due === true,
        });
      }
      return Response.json({
        subscription: {
          subscription_id: subscriptionId,
          status: 'unknown',
          plan_name: '',
          created_at: null,
        },
        payment_past_due: userData.payment_past_due === true,
      });
    }
  } catch (error: any) {
    console.error('Get subscription error:', error);
    return Response.json(
      { error: error.message || 'Failed to get subscription' },
      { status: 500 }
    );
  }
}

const PRICE_TO_PLAN_MAP: Record<string, string> = {
  'pri_01kwzg87yb1127xkbdjt3szez6': 'Starter',
  'pri_01kwzg7ex4dwyjgrdthmdqt9ae': 'Growth',
  'pri_01kx46z00r3w6d0v3cb5smpfz3': 'Ultra',
  // Live Production Price IDs
  'pri_01kxesfv0q9wsv4xm3thwvc1m4': 'Starter',
  'pri_01kxesgv1w8s9wjmg3ar7k15y9': 'Growth',
  'pri_01kxesj1905mxkv8yekp0yf5bp': 'Ultra',
};
