'use client';

import React, { ReactNode } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';

// This is a singleton that will be created on the first render.
const firebase = initializeFirebase();

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  return <FirebaseProvider value={firebase}>{children}</FirebaseProvider>;
}
