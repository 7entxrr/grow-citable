import { NextRequest, NextResponse } from 'next/server';
import { getPaddleClient } from '@/lib/paddle/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const subQuery = query(
      collection(db, 'subscriptions'),
      where('user_id', '==', userId),
    );
    const subSnap = await getDocs(subQuery);
    
    let subscriptionId: string | null = null;
    let subDocRef: any = null;

    if (!subSnap.empty) {
      const cancelingSub = subSnap.docs.find(d => d.data().status === 'canceling');
      const targetDoc = cancelingSub || subSnap.docs[0];
      subscriptionId = targetDoc.data().subscription_id;
      subDocRef = targetDoc.ref;
    }

    if (!subscriptionId) {
      return NextResponse.json({ error: 'No active canceling subscription found' }, { status: 404 });
    }

    const paddle = getPaddleClient();
    
    // Call Paddle to cancel the scheduled cancellation
    await paddle.subscriptions.update(subscriptionId, {
      scheduledChange: null
    });

    console.log('[resume-sub] updated Paddle subscription to remove scheduledChange:', subscriptionId);

    // Update Firestore subscription document
    if (subDocRef) {
      await updateDoc(subDocRef, {
        status: 'active',
        cancel_at: null,
        scheduled_change_action: null,
        scheduled_change_at: null,
        updated_at: new Date(),
      });
    }

    // Ensure user document subscription flag is active
    await updateDoc(doc(db, 'users', userId), {
      subscribed: true,
      updated_at: new Date(),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed successfully',
    });
  } catch (error: any) {
    console.error('[resume-sub] ERROR:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resume subscription' },
      { status: 500 }
    );
  }
}
