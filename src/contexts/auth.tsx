'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Hardcoded users for demonstration. In a real app, this would come from a database.
const MOCK_USERS: Record<string, { id: string; name: string; role: 'owner' | 'supervisor' | 'driver'; password?: string; code?: string }> = {
  '9999999999': { id: 'owner-1', name: 'Rohan (Owner)', role: 'owner', password: 'password' },
  '8888888888': { id: 'supervisor-1', name: 'Sameer (Supervisor)', role: 'supervisor', password: 'password' },
  '7777777777': { id: 'd1', name: 'Rohan (Driver)', role: 'driver', code: '123456' }, // This uses a code, but login form uses password field for now
};

type User = {
  id: string;
  name: string;
  role: 'owner' | 'supervisor' | 'driver';
};

interface AuthContextType {
  user: User | null;
  login: (phone: string, passwordOrCode: string) => Promise<boolean>;
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
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        if (pathname === '/login') {
          router.replace('/dashboard');
        }
      }
    } catch (e) {
      console.error("Could not parse user from localStorage", e);
      localStorage.removeItem('tanker-user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (phone: string, passwordOrCode: string): Promise<boolean> => {
    const mockUser = MOCK_USERS[phone];
    if (mockUser && (mockUser.password === passwordOrCode || mockUser.code === passwordOrCode)) {
      const userToStore: User = { id: mockUser.id, name: mockUser.name, role: mockUser.role };
      setUser(userToStore);
      localStorage.setItem('tanker-user', JSON.stringify(userToStore));
      return true;
    }
    return false;
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
