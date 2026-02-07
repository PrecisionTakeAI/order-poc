import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthContextType } from '../types/auth.types';
import { storage } from '../utils/storage';
import { authService } from '../services/auth.service';
import { getUserGroups } from '../utils/jwt';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<number | null>(null);

  const scheduleTokenRefresh = useCallback((expiresIn: number): void => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    const delay = (expiresIn - 300) * 1000;

    if (delay <= 0) {
      refreshAccessToken();
      return;
    }

    refreshTimerRef.current = window.setTimeout(() => {
      refreshAccessToken();
    }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<void> => {
    try {
      const response = await authService.refreshToken();
      const accessToken = storage.getAccessToken();

      if (accessToken) {
        const groups = getUserGroups(accessToken);
        setUser((prevUser) =>
          prevUser ? { ...prevUser, groups } : null
        );
      }

      const expiryTimestamp = Date.now() + response.expiresIn * 1000;
      storage.setTokenExpiry(expiryTimestamp);
      scheduleTokenRefresh(response.expiresIn);
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleTokenRefresh]);

  const logout = useCallback(async (): Promise<void> => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }
    await authService.logout();
    setUser(null);
  }, []);

  const isAdmin = useCallback((): boolean => {
    return user?.groups?.includes('admin') || false;
  }, [user]);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = storage.getUser<User>();
      const accessToken = storage.getAccessToken();
      const refreshToken = storage.getRefreshToken();

      if (storedUser && accessToken) {
        if (storage.isTokenExpired() && refreshToken) {
          await refreshAccessToken().finally(() => setLoading(false));
        } else if (!storage.isTokenExpired()) {
          const expiry = storage.getTokenExpiry();
          if (expiry) {
            const remainingSeconds = Math.floor((expiry - Date.now()) / 1000);
            scheduleTokenRefresh(remainingSeconds);
          }
          setUser(storedUser);
          setLoading(false);
        } else {
          storage.clear();
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const response = await authService.login({ email, password });

    const expiryTimestamp = Date.now() + response.expiresIn * 1000;
    storage.setTokenExpiry(expiryTimestamp);

    const groups = getUserGroups(response.accessToken);
    const userWithGroups = { ...response.user, groups };

    setUser(userWithGroups);
    storage.setUser(userWithGroups);

    scheduleTokenRefresh(response.expiresIn);
  }, [scheduleTokenRefresh]);

  const value: AuthContextType = {
    isAuthenticated: !!user,
    user,
    loading,
    login,
    logout,
    setUser,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
