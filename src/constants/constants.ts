export const APP_NAME = 'ResumeGen';

export const ROUTES = {
  HOME: '/',
  REPOSITORIES: '/repositories',
  JOB_INPUT: '/job-input',
  LOADING: '/loading',
  RESULT: '/result',
} as const;

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export const GITHUB_OAUTH_URL = `${API_BASE_URL}/auth/github/login`;

/** 백엔드 연동 전: true / 연동 후: false */
export const MOCK_MODE = true;
