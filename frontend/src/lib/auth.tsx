import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getApiError } from './api';
import type { AuthContextValue, AuthUser, LoginPayload } from '@/types';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data } = await api.get<AuthUser>('/auth/me');
        setUser(data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      async login(payload: LoginPayload) {
        const { data } = await api.post<AuthUser>('/auth/login', payload);
        setUser(data);
        return data;
      },
      async register(payload: LoginPayload) {
        const { data } = await api.post<AuthUser>('/auth/register', payload);
        setUser(data);
        return data;
      },
      async logout() {
        await api.post('/auth/logout');
        setUser(null);
      },
      async refreshUser() {
        try {
          const { data } = await api.get<AuthUser>('/auth/me');
          setUser(data);
          return data;
        } catch (error) {
          setUser(null);
          throw new Error(getApiError(error));
        }
      },
      setUser,
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
