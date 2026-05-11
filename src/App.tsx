import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import RepositorySelectPage from './pages/RepositorySelectPage';
import JobInputPage from './pages/JobInputPage';
import LoadingPage from './pages/LoadingPage';
import ResultPage from './pages/ResultPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuthInit } from './hooks/useAuth';
import LoadingSpinner from './components/common/LoadingSpinner';

export default function App() {
  const { initializing } = useAuthInit();

  // 앱 초기 세션 복원 중에는 전체 화면 스피너 표시
  if (initializing) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* 비인증 접근 가능 */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/oauth2/callback" element={<OAuthCallbackPage />} />

        {/* 로그인 필요한 라우트 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/repositories" element={<RepositorySelectPage />} />
          <Route path="/job-input" element={<JobInputPage />} />
          <Route path="/loading" element={<LoadingPage />} />
          <Route path="/result" element={<ResultPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
