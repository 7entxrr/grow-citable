'use client';

import { useState } from 'react';
import { doc, getDoc, setDoc, collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function MigrateTransactions() {
  const [status, setStatus] = useState('Ready');
  const [count, setCount] = useState(0);

  const runMigration = async () => {
    setStatus('Migrating...');
    try {
      const q = query(collection(db, 'transactions'));
      const snap = await getDocs(q);
      
      let migrated = 0;
      for (const txDoc of snap.docs) {
        const data = txDoc.data();
        const userId = data.user_id;
        const transactionId = data.transaction_id || txDoc.id;
        
        if (!userId || !transactionId) continue;

        await setDoc(
          doc(db, 'users', userId, 'transactions', transactionId),
          data
        );
        migrated++;
        setCount(migrated);
      }
      
      setStatus(`Done! Migrated ${migrated} transactions`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui' }}>
      <h2>Transaction Migration</h2>
      <p>Status: {status}</p>
      <p>Migrated: {count}</p>
      <button onClick={runMigration} disabled={status === 'Migrating...'}>
        Run Migration
      </button>
    </div>
  );
}