import { api, apiService } from './api.service';
import { storage } from '../utils/storage';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  LogoutResponse,
  RefreshTokenResponse,
} from '../types/auth.types';
import type { ApiResponse } from '../types/api.types';

class AuthService {
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await api.post<ApiResponse<RegisterResponse>>(
      '/auth/register',
      data
    );
    return response.data.data;
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      data
    );
    const loginData = response.data.data;

    storage.setAccessToken(loginData.accessToken);
    storage.setRefreshToken(loginData.refreshToken);
    storage.setUser(loginData.user);

    return loginData;
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const response = await api.post<ApiResponse<ForgotPasswordResponse>>(
      '/auth/forgot-password',
      data
    );
    return response.data.data;
  }

  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const response = await api.post<ApiResponse<ResetPasswordResponse>>(
      '/auth/reset-password',
      data
    );
    return response.data.data;
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = storage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post<ApiResponse<RefreshTokenResponse>>(
      '/auth/refresh-token',
      { refreshToken }
    );

    const refreshData = response.data.data;
    storage.setAccessToken(refreshData.accessToken);

    return refreshData;
  }

  async logout(): Promise<LogoutResponse> {
    try {
      const response = await api.post<ApiResponse<LogoutResponse>>('/auth/logout');
      return response.data.data;
    } finally {
      storage.clear();
    }
  }

  handleError(error: unknown): string {
    return apiService.handleError(error);
  }
}

export const authService = new AuthService();
