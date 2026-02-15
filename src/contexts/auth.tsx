'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebaseAuth, useFirestore } from '@/firebase';

// The user object we'll use in our app, combining Firebase Auth and Firestore data.
export type User = {
  uid: string;
  id: string; // Legacy ID for routing (e.g., 'd1', 'owner-1')
  name: string;
  role: 'owner' | 'driver';
};

interface AuthContextType {
  user: User | null;
  login: (phone: string, passwordOrCode: string) => Promise<{ success: boolean; error?: string }>;
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
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in, now get their profile from Firestore.
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userProfile = userDoc.data();
          // Construct the rich user object for our app
          const appUser: User = {
            uid: firebaseUser.uid,
            id: userProfile.id, // This ID is used for routing (e.g., /drivers/d1)
            name: userProfile.name || 'No Name',
            role: userProfile.role || 'driver', // Default to driver if role not set
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
  }, [auth, firestore, router]);

  const login = async (phone: string, passwordOrCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!auth) {
        return { success: false, error: 'Auth service not available.' };
    }
    
    try {
      // Use phone number to construct a unique email for Firebase email/password auth
      const email = `${phone}@${DUMMY_EMAIL_DOMAIN}`;
      await signInWithEmailAndPassword(auth, email, passwordOrCode);
      // The onAuthStateChanged listener will handle setting the user state and redirection.
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
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null); // Clear user state immediately
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
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
