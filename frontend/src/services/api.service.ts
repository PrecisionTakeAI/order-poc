import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import { storage } from '../utils/storage';
import type { ApiError } from '../types/api.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

let refreshPromise: Promise<string> | null = null;

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    this.setupRetry();
    this.setupInterceptors();
  }

  private setupRetry(): void {
    axiosRetry(this.api, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry on network errors
        if (axiosRetry.isNetworkError(error)) {
          return true;
        }

        // Retry on 5xx server errors, but only for idempotent requests (GET)
        if (error.response?.status && error.response.status >= 500) {
          const method = error.config?.method?.toUpperCase();
          return method === 'GET';
        }

        return false;
      },
    });
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = storage.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Dispatch api-error event for 5xx server errors
        if (error.response?.status && error.response.status >= 500) {
          const apiError = error.response.data as ApiError;
          window.dispatchEvent(
            new CustomEvent('api-error', {
              detail: {
                message: apiError?.message || 'Server error occurred. Please try again.',
                statusCode: error.response.status,
              },
            })
          );
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            if (!refreshPromise) {
              refreshPromise = this.refreshAccessToken();
            }

            const newAccessToken = await refreshPromise;
            refreshPromise = null;

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }

            return this.api(originalRequest);
          } catch (refreshError) {
            refreshPromise = null;
            storage.clear();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = storage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh-token`,
      { refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const { accessToken, expiresIn } = response.data.data;
    storage.setAccessToken(accessToken);
    const safeExpiresIn = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600;
    storage.setTokenExpiry(Date.now() + safeExpiresIn * 1000);

    return accessToken;
  }

  public getInstance(): AxiosInstance {
    return this.api;
  }

  public getAxiosInstance(): AxiosInstance {
    return this.api;
  }

  public handleError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as ApiError;
      return apiError?.message || 'An unexpected error occurred';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }
}

export const apiService = new ApiService();
export const api = apiService.getInstance();
