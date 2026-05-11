import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AuthUser } from '../types/resume';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  login: (user: AuthUser, accessToken?: string | null) => void;
  setSession: (accessToken: string, user?: AuthUser | null) => void;
  setAccessToken: (accessToken: string) => void;
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
      accessToken: null,
      isAuthenticated: false,

      login: (user, accessToken = null) =>
        set({ user, accessToken, isAuthenticated: true }),
      setSession: (accessToken, user = null) =>
        set((state) => ({
          accessToken,
          user: user ?? state.user,
          isAuthenticated: true,
        })),
      setAccessToken: (accessToken) =>
        set({ accessToken, isAuthenticated: true }),
      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'gitresume-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
