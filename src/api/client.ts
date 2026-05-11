import { API_BASE_URL, MOCK_MODE } from '../constants/constants';
import { useAuthStore } from '../stores/authStore';
import type { ApiResponse, BackendApiResponse } from '../types/common';
import type {
  AuthUser,
  JobInput,
  Repository,
  RepositoryMatch,
  ResumeGenerationRequest,
  ResumeResult,
} from '../types/resume';

// Mock data ------------------------------------------------------------------

const MOCK_USER: AuthUser = {
  login: 'jaebeom-dev',
  name: '안재범',
  avatarUrl: 'https://avatars.githubusercontent.com/u/9919',
};

const MOCK_REPOSITORIES: Repository[] = [
  {
    id: 'jaebeom-dev/gitresume-fe',
    name: 'gitresume-fe',
    fullName: 'jaebeom-dev/gitresume-fe',
    url: 'https://github.com/jaebeom-dev/gitresume-fe',
    description: 'GitHub 기반 자기소개서 생성 서비스 프론트엔드 (React + Vite + TypeScript)',
    language: 'TypeScript',
    isPrivate: false,
    stars: 12,
    updatedAt: '2026-04-28',
  },
  {
    id: 'jaebeom-dev/auto-intro-api',
    name: 'auto-intro-api',
    fullName: 'jaebeom-dev/auto-intro-api',
    url: 'https://github.com/jaebeom-dev/auto-intro-api',
    description: 'Spring Boot 기반 GitHub 분석 및 LLM 자기소개서 생성 REST API',
    language: 'Java',
    isPrivate: false,
    stars: 8,
    updatedAt: '2026-04-25',
  },
  {
    id: 'jaebeom-dev/weather-monitoring-system',
    name: 'weather-monitoring-system',
    fullName: 'jaebeom-dev/weather-monitoring-system',
    url: 'https://github.com/jaebeom-dev/weather-monitoring-system',
    description: 'Raspberry Pi, Arduino, InfluxDB 기반 실시간 환경 모니터링 시스템',
    language: 'Python',
    isPrivate: false,
    stars: 18,
    updatedAt: '2026-04-17',
  },
  {
    id: 'jaebeom-dev/ds-algorithm-java',
    name: 'ds-algorithm-java',
    fullName: 'jaebeom-dev/ds-algorithm-java',
    url: 'https://github.com/jaebeom-dev/ds-algorithm-java',
    description: '자료구조 & 알고리즘 Java/Python 구현 모음 (스택, 큐, 트리, 그래프)',
    language: 'Java',
    isPrivate: false,
    stars: 5,
    updatedAt: '2026-03-10',
  },
];

interface BackendGithubRepoInfo {
  fullRepoName: string;
  repoName: string;
  repoUrl: string;
  mainLang: string;
  description: string | null;
  isPrivate: boolean;
}

interface BackendGithubRepoListInfo {
  repos: BackendGithubRepoInfo[];
  totalCount: number;
}

type ApiRequestInit = RequestInit & {
  auth?: boolean;
};

export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

// Utilities ------------------------------------------------------------------

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function createApiResponse<T>(data: T, message?: string, code?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    code,
  };
}

function isBackendApiResponse<T>(value: unknown): value is BackendApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isSuccess' in value &&
    'code' in value &&
    'message' in value
  );
}

function getRequestUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function getAuthHeaders(options?: ApiRequestInit) {
  const headers = new Headers(options?.headers);

  if (options?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options?.auth !== false) {
    const token = useAuthStore.getState().accessToken;

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return headers;
}

/**
 * Common fetch wrapper.
 * - Backend response shape: { isSuccess, code, message, result }
 * - Frontend response shape: { success, data, message, code }
 * - Refresh token is sent through an HttpOnly cookie, access token through Bearer header.
 */
async function request<T>(path: string, options?: ApiRequestInit): Promise<ApiResponse<T>> {
  const fetchOptions: RequestInit = { ...(options ?? {}) };
  delete (fetchOptions as ApiRequestInit).auth;

  const response = await fetch(getRequestUrl(path), {
    ...fetchOptions,
    headers: getAuthHeaders(options),
    credentials: 'include',
  });

  const text = await response.text();
  let parsed: unknown = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new ApiClientError(text, response.status);
      }

      throw new ApiClientError('서버 응답을 해석하지 못했습니다.', response.status);
    }
  }

  if (!response.ok) {
    if (isBackendApiResponse<null>(parsed)) {
      throw new ApiClientError(parsed.message, response.status, parsed.code);
    }

    throw new ApiClientError(text || `API 요청 실패: ${response.status}`, response.status);
  }

  if (!parsed) {
    return createApiResponse(undefined as T);
  }

  if (isBackendApiResponse<T>(parsed)) {
    if (!parsed.isSuccess) {
      throw new ApiClientError(parsed.message, response.status, parsed.code);
    }

    return createApiResponse(parsed.result, parsed.message, parsed.code);
  }

  return createApiResponse(parsed as T);
}

function mapBackendRepository(repo: BackendGithubRepoInfo, index: number): Repository {
  const fullName = repo.fullRepoName || repo.repoUrl || `repo-${index}`;

  return {
    id: fullName,
    name: repo.repoName || fullName,
    fullName,
    url: repo.repoUrl,
    description: repo.description || '설명이 없는 레포지토리입니다.',
    language: repo.mainLang || 'Unknown',
    isPrivate: repo.isPrivate,
    stars: 0,
    updatedAt: repo.isPrivate ? 'Private' : 'Public',
  };
}

function createMockResumeResult(
  jobInput?: JobInput,
  repositoryMatches: RepositoryMatch[] = [],
): ResumeResult {
  const position = jobInput?.position ?? '풀스택 개발자';
  const techStack = jobInput?.techStack ?? 'React, TypeScript, Node.js';
  const postingImage = jobInput?.jobPostingImageName || '채용공고 이미지';
  const companyName = jobInput?.companyName ? `${jobInput.companyName}의 ` : '';
  const topRepository = repositoryMatches[0];
  const topRepositoryName = topRepository?.repositoryName ?? '선택한 GitHub 프로젝트';
  const topRepositoryKeywords = topRepository?.matchedKeywords.slice(0, 4).join(', ') || techStack;
  const responsibilities =
    jobInput?.responsibilities || '제품 요구사항을 이해하고 안정적인 서비스를 구현하는 업무';
  const requiredSkills = jobInput?.requiredSkills?.length
    ? jobInput.requiredSkills.join(', ')
    : techStack;
  const preferredSkills = jobInput?.preferredSkills?.length
    ? jobInput.preferredSkills.join(', ')
    : '협업 경험, 문제 해결 능력';
  const traits = jobInput?.traits?.length
    ? jobInput.traits.join(', ')
    : '협업, 자기주도성, 문제 해결력';

  return {
    title: `${position} 지원 자기소개서`,
    strengths: [
      `${topRepositoryName} 기반 실전 개발 경험 보유`,
      `${requiredSkills} 중심의 공고 요구 역량과 보유 기술 연결`,
      `${traits}을 보여주는 프로젝트 기여 경험`,
    ],
    techKeywords: [
      ...techStack.split(',').map((skill) => skill.trim()),
      ...(jobInput?.requiredSkills ?? []),
      ...(jobInput?.preferredSkills ?? []),
    ]
      .filter((skill, index, skills) => skill !== '' && skills.indexOf(skill) === index)
      .slice(0, 8),
    content: `안녕하세요. ${position} 직무에 지원하는 개발자입니다.

저는 ${techStack}를 활용해 실제 사용자가 마주하는 문제를 제품 흐름 안에서 해결하는 경험을 쌓아왔습니다. 선택한 GitHub 레포지토리의 README, 커밋 이력, 프로젝트 구조를 기반으로 제가 맡은 역할과 기술적 의사결정을 정리했고, 이를 ${position} 직무에서 요구하는 역량과 연결했습니다.

지원 공고는 ${postingImage}를 AI 이미지 분석한 결과를 기준으로 정리했으며, ${companyName}${position} 포지션에서 강조하는 주요 업무는 "${responsibilities}"입니다. 공고에서 확인한 필수 기술은 ${requiredSkills}이고, 우대 기술과 경험은 ${preferredSkills}입니다.

특히 ${topRepositoryName}은 공고와의 매칭 점수가 가장 높았고, ${topRepositoryKeywords} 근거를 중심으로 제 경험을 설명하기에 적합했습니다. 프로젝트를 진행하며 기능 구현뿐 아니라 요구사항 분석, API 연동, 상태 관리, 사용자 흐름 설계까지 함께 고려했습니다. 이러한 경험을 바탕으로 입사 후에도 ${traits}을 바탕으로 문제를 구조적으로 분석하고, 협업 과정에서 명확하게 소통하며, 안정적으로 동작하는 서비스를 만드는 데 기여하겠습니다.`,
  };
}

// API client -----------------------------------------------------------------

export const apiClient = {
  async reissueToken(): Promise<ApiResponse<string>> {
    return request<string>('/auth/reissue', {
      method: 'POST',
      auth: false,
    });
  },

  async getMe(): Promise<ApiResponse<AuthUser>> {
    if (MOCK_MODE) {
      await delay(300);
      return createApiResponse(MOCK_USER);
    }

    return request<AuthUser>('/users/me');
  },

  async logout(): Promise<ApiResponse<null>> {
    if (MOCK_MODE) {
      await delay(200);
      return createApiResponse(null);
    }

    return request<null>('/auth/logout', { method: 'POST' });
  },

  async getRepositories(): Promise<ApiResponse<Repository[]>> {
    if (MOCK_MODE) {
      await delay(600);
      return createApiResponse(MOCK_REPOSITORIES);
    }

    const { data, message, code } = await request<BackendGithubRepoListInfo>('/git/github');
    return createApiResponse(data.repos.map(mapBackendRepository), message, code);
  },

  async generateResume(
    payload: ResumeGenerationRequest,
  ): Promise<ApiResponse<{ jobId: string }>> {
    void payload;
    await delay(MOCK_MODE ? 500 : 700);
    return createApiResponse({ jobId: crypto.randomUUID() });
  },

  async getResumeResult(
    _jobId: string,
    jobInput?: JobInput,
    repositoryMatches?: RepositoryMatch[],
  ): Promise<ApiResponse<ResumeResult>> {
    await delay(MOCK_MODE ? 2500 : 1800);
    return createApiResponse(createMockResumeResult(jobInput, repositoryMatches));
  },
};
