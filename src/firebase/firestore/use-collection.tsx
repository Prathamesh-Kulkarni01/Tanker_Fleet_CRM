'use client';
import { useState, useEffect } from 'react';
import { onSnapshot, type Query, type CollectionReference, type DocumentData } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '../errors';

export const useCollection = <T extends DocumentData>(
  q: Query | CollectionReference | null
): { data: T[] | null; loading: boolean; error: FirestorePermissionError | null } => {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    if (!q) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
        setData(docs);
        setLoading(false);
        setError(null);
      },
      async (err) => {
        const path = q instanceof CollectionReference ? q.path : (q as any)._query.path.segments.join('/');
        const permissionError = new FirestorePermissionError({
          path,
          operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [q]);

  return { data, loading, error };
};
