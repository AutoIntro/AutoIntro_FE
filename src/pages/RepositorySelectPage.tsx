import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ROUTES } from '../constants/constants';
import { useAuthStore } from '../stores/authStore';
import { useResumeStore } from '../stores/resumeStore';
import type { ApiStatus } from '../types/common';
import type { Repository } from '../types/resume';
import styles from './RepositorySelectPage.module.css';

const MAX_REPOSITORIES = 3;

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#2f80ed',
  JavaScript: '#f2c94c',
  Java: '#b07219',
  Python: '#22a06b',
  Go: '#00add8',
  Rust: '#dea584',
  default: '#94a3b8',
};

export default function RepositorySelectPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setSelectedRepositories = useResumeStore((s) => s.setSelectedRepositories);

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<ApiStatus>('idle');

  useEffect(() => {
    let cancelled = false;

    async function fetchRepositories() {
      setStatus('loading');
      try {
        const { data } = await apiClient.getRepositories();
        if (!cancelled) {
          setRepositories(data);
          setStatus('success');
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setStatus('error');
      }
    }

    fetchRepositories();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleRepository = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
        return next;
      }

      if (next.size >= MAX_REPOSITORIES) {
        return prev;
      }

      next.add(id);
      return next;
    });
  };

  const handleNext = () => {
    const selected = repositories.filter((repo) => selectedIds.has(repo.id));
    setSelectedRepositories(selected);
    navigate(ROUTES.JOB_INPUT);
  };

  if (status === 'loading') {
    return (
      <div className={styles.center}>
        <LoadingSpinner message="GitHub 레포지토리를 불러오는 중입니다..." size="lg" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.center}>
        <p className={styles.errorTitle}>레포지토리를 불러오지 못했습니다.</p>
        <p className={styles.errorSub}>백엔드 서버 상태를 확인하거나 잠시 후 다시 시도하세요.</p>
        <Button onClick={() => window.location.reload()}>다시 시도</Button>
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <StepHeader current={1} />

      <Card className={styles.profileCard}>
        <div className={styles.profileMark}>
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" />
          ) : (
            <GitHubIcon />
          )}
        </div>
        <div>
          <p className={styles.profileName}>{user?.name || user?.login || 'username'}</p>
          <p className={styles.profileUrl}>github.com/{user?.login || 'username'}</p>
        </div>
      </Card>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>레포지토리 선택</h1>
        <p className={styles.pageDesc}>
          자기소개서에 포함할 레포지토리를 선택해주세요. 최대 {MAX_REPOSITORIES}개까지 선택할 수 있습니다.
        </p>
      </div>

      <div className={styles.repoList}>
        {repositories.map((repo) => {
          const selected = selectedIds.has(repo.id);
          const disabled = !selected && selectedIds.size >= MAX_REPOSITORIES;
          const langColor = LANG_COLORS[repo.language] ?? LANG_COLORS.default;

          return (
            <Card
              key={repo.id}
              hoverable={!disabled}
              selected={selected}
              role="button"
              aria-pressed={selected}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              onClick={() => {
                if (!disabled) toggleRepository(repo.id);
              }}
              onKeyDown={(event) => {
                if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  toggleRepository(repo.id);
                }
              }}
              className={[styles.repoCard, disabled ? styles.disabled : ''].join(' ')}
            >
              <div className={styles.repoTop}>
                <div className={styles.repoNameRow}>
                  <RepoIcon />
                  <span className={styles.repoName}>{repo.name}</span>
                </div>
                <p className={styles.repoDesc}>{repo.description}</p>
              </div>

              <div className={styles.repoFooter}>
                <div className={styles.repoMeta}>
                  <span className={styles.lang}>
                    <span className={styles.langDot} style={{ background: langColor }} />
                    {repo.language}
                  </span>
                  <span className={styles.metaItem}>
                    <StarIcon />
                    {repo.stars}
                  </span>
                  <span className={styles.metaItem}>
                    <ForkIcon />
                    {repo.updatedAt}
                  </span>
                </div>
                <span className={[styles.selectCircle, selected ? styles.checked : ''].join(' ')}>
                  {selected && <CheckIcon />}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.bottomInner}>
          <p className={styles.selectedCount}>
            <strong>{selectedIds.size}개</strong> 선택됨
          </p>
          <Button disabled={selectedIds.size === 0} onClick={handleNext}>
            계속하기
            <ArrowRightIcon />
          </Button>
        </div>
      </div>
    </section>
  );
}

function StepHeader({ current }: { current: 1 | 2 }) {
  return (
    <div className={styles.steps} aria-label="자기소개서 생성 단계">
      <div className={styles.step}>
        <span className={current > 1 ? styles.stepDone : styles.stepActive}>
          {current > 1 ? <CheckIcon /> : '1'}
        </span>
        <span>레포지토리 선택</span>
      </div>
      <span className={styles.stepLine} />
      <div className={styles.step}>
        <span className={current === 2 ? styles.stepActive : styles.stepIdle}>2</span>
        <span className={current === 2 ? '' : styles.stepIdleText}>설정</span>
      </div>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function RepoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5V2.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8V1.5Z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 5v6a4 4 0 0 0 4 4h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 9v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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
