'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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

// بيانات المستخدمين التجريبية
const testUsers: User[] = [
  // أطباء تجريبيون
  { id: '1', name: 'د. أحمد محمد', email: 'doctor1@clinic.com', role: 'doctor', is_active: true },
  { id: '2', name: 'د. فاطمة علي', email: 'doctor2@clinic.com', role: 'doctor', is_active: true },
  { id: '3', name: 'د. محمد السيد', email: 'doctor3@clinic.com', role: 'doctor', is_active: true },
  { id: '4', name: 'د. سارة أحمد', email: 'doctor4@clinic.com', role: 'doctor', is_active: true },
  { id: '5', name: 'د. عبدالله محمد', email: 'doctor5@clinic.com', role: 'doctor', is_active: true },
  
  // مرضى تجريبيون
  { id: '6', name: 'أحمد علي', email: 'patient1@example.com', role: 'patient', is_active: true },
  { id: '7', name: 'فاطمة محمد', email: 'patient2@example.com', role: 'patient', is_active: true },
  { id: '8', name: 'محمد أحمد', email: 'patient3@example.com', role: 'patient', is_active: true },
  
  // مدير النظام
  { id: '9', name: 'مدير النظام', email: 'mahmoudamr700@gmail.com', role: 'admin', is_active: true }
];

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
            // التحقق من صحة البيانات المحفوظة
            const validUser = testUsers.find(u => u.id === userData.id && u.email === userData.email);
            if (validUser) {
              setUser(validUser);
            } else {
              // إزالة البيانات غير الصحيحة
              localStorage.removeItem('auth_user');
              localStorage.removeItem('auth_token');
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
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
      
      // محاكاة تأخير الشبكة
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // التحقق من بيانات الدخول
      let validUser: User | null = null;
      
      // التحقق من الأطباء (كلمة المرور: 12345678)
      if (password === '12345678') {
        validUser = testUsers.find(u => u.email === email && u.role === 'doctor') || null;
      }
      
      // التحقق من المرضى (كلمة المرور: password123)
      if (!validUser && password === 'password123') {
        validUser = testUsers.find(u => u.email === email && u.role === 'patient') || null;
      }
      
      // التحقق من المدير (كلمة المرور: 0123456789)
      if (!validUser && email === 'mahmoudamr700@gmail.com' && password === '0123456789') {
        validUser = testUsers.find(u => u.email === email && u.role === 'admin') || null;
      }
      
      if (validUser && validUser.is_active) {
        setUser(validUser);
        
        // حفظ بيانات المصادقة في localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_user', JSON.stringify(validUser));
          localStorage.setItem('auth_token', `token_${validUser.id}_${Date.now()}`);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
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
          const validUser = testUsers.find(u => u.id === userData.id && u.email === userData.email);
          if (validUser) {
            setUser(validUser);
          } else {
            logout();
          }
        } catch (error) {
          console.error('Check auth error:', error);
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
