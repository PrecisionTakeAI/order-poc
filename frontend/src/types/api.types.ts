export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}
