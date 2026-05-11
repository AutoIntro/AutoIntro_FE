import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import { GITHUB_OAUTH_URL, MOCK_MODE, ROUTES } from '../constants/constants';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../api/client';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuthStore();

  const handleGithubLogin = () => {
    if (MOCK_MODE) {
      apiClient.getMe().then(({ data: user }) => {
        login(user, 'mock-access-token');
        navigate(ROUTES.REPOSITORIES);
      });
      return;
    }

    window.location.href = GITHUB_OAUTH_URL;
  };

  return (
    <section className={styles.hero}>
      <div className={`${styles.badge} animate-fade-up`}>
        <SparkleIcon />
        AI 기반 자동 생성
      </div>

      <h1 className={`${styles.title} animate-fade-up animate-fade-up-1`}>
        GitHub로 만드는
        <span>나만의 자기소개서</span>
      </h1>

      <p className={`${styles.description} animate-fade-up animate-fade-up-2`}>
        GitHub 활동과 채용공고 이미지를 함께 분석해 지원 직무와 <br />
        보유 기술스택에 맞춘 자기소개서 초안을 생성합니다.
      </p>

      <div className={`${styles.actions} animate-fade-up animate-fade-up-3`}>
        {isAuthenticated ? (
          <Button size="lg" onClick={() => navigate(ROUTES.REPOSITORIES)}>
            레포지토리 선택하기
            <ArrowRightIcon />
          </Button>
        ) : (
          <Button size="lg" onClick={handleGithubLogin}>
            <GitHubIcon />
            GitHub로 시작하기
          </Button>
        )}
      </div>

      <div className={`${styles.featureGrid} animate-fade-up animate-fade-up-4`}>
        {FEATURES.map((feature) => (
          <article key={feature.title} className={styles.featureCard}>
            <div className={styles.featureIcon}>{feature.icon}</div>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  {
    title: 'GitHub 분석',
    description: '레포지토리, 커밋, README를 분석해 실제 기여 경험을 파악합니다.',
    icon: <GitHubIcon />,
  },
  {
    title: '공고 이미지 분석',
    description: '채용공고 이미지에서 직무, 인재상, 필요역량을 추출하도록 연동합니다.',
    icon: <ImageIcon />,
  },
  {
    title: '맞춤형 결과',
    description: '지원 직군과 기술스택에 맞춰 바로 수정 가능한 초안을 제공합니다.',
    icon: <DocumentIcon />,
  },
];

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1L6.5 8.5l4.1-1.4L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 14l.8 2.2L9 17l-2.2.8L6 20l-.8-2.2L3 17l2.2-.8L6 14Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 13l.9 2.6 2.6.9-2.6.9L18 21l-.9-2.6-2.6-.9 2.6-.9L18 13Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h16v14H4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m4 16 4-4 3.5 3.5 2-2L20 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 9.5h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 3v5h4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9.5 13h5M9.5 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
