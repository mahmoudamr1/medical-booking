'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);



export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // تحميل حالة المصادقة من localStorage عند بدء التطبيق
  useEffect(() => {
    const initAuth = () => {
      try {
        if (typeof window !== 'undefined') {
          const savedUser = localStorage.getItem('auth_user');
          const savedToken = localStorage.getItem('auth_token');
          
          if (savedUser && savedToken) {
            const userData = JSON.parse(savedUser);
            setUser(userData);
          }
        }
      } catch (error) {
        // إزالة البيانات التالفة
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth_token');
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // استدعاء API تسجيل الدخول الحقيقي
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success && result.data.user) {
        const userData: User = {
          id: result.data.user.id,
          name: result.data.user.name,
          email: result.data.user.email,
          role: result.data.user.role,
          is_active: result.data.user.is_active
        };

        setUser(userData);
        
        // حفظ بيانات المصادقة في localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_user', JSON.stringify(userData));
          localStorage.setItem('auth_token', result.data.token);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    
    // إزالة بيانات المصادقة من localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
    }
  };

  const checkAuth = () => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('auth_user');
      const savedToken = localStorage.getItem('auth_token');
      
      if (savedUser && savedToken) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        } catch (error) {
          logout();
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
