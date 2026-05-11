import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { MOCK_MODE, ROUTES } from '../constants/constants';

/**
 * 앱 최초 마운트 시 세션 복원 훅
 * - MOCK_MODE: 랜딩에서 버튼 클릭 시 로그인 처리
 * - 실서비스: refresh token cookie로 access token 재발급
 */
export function useAuthInit() {
  const [initializing, setInitializing] = useState(true);
  const setSession = useAuthStore((s) => s.setSession);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (MOCK_MODE) {
      setInitializing(false);
      return;
    }

    if (window.location.pathname === ROUTES.OAUTH_CALLBACK) {
      setInitializing(false);
      return;
    }

    apiClient
      .reissueToken()
      .then(({ data: accessToken }) => setSession(accessToken))
      .catch(() => {
        logout();
      })
      .finally(() => setInitializing(false));
  }, [logout, setSession]);

  return { initializing };
}
