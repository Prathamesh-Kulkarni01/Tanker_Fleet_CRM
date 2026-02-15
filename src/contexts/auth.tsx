'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  getAuth,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp, collection, addDoc } from 'firebase/firestore';
import { useFirebaseAuth, useFirestore } from '@/firebase';
import { PlaceHolderImages, type ImagePlaceholder } from '@/lib/placeholder-images';

// The user object we'll use in our app, combining Firebase Auth and Firestore data.
export type User = {
  uid: string;
  id: string; // Firestore Document ID
  name: string;
  role: 'owner' | 'driver' | 'admin';
  ownerId?: string; // UID of the owner, for drivers.
  subscriptionExpiresAt?: string; // ISO string format
};

interface RegisterOwnerParams {
  name: string;
  phone: string;
  password: any;
}
interface RegisterDriverParams {
  name: string;
  phone: string;
  password: any;
}

interface AuthContextType {
  user: User | null;
  login: (phone: string, passwordOrCode: string) => Promise<{ success: boolean; error?: string }>;
  registerOwner: (params: RegisterOwnerParams) => Promise<{ success: boolean; error?: string }>;
  registerDriver: (params: RegisterDriverParams) => Promise<{ success: boolean; error?: string; driverId?: string }>;
  renewSubscription: (key: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// A dummy domain for creating a unique email from a phone number for Firebase Auth.
const DUMMY_EMAIL_DOMAIN = 'tanker-ledger.com';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();

  useEffect(() => {
    if (!auth || !firestore) {
      setLoading(false); // Firebase not ready
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in, now get their profile from Firestore.
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userProfile = userDoc.data();
          const expiresAt = userProfile.subscriptionExpiresAt;

          // Construct the rich user object for our app
          const appUser: User = {
            uid: firebaseUser.uid,
            id: userDoc.id,
            name: userProfile.name || 'No Name',
            role: userProfile.role || 'driver', // Default to driver if role not set
            ownerId: userProfile.ownerId,
            subscriptionExpiresAt: expiresAt instanceof Timestamp ? expiresAt.toDate().toISOString() : expiresAt,
          };
          setUser(appUser);
        } else {
          // This case happens if a user exists in Auth but not in Firestore.
          console.error("User profile not found in Firestore. Logging out.");
          await signOut(auth);
          setUser(null);
        }
      } else {
        // User is signed out.
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  const login = useCallback(async (phone: string, passwordOrCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!auth || !firestore) {
      return { success: false, error: 'Auth service not available.' };
    }

    try {
      // Use phone number to construct a unique email for Firebase email/password auth
      const email = `${phone}@${DUMMY_EMAIL_DOMAIN}`;
      const userCredential = await signInWithEmailAndPassword(auth, email, passwordOrCode);

      // After successful auth, immediately verify Firestore profile exists
      const userDocRef = doc(firestore, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
          await signOut(auth);
          return { success: false, error: 'Login successful, but no user profile found in the database. Please contact an admin.' };
      }
      
      return { success: true };
    } catch (error: any) {
      console.error("Firebase login error:", error.code);
      let errorMessage = 'An error occurred during login.';
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Invalid phone number or password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The phone number format is invalid.';
          break;
        default:
          errorMessage = 'Could not sign in. Please try again.';
      }
      return { success: false, error: errorMessage };
    }
  }, [auth, firestore]);

  const registerOwner = useCallback(async ({ name, phone, password }: RegisterOwnerParams): Promise<{ success: boolean; error?: string }> => {
    if (!auth || !firestore) {
      return { success: false, error: 'Services not available.' };
    }

    try {
      const email = `${phone}@${DUMMY_EMAIL_DOMAIN}`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      const userDocRef = doc(firestore, 'users', newUser.uid);
      await setDoc(userDocRef, {
        name,
        phone,
        role: 'owner',
        isActive: true,
      });
      
      return { success: true };
    } catch (error: any) {
        console.error("Registration error: ", error);
        if (error.code === 'auth/email-already-in-use') {
            return { success: false, error: 'An account with this phone number already exists.' };
        }
        return { success: false, error: 'Could not create account. Please try again.' };
    }
  }, [auth, firestore]);

  const registerDriver = useCallback(async ({ name, phone, password }: RegisterDriverParams): Promise<{ success: boolean; error?: string; driverId?: string }> => {
    if (!auth || !firestore || !user || user.role !== 'owner') {
        return { success: false, error: 'Only owners can register drivers.' };
    }

    // Create a temporary, secondary Firebase App instance. This allows us to create
    // a new user without logging out the currently signed-in owner.
    const tempAppName = `driver-registration-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
        const email = `${phone}@${DUMMY_EMAIL_DOMAIN}`;
        
        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
        const newDriverUser = userCredential.user;

        const randomAvatar = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];
        
        const driverData = {
            name,
            phone,
            role: 'driver' as const,
            ownerId: user.uid,
            is_active: true,
            avatar: randomAvatar,
        };

        const docRef = doc(firestore, 'users', newDriverUser.uid);
        await setDoc(docRef, driverData);
        
        return { success: true, driverId: docRef.id };
    } catch (error: any) {
        console.error("Driver registration error: ", error);
        if (error.code === 'auth/email-already-in-use') {
            return { success: false, error: 'A user with this phone number already exists.' };
        }
        return { success: false, error: 'Could not create driver account.' };
    } finally {
        // Always clean up the temporary app instance.
        await deleteApp(tempApp);
    }
  }, [auth, firestore, user]);
  
  const renewSubscription = useCallback(async (key: string): Promise<{ success: boolean; error?: string }> => {
    if (!firestore || !user) {
        return { success: false, error: 'User not logged in or services unavailable.' };
    }

    try {
        const keyRef = doc(firestore, 'subscriptionKeys', key);
        const keyDoc = await getDoc(keyRef);

        if (!keyDoc.exists()) {
            return { success: false, error: 'Invalid subscription key.' };
        }
        const keyData = keyDoc.data();
        if (keyData.isUsed) {
            return { success: false, error: 'This subscription key has already been used.' };
        }

        const userDocRef = doc(firestore, 'users', user.uid);
        const newExpiryDate = keyData.expiresAt;

        await updateDoc(userDocRef, {
            subscriptionKey: key,
            subscriptionExpiresAt: newExpiryDate
        });
        
        await updateDoc(keyRef, {
            isUsed: true,
            usedBy: user.uid,
        });

        setUser(prevUser => prevUser ? { ...prevUser, subscriptionExpiresAt: newExpiryDate.toDate().toISOString() } : null);
        
        return { success: true };

    } catch (error: any) {
        console.error('Subscription renewal error:', error);
        return { success: false, error: 'Failed to renew subscription.' };
    }
  }, [firestore, user]);

  const logout = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null);
    router.push('/login');
  }, [auth, router]);

  const value = useMemo(() => ({
      user,
      login,
      registerOwner,
      registerDriver,
      renewSubscription,
      logout,
      loading,
  }), [user, loading, login, logout, registerOwner, renewSubscription, registerDriver]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
