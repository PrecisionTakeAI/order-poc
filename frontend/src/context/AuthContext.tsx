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

const DEFAULT_EXPIRES_IN = 3600;
const REFRESH_BUFFER_SECONDS = 300;

function sanitizeExpiresIn(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return DEFAULT_EXPIRES_IN;
  }
  return num;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<number | null>(null);
  const refreshAccessTokenRef = useRef<() => Promise<void>>(undefined);

  const clearRefreshTimer = useCallback((): void => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback((expiresIn: number): void => {
    clearRefreshTimer();
    const safeExpiresIn = sanitizeExpiresIn(expiresIn);
    const delay = (safeExpiresIn - REFRESH_BUFFER_SECONDS) * 1000;

    refreshTimerRef.current = window.setTimeout(() => {
      refreshAccessTokenRef.current?.();
    }, Math.max(delay, 0));
  }, [clearRefreshTimer]);

  const logout = useCallback(async (): Promise<void> => {
    clearRefreshTimer();
    await authService.logout();
    setUser(null);
  }, [clearRefreshTimer]);

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

      const safeExpiresIn = sanitizeExpiresIn(response.expiresIn);
      const expiryTimestamp = Date.now() + safeExpiresIn * 1000;
      storage.setTokenExpiry(expiryTimestamp);
      scheduleTokenRefresh(safeExpiresIn);
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
  }, [scheduleTokenRefresh, logout]);

  // Keep ref in sync so scheduleTokenRefresh can call it without circular dependency
  useEffect(() => {
    refreshAccessTokenRef.current = refreshAccessToken;
  }, [refreshAccessToken]);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = storage.getUser<User>();
      const accessToken = storage.getAccessToken();
      const refreshToken = storage.getRefreshToken();

      if (storedUser && accessToken) {
        if (storage.isTokenExpired() && refreshToken) {
          try {
            await refreshAccessTokenRef.current?.();
          } finally {
            setLoading(false);
          }
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
      clearRefreshTimer();
    };
  }, [scheduleTokenRefresh, clearRefreshTimer]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const response = await authService.login({ email, password });

    const safeExpiresIn = sanitizeExpiresIn(response.expiresIn);
    const expiryTimestamp = Date.now() + safeExpiresIn * 1000;
    storage.setTokenExpiry(expiryTimestamp);

    const groups = getUserGroups(response.accessToken);
    const userWithGroups = { ...response.user, groups };

    setUser(userWithGroups);
    storage.setUser(userWithGroups);

    scheduleTokenRefresh(safeExpiresIn);
  }, [scheduleTokenRefresh]);

  const isAdmin = useCallback((): boolean => {
    return user?.groups?.includes('admin') || false;
  }, [user]);

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
