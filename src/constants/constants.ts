export const APP_NAME = 'ResumeGen';

export const ROUTES = {
  HOME: '/',
  OAUTH_CALLBACK: '/oauth2/callback',
  REPOSITORIES: '/repositories',
  JOB_INPUT: '/job-input',
  LOADING: '/loading',
  RESULT: '/result',
} as const;

export const BACKEND_ORIGIN =
  import.meta.env.VITE_BACKEND_ORIGIN ?? 'http://localhost:8080';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? '/api';

export const GITHUB_OAUTH_URL = `${BACKEND_ORIGIN}/oauth2/authorization/github`;

/** 백엔드 없이 프론트 흐름만 볼 때 true */
export const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';
