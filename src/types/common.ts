export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
