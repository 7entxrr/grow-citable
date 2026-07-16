import { NextRequest, NextResponse } from 'next/server';
import { getPaddleClient } from '@/lib/paddle/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId;

    console.log('[cancel-sub] userId:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.log('[cancel-sub] user not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    console.log('[cancel-sub] user data:', JSON.stringify({ latest_transaction_id: userData.latest_transaction_id, subscribed: userData.subscribed }));

    let subscriptionId: string | null = null;

    const subQuery = query(
      collection(db, 'subscriptions'),
      where('user_id', '==', userId),
    );
    const subSnap = await getDocs(subQuery);
    console.log('[cancel-sub] subscriptions by user_id:', subSnap.size);
    if (!subSnap.empty) {
      subSnap.docs.forEach(d => {
        console.log('[cancel-sub] sub doc:', d.id, JSON.stringify(d.data()));
      });
      const activeSub = subSnap.docs.find(d => d.data().status === 'active' || d.data().status === 'trialing');
      subscriptionId = (activeSub || subSnap.docs[0]).data().subscription_id;
    }

    if (!subscriptionId && userData.latest_transaction_id) {
      const txDoc = await getDoc(doc(db, 'transactions', userData.latest_transaction_id));
      console.log('[cancel-sub] transaction exists:', txDoc.exists());
      if (txDoc.exists()) {
        const txData = txDoc.data();
        console.log('[cancel-sub] transaction subscription_id:', txData.subscription_id);
        subscriptionId = txData.subscription_id;
      }
    }

    if (!subscriptionId) {
      console.log('[cancel-sub] NO subscription found, returning 404');
      return NextResponse.json({ error: 'No subscription found for this user' }, { status: 404 });
    }

    console.log('[cancel-sub] found subscriptionId:', subscriptionId);

    const paddle = getPaddleClient();

    let paddleSub: any = null;
    try {
      paddleSub = await paddle.subscriptions.get(subscriptionId);
      console.log('[cancel-sub] paddle status:', paddleSub.status);
    } catch (e: any) {
      console.error('[cancel-sub] Failed to fetch Paddle subscription:', e.message);
    }

    if (paddleSub && paddleSub.status !== 'active' && paddleSub.status !== 'trialing') {
      const subQuery2 = query(
        collection(db, 'subscriptions'),
        where('subscription_id', '==', subscriptionId),
      );
      const subSnap2 = await getDocs(subQuery2);
      if (!subSnap2.empty) {
        await updateDoc(subSnap2.docs[0].ref, { status: paddleSub.status, updated_at: new Date() });
      }
      await updateDoc(doc(db, 'users', userId), {
        subscribed: false,
        updated_at: new Date(),
      }).catch(() => {});
      return NextResponse.json({ error: 'Subscription is not active', status: paddleSub.status }, { status: 400 });
    }

    await paddle.subscriptions.cancel(subscriptionId);
    console.log('[cancel-sub] scheduled end-of-period cancel on Paddle');

    const nextBilling = paddleSub?.nextBilledAt
      || paddleSub?.currentBillingPeriod?.endsAt
      || null;

    const subQuery3 = query(
      collection(db, 'subscriptions'),
      where('subscription_id', '==', subscriptionId),
    );
    const subSnap3 = await getDocs(subQuery3);
    if (!subSnap3.empty) {
      await updateDoc(subSnap3.docs[0].ref, {
        status: 'canceling',
        cancel_at: nextBilling || new Date().toISOString(),
        updated_at: new Date(),
      });
    }

    // Keep user doc subscribed flag as true since access remains active until cancel_at!
    await updateDoc(doc(db, 'users', userId), {
      subscribed: true,
      updated_at: new Date(),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Subscription scheduled for cancellation',
      cancelAt: nextBilling || new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[cancel-sub] ERROR:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
