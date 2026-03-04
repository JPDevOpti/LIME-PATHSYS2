'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  clearAuthStorage,
  getAuthToken,
  getStoredUser,
  setAuthStorage,
} from '@/shared/api/client';
import { authService, normalizeRole } from '../services/auth.service';
import type { LoginRequest, User } from '../types/auth.types';

type AuthContextValue = {
  isLoggedIn: boolean;
  user: User | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function parseStoredUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!o.id || !o.email || !o.role) return null;
  return {
    id: String(o.id),
    email: String(o.email),
    name: o.name as string | undefined,
    role: normalizeRole(o.role),
    is_active: Boolean(o.is_active ?? true),
    administrator_code: o.administrator_code as string | undefined,
    pathologist_code: o.pathologist_code as string | undefined,
    resident_code: o.resident_code as string | undefined,
    associated_entities: o.associated_entities as User['associated_entities'],
    medical_license: o.medical_license as string | undefined,
    initials: o.initials as string | undefined,
    signature: o.signature as string | undefined,
    observations: o.observations as string | undefined,
    patient_id: o.patient_id as string | undefined,
    document: o.document as string | undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!user;

  const initializeAuth = useCallback(async () => {
    const token = getAuthToken();
    const stored = getStoredUser();
    const parsed = parseStoredUser(stored);
    if (token && parsed) {
      setUser(parsed);
      try {
        const fresh = await authService.getCurrentUser(token);
        setUser(fresh);
        const rem = typeof window !== 'undefined' && !!localStorage.getItem('pathsys_auth_token');
        setAuthStorage(token, fresh, rem);
      } catch {
        setUser(parsed);
      }
    } else if (token && !parsed) {
      try {
        const fresh = await authService.getCurrentUser(token);
        setUser(fresh);
        const rem = typeof window !== 'undefined' && !!localStorage.getItem('pathsys_auth_token');
        setAuthStorage(token, fresh, rem);
      } catch {
        clearAuthStorage();
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      setError(null);
      try {
        const res = await authService.login(credentials);
        setAuthStorage(res.access_token, res.user, credentials.remember_me ?? false);
        setUser(res.user);
        const restrictedRoles = ['paciente', 'visitante'];
        router.push(restrictedRoles.includes(res.user.role) ? '/cases' : '/dashboard');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Credenciales inválidas');
        throw err;
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setError(null);
    router.push('/');
  }, [router]);

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      const token = getAuthToken();
      if (token) {
        const rem = typeof window !== 'undefined' && !!localStorage.getItem('pathsys_auth_token');
        setAuthStorage(token, updated, rem);
      }
      return updated;
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        login,
        logout,
        updateUser,
        isLoading,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
