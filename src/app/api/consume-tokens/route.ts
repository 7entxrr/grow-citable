import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { userId, amount } = await req.json();
    if (!userId || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Missing userId or valid amount' }, { status: 400 });
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'User document not found' }, { status: 404 });
    }

    const userData = userSnap.data();
    const currentTokens = typeof userData.tokens === 'number' ? userData.tokens : 10;

    if (currentTokens < amount) {
      return NextResponse.json({ 
        error: 'INSUFFICIENT_TOKENS', 
        message: 'You have run out of AI prompts for this month. Please upgrade your plan in settings to continue.',
        remaining: currentTokens
      }, { status: 403 });
    }

    const updatedTokens = Math.max(0, currentTokens - amount);
    await updateDoc(userRef, {
      tokens: updatedTokens,
      updated_at: new Date()
    });

    return NextResponse.json({ success: true, remaining: updatedTokens });

  } catch (error: any) {
    console.error('[consume-tokens] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal token update error' }, { status: 500 });
  }
}
