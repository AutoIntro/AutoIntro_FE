import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types/resume';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;

  login: (user: AuthUser) => void;
  logout: () => void;
}

/**
 * 인증 전역 상태
 * - persist: 새로고침해도 로그인 유지 (sessionStorage 사용)
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'gitresume-auth',
      storage: {
        getItem: (key) => {
          const val = sessionStorage.getItem(key);
          return val ? JSON.parse(val) : null;
        },
        setItem: (key, val) => sessionStorage.setItem(key, JSON.stringify(val)),
        removeItem: (key) => sessionStorage.removeItem(key),
      },
    },
  ),
);
