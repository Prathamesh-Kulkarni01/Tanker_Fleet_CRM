import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// Re-export the providers and hooks
export { FirebaseProvider, useFirebase, useFirebaseApp, useFirebaseAuth, useFirestore } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';


interface FirebaseInstances {
    app: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
}

export function initializeFirebase(): FirebaseInstances {
    if (getApps().length) {
        const app = getApp();
        const auth = getAuth(app);
        const firestore = getFirestore(app);
        return { app, auth, firestore };
    }

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    return { app, auth, firestore };
}
