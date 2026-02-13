'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Hardcoded users for demonstration.
const MOCK_USERS: Record<string, { id: string; name: string; role: 'owner' | 'driver'; password?: string; ownerId?: string, is_active: boolean }> = {
  '9999999999': { id: 'owner-1', name: 'Rohan (Owner)', role: 'owner', password: 'password', is_active: true },
  '7777777777': { id: 'd1', name: 'Rohan', role: 'driver', password: 'password', ownerId: 'owner-1', is_active: true },
  '7777777778': { id: 'd2', name: 'Sameer', role: 'driver', password: 'password', ownerId: 'owner-1', is_active: true },
  '7777777779': { id: 'd3', name: 'Vijay', role: 'driver', password: 'password', ownerId: 'owner-1', is_active: true },
  '7777777780': { id: 'd4', name: 'Anil', role: 'driver', password: 'password', ownerId: 'owner-1', is_active: false },
  '7777777781': { id: 'd5', name: 'Sunil', role: 'driver', password: 'password', ownerId: 'owner-1', is_active: true },
};

type User = {
  id: string;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('tanker-user');
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        if (pathname === '/login') {
           if (parsedUser.role === 'owner') {
             router.replace('/dashboard');
           } else if (parsedUser.role === 'driver') {
             router.replace(`/drivers/${parsedUser.id}`);
           }
        }
      }
    } catch (e) {
      console.error("Could not parse user from localStorage", e);
      localStorage.removeItem('tanker-user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (phone: string, passwordOrCode: string): Promise<{ success: boolean; error?: string }> => {
    const mockUser = MOCK_USERS[phone];
    if (mockUser && mockUser.password === passwordOrCode) {
      if (!mockUser.is_active) {
        return { success: false, error: 'Your account has been disabled. Please contact the owner.' };
      }
      const userToStore: User = { id: mockUser.id, name: mockUser.name, role: mockUser.role };
      setUser(userToStore);
      localStorage.setItem('tanker-user', JSON.stringify(userToStore));
      return { success: true };
    }
    return { success: false, error: 'Invalid phone number or password.' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('tanker-user');
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
