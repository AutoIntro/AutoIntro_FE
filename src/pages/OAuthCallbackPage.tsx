import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ROUTES } from '../constants/constants';
import { useAuthStore } from '../stores/authStore';

type CallbackState = 'loading' | 'error';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const logout = useAuthStore((s) => s.logout);
  const requestedRef = useRef(false);
  const [state, setState] = useState<CallbackState>('loading');
  const [message, setMessage] = useState('GitHub 로그인 정보를 확인하는 중입니다...');

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;

    apiClient
      .reissueToken()
      .then(({ data: accessToken }) => {
        setSession(accessToken);
        navigate(ROUTES.REPOSITORIES, { replace: true });
      })
      .catch((error) => {
        console.error(error);
        logout();
        setMessage('로그인 처리에 실패했습니다. 다시 시도해 주세요.');
        setState('error');
      });
  }, [logout, navigate, setSession]);

  if (state === 'error') {
    return (
      <div
        style={{
          minHeight: 360,
          display: 'grid',
          placeItems: 'center',
          gap: 16,
          textAlign: 'center',
        }}
      >
        <p>{message}</p>
        <Button onClick={() => navigate(ROUTES.HOME, { replace: true })}>
          홈으로 이동
        </Button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: 360,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <LoadingSpinner message={message} size="lg" />
    </div>
  );
}
