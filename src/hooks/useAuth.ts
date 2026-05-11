import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { MOCK_MODE } from '../constants/constants';

/**
 * 앱 최초 마운트 시 세션 복원 훅
 * - MOCK_MODE: 곧바로 로그인 처리
 * - 실서비스: GET /auth/me 로 세션 쿠키 검증
 */
export function useAuthInit() {
  const [initializing, setInitializing] = useState(true);
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    // 이미 로그인 상태면 재확인 생략
    if (isAuthenticated) {
      setInitializing(false);
      return;
    }

    if (MOCK_MODE) {
      // Mock: 비로그인 상태로 시작 (랜딩에서 버튼 클릭 시 로그인)
      setInitializing(false);
      return;
    }

    // 실서비스: 서버에서 세션 확인
    apiClient
      .getMe()
      .then(({ data: user }) => login(user))
      .catch(() => {
        /* 비로그인 상태 — 정상 케이스 */
      })
      .finally(() => setInitializing(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { initializing };
}
