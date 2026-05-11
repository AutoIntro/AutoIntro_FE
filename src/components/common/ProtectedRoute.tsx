import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ROUTES } from '../../constants/constants';

/**
 * 로그인하지 않은 사용자를 랜딩 페이지로 리다이렉트하는 가드
 * App.tsx에서 보호할 라우트를 감싸서 사용
 */
export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <Outlet />;
}
