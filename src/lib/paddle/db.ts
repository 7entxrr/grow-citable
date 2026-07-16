import { db } from '@/lib/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';

export interface CustomerRecord {
  customer_id: string;
  email: string;
  created_at: any;
  updated_at: any;
}

export interface SubscriptionRecord {
  subscription_id: string;
  customer_id: string;
  status: string;
  price_id: string;
  product_id: string;
  scheduled_change_action?: string;
  scheduled_change_at?: any;
  created_at: any;
  updated_at: any;
}

export interface TransactionRecord {
  transaction_id: string;
  user_id: string;
  customer_id: string;
  subscription_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  card_brand: string;
  card_last4: string;
  card_expiry_month: number;
  card_expiry_year: number;
  status: string;
  created_at: any;
  updated_at: any;
}

export const PRICE_TO_PLAN: Record<string, string> = {
  'pri_01kwzg87yb1127xkbdjt3szez6': 'Starter',
  'pri_01kwzg7ex4dwyjgrdthmdqt9ae': 'Growth',
  'pri_01kx46z00r3w6d0v3cb5smpfz3': 'Ultra',
  // Live Production Price IDs
  'pri_01kxesfv0q9wsv4xm3thwvc1m4': 'Starter',
  'pri_01kxesgv1w8s9wjmg3ar7k15y9': 'Growth',
  'pri_01kxesj1905mxkv8yekp0yf5bp': 'Ultra',
};

export async function upsertCustomer(data: {
  customerId: string;
  email: string;
}): Promise<void> {
  const ref = doc(db, 'customers', data.customerId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, { email: data.email, updated_at: new Date() });
  } else {
    await setDoc(ref, {
      customer_id: data.customerId,
      email: data.email,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }
}

export async function upsertSubscription(data: {
  subscriptionId: string;
  customerId: string;
  status: string;
  priceId: string;
  productId: string;
  userId?: string;
  planName?: string;
  scheduledChangeAction?: string;
  scheduledChangeAt?: string;
}): Promise<void> {
  const ref = doc(db, 'subscriptions', data.subscriptionId);
  const snap = await getDoc(ref);

  const planName = data.planName || PRICE_TO_PLAN[data.priceId] || '';

  const record: Record<string, any> = {
    subscription_id: data.subscriptionId,
    customer_id: data.customerId,
    status: data.status,
    price_id: data.priceId,
    product_id: data.productId,
    plan_name: planName,
    scheduled_change_action: data.scheduledChangeAction || null,
    scheduled_change_at: data.scheduledChangeAt || null,
    updated_at: new Date(),
  };

  let userId = data.userId;
  if (!userId && snap.exists()) {
    userId = snap.data().user_id;
  }

  if (userId) {
    record.user_id = userId;
  }

  if (snap.exists()) {
    await updateDoc(ref, record);
  } else {
    record.created_at = serverTimestamp();
    await setDoc(ref, record);
  }

  if (userId) {
    const userRef = doc(db, 'users', userId);
    const isActive = data.status === 'active' || data.status === 'trialing' || data.status === 'canceling';
    let tokens = 10; // Default Free
    if (isActive) {
      const lowerPlan = planName.toLowerCase();
      if (lowerPlan === 'starter') tokens = 300;
      else if (lowerPlan === 'growth') tokens = 600;
      else if (lowerPlan === 'ultra') tokens = 1000;
    }
    const updateFields: Record<string, any> = {
      subscribed: isActive,
      plan: isActive ? planName : 'Free',
      tokens,
      updated_at: new Date(),
    };
    if (isActive) {
      updateFields.payment_past_due = false;
    }
    await updateDoc(userRef, updateFields).catch(async () => {
      await setDoc(userRef, {
        ...updateFields,
      }, { merge: true });
    });
  }
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<void> {
  const ref = doc(db, 'subscriptions', subscriptionId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    await updateDoc(ref, {
      status: 'canceled',
      scheduled_change_action: null,
      scheduled_change_at: null,
      updated_at: new Date(),
    });
    if (data.user_id) {
      await updateDoc(doc(db, 'users', data.user_id), {
        subscribed: false,
        plan: 'Free',
        tokens: 10,
        updated_at: new Date(),
      }).catch(() => {});
    }
  } else {
    // fallback if document not found in direct sub
    await setDoc(ref, {
      subscription_id: subscriptionId,
      status: 'canceled',
      updated_at: new Date(),
    }, { merge: true }).catch(() => {});
  }
}

export async function getSubscriptionForCustomer(
  customerId: string
): Promise<SubscriptionRecord | null> {
  const { collection, query, where, getDocs } = await import(
    'firebase/firestore'
  );
  const q = query(
    collection(db, 'subscriptions'),
    where('customer_id', '==', customerId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as SubscriptionRecord;
}

export async function getCustomerByEmail(
  email: string
): Promise<CustomerRecord | null> {
  const { collection, query, where, getDocs } = await import(
    'firebase/firestore'
  );
  const q = query(
    collection(db, 'customers'),
    where('email', '==', email)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as CustomerRecord;
}

export function hasActiveAccess(sub: SubscriptionRecord | null): boolean {
  if (!sub) return false;
  return sub.status === 'active' || sub.status === 'trialing';
}

export async function saveTransaction(data: {
  transactionId: string;
  userId: string;
  customerId: string;
  subscriptionId: string;
  priceId: string;
  amount: number;
  currency: string;
  cardBrand: string;
  cardLast4: string;
  cardExpiryMonth: number;
  cardExpiryYear: number;
  status: string;
}): Promise<void> {
  const planName = PRICE_TO_PLAN[data.priceId] || 'Unknown';

  const transactionData = {
    transaction_id: data.transactionId,
    user_id: data.userId,
    customer_id: data.customerId,
    subscription_id: data.subscriptionId,
    plan_name: planName,
    amount: data.amount,
    currency: data.currency,
    card_brand: data.cardBrand,
    card_last4: data.cardLast4,
    card_expiry_month: data.cardExpiryMonth,
    card_expiry_year: data.cardExpiryYear,
    status: data.status,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  await setDoc(doc(db, 'transactions', data.transactionId), transactionData);

  if (data.userId) {
    await setDoc(
      doc(db, 'users', data.userId, 'transactions', data.transactionId),
      transactionData
    );

    const userRef = doc(db, 'users', data.userId);
    const isCompleted = data.status === 'completed';

    const updateFields: Record<string, any> = {
      latest_transaction_id: data.transactionId,
      paddleCustomerId: data.customerId,
      customer_id: data.customerId,
      updated_at: new Date(),
    };

    if (isCompleted) {
      updateFields.subscribed = true;
      updateFields.plan = planName;
      updateFields.payment_past_due = false;
    }

    await updateDoc(userRef, updateFields).catch(async () => {
      await setDoc(userRef, updateFields, { merge: true });
    });
  }
}

export async function getPaymentsForUser(
  userId: string
): Promise<any[]> {
  const q = query(
    collection(db, 'users', userId, 'transactions'),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => doc.data());
}

export async function getLatestTransactionForUser(
  userId: string
): Promise<TransactionRecord | null> {
  const q = query(
    collection(db, 'users', userId, 'transactions'),
    orderBy('created_at', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as TransactionRecord;
}
