import axios from 'axios';
import type { ApiError } from '../types/api.types';

export type ErrorType = 'network' | 'auth' | 'permission' | 'client' | 'server' | 'unknown';

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  statusCode?: number;
}

export function parseError(error: unknown): ErrorDetails {
  // Network error (no response from server)
  if (axios.isAxiosError(error) && !error.response) {
    return {
      type: 'network',
      message: error.message || 'Network error. Please check your internet connection.',
    };
  }

  // HTTP error with response
  if (axios.isAxiosError(error) && error.response) {
    const statusCode = error.response.status;
    const apiError = error.response.data as ApiError;
    const message = apiError?.message || error.message || 'An error occurred';

    // Authentication error
    if (statusCode === 401) {
      return {
        type: 'auth',
        message: message || 'Authentication required. Please log in.',
        statusCode,
      };
    }

    // Permission/Authorization error
    if (statusCode === 403) {
      return {
        type: 'permission',
        message: message || 'You do not have permission to perform this action.',
        statusCode,
      };
    }

    // Client error (4xx)
    if (statusCode >= 400 && statusCode < 500) {
      return {
        type: 'client',
        message,
        statusCode,
      };
    }

    // Server error (5xx)
    if (statusCode >= 500) {
      return {
        type: 'server',
        message: message || 'Server error. Please try again later.',
        statusCode,
      };
    }
  }

  // Generic JavaScript error
  if (error instanceof Error) {
    return {
      type: 'unknown',
      message: error.message,
    };
  }

  // Unknown error
  return {
    type: 'unknown',
    message: 'An unexpected error occurred',
  };
}

export function shouldRetry(errorDetails: ErrorDetails): boolean {
  // Retry network errors
  if (errorDetails.type === 'network') {
    return true;
  }

  // Retry server errors (5xx)
  if (errorDetails.type === 'server') {
    return true;
  }

  // Don't retry auth, permission, or client errors
  return false;
}
