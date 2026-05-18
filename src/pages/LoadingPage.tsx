import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import Button from '../components/common/Button';
import { ROUTES } from '../constants/constants';
import { useResumeStore } from '../stores/resumeStore';
import styles from './LoadingPage.module.css';

type Stage = 'generating' | 'error';

const PROGRESS_STEPS = [
  'GitHub 프로젝트 경험 분석 중',
  '공고와 프로젝트 경험 연결 중',
  '자기소개서 초안 생성 중',
];

export default function LoadingPage() {
  const navigate = useNavigate();
  const {
    selectedRepositories,
    repositoryMatches,
    jobInput,
    setRepositoryMatches,
    setResult,
  } = useResumeStore();

  const [stage, setStage] = useState<Stage>('generating');
  const [errorMessage, setErrorMessage] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const requestedRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStepIndex((index) => Math.min(index + 1, PROGRESS_STEPS.length - 1));
    }, 650);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (selectedRepositories.length === 0 || !jobInput) {
      navigate(ROUTES.REPOSITORIES, { replace: true });
      return;
    }

    if (requestedRef.current) return;
    requestedRef.current = true;

    async function generate() {
      try {
        const savedProjectIds: number[] = [];

        for (const repository of selectedRepositories) {
          const { data } = await apiClient.saveProject(repository);
          savedProjectIds.push(...data);
        }

        const {
          data: { jobId, result: generatedResult, repositoryMatches: generatedMatches },
        } = await apiClient.generateResume({
          repositoryIds: [...new Set(savedProjectIds)].map(String),
          jobInput: jobInput!,
          repositoryMatches,
        });

        if (generatedMatches) {
          setRepositoryMatches(generatedMatches);
        }

        const { data: result } = await apiClient.getResumeResult(
          jobId,
          jobInput!,
          generatedMatches ?? repositoryMatches,
          generatedResult,
        );
        setResult(result);
        navigate(ROUTES.RESULT, { replace: true });
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        setErrorMessage(message);
        setStage('error');
      }
    }

    generate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (stage === 'error') {
    return (
      <div className={styles.center}>
        <div className={styles.errorIcon}>
          <XIcon />
        </div>
        <h2 className={styles.errorTitle}>자기소개서 생성에 실패했습니다.</h2>
        <p className={styles.errorMsg}>{errorMessage}</p>
        <div className={styles.errorActions}>
          <Button variant="secondary" onClick={() => navigate(ROUTES.JOB_INPUT)}>
            설정으로 돌아가기
          </Button>
          <Button onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.center}>
      <div className={styles.loadingCard}>
        <div className={styles.logoMark}>
          <GitHubIcon />
          <span className={styles.sparkle}>
            <SparkleIcon />
          </span>
        </div>

        <h1 className={styles.title}>자기소개서를 생성 중입니다</h1>
        <p className={styles.subtitle}>잠시만 기다려 주세요...</p>

        <ol className={styles.stepList}>
          {PROGRESS_STEPS.slice(0, 3).map((step, index) => {
            const done = stepIndex > index;
            const active = stepIndex === index;

            return (
              <li key={step} className={styles.stepItem}>
                <span className={[styles.stepBadge, done ? styles.done : active ? styles.active : ''].join(' ')}>
                  {done ? <CheckIcon /> : index + 1}
                </span>
                <span>{step}</span>
              </li>
            );
          })}
        </ol>

        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${((stepIndex + 1) / PROGRESS_STEPS.length) * 100}%` }}
          />
        </div>

        <div className={styles.dots} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      <p className={styles.note}>
        AI가 GitHub 활동과 채용공고 이미지 분석 결과를 바탕으로 자기소개서를 작성하고 있습니다.
      </p>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1L6.5 8.5l4.1-1.4L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 13l.9 2.6 2.6.9-2.6.9L18 21l-.9-2.6-2.6-.9 2.6-.9L18 13Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
