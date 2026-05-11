export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

export interface BackendApiResponse<T> {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
}
