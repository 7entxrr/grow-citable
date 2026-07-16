import { NextRequest } from 'next/server';
import { getPaddleClient } from '@/lib/paddle/server';
import { saveTransaction } from '@/lib/paddle/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const paddle = getPaddleClient();
    const transactionId = request.nextUrl.searchParams.get('transactionId');
    if (!transactionId) {
      return Response.json({ error: 'transactionId is required' }, { status: 400 });
    }

    const transaction = await paddle.transactions.get(transactionId);

    const status = transaction.status || 'completed';
    const customerId = transaction.customerId || '';
    const subscriptionId = transaction.subscriptionId || '';
    const currency = transaction.currencyCode || 'USD';
    const total = transaction.details?.totals?.total || transaction.details?.totals?.grandTotal || '0';
    const amountInCents = Math.round(Number(total));

    const payments: any[] = transaction.payments || [];
    const payment: any = payments[0] || {};
    const methodDetails: any = payment.methodDetails || payment.details || {};
    const card: any = methodDetails.card || {};

    const cardBrand = card.type || card.brand || 'card';
    const cardLast4 = card.last4 || '****';
    const cardExpiryMonth = card.expiryMonth || card.expiry_month || card.expiry?.month || 0;
    const cardExpiryYear = card.expiryYear || card.expiry_year || card.expiry?.year || 0;

    const customData = transaction.customData || {};
    const userId = customData.userId || customData.user_id || '';

    const items = transaction.items || [];
    const priceId = items[0]?.price?.id || '';

    const result = {
      transactionId: transaction.id,
      userId,
      customerId,
      subscriptionId,
      priceId,
      amount: amountInCents,
      currency,
      status,
      cardBrand,
      cardLast4,
      cardExpiryMonth,
      cardExpiryYear,
    };

    if (userId) {
      await saveTransaction({
        transactionId: transaction.id,
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
    }

    return Response.json(result);
  } catch (error: any) {
    console.error('Transaction API error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}
