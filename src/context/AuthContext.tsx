import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (registerData: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<any>;
  demoLogin: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('tribal_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Authenticated fetch helper
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data.message || data.error || `Request failed with status ${res.status}`;
      const error: any = new Error(errorMsg);
      error.status = res.status;
      error.data = data;
      throw error;
    }
    return data;
  };

  // Initial user check
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    apiFetch('/api/auth/me')
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        // Token invalid or expired
        localStorage.removeItem('tribal_token');
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      localStorage.setItem('tribal_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const register = async (registerData: any) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      localStorage.setItem('tribal_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem('tribal_token');
    setToken(null);
    setUser(null);
  };

  const demoLogin = async (email: string) => {
    const passwordMap: Record<string, string> = {
      'student@example.com': 'Student@123',
      'deficiency.student@example.com': 'Student@123',
      'fresh.student@example.com': 'Student@123',
      'officer@example.com': 'Officer@123',
      'admin@example.com': 'Admin@123'
    };
    const password = passwordMap[email] || 'Student@123';
    const result = await login(email, password);
    return result.success;
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, apiFetch, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
