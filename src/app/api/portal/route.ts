import { NextRequest } from 'next/server';
import { getPaddleClient } from '@/lib/paddle/server';
import { getSubscriptionForCustomer } from '@/lib/paddle/db';
import { auth } from '@/lib/firebase';
import { getDoc, doc, collection, query, where, getDocs, orderBy, limit, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    let customerId = userData.paddleCustomerId || userData.customer_id;

    if (!customerId) {
      // Auto-repair: try to find customerId from subscriptions
      const subQuery = query(
        collection(db, 'subscriptions'),
        where('user_id', '==', userId),
      );
      const subSnap = await getDocs(subQuery);
      if (!subSnap.empty) {
        customerId = subSnap.docs[0].data().customer_id;
      }

      // If still not found, check transactions
      if (!customerId) {
        const txQuery = query(
          collection(db, 'users', userId, 'transactions'),
          orderBy('created_at', 'desc'),
          limit(1)
        );
        const txSnap = await getDocs(txQuery);
        if (!txSnap.empty) {
          customerId = txSnap.docs[0].data().customer_id;
        }
      }

      // If found, backfill the user document
      if (customerId) {
        await updateDoc(doc(db, 'users', userId), {
          paddleCustomerId: customerId,
          customer_id: customerId,
          updated_at: new Date(),
        }).catch(() => {});
      }
    }

    if (!customerId) {
      return Response.json(
        { error: 'No Paddle customer linked to this account' },
        { status: 404 }
      );
    }

    const sub = await getSubscriptionForCustomer(customerId);
    const subscriptionIds = sub ? [sub.subscription_id] : [];

    const paddle = getPaddleClient();
    const session = await paddle.customerPortalSessions.create(
      customerId,
      subscriptionIds
    );

    return Response.json({ url: session.urls.general });
  } catch (error: any) {
    console.error('Portal session error:', error);
    return Response.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
