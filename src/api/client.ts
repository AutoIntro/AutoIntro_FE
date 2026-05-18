import { API_BASE_URL, MOCK_MODE } from '../constants/constants';
import { useAuthStore } from '../stores/authStore';
import type { ApiResponse, BackendApiResponse } from '../types/common';
import type {
  AuthUser,
  JobInput,
  OcrAnalyzeResponse,
  Repository,
  RepositoryMatch,
  ResumeGenerationRequest,
  ResumeGenerationResult,
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

interface BackendSaveProjectRequestBody {
  fullRepoName: string;
  repoName: string;
  repoUrl: string;
  mainLang: string;
  description: string | null;
  isPrivate: boolean;
}

type ProjectIdValue = number | string | null | undefined;

interface BackendSaveProjectObjectResult {
  id?: ProjectIdValue;
  projectId?: ProjectIdValue;
  projectIds?: ProjectIdValue[];
  project?: {
    id?: ProjectIdValue;
    projectId?: ProjectIdValue;
  };
}

type BackendSaveProjectResult = ProjectIdValue | BackendSaveProjectObjectResult;

interface BackendIntroductionProjectWeight {
  projectId: number;
  repoName: string;
  mainLang: string;
  score: number;
  maxScore: number;
  scorePercent: number;
  matchedKeywords: string[];
  reason: string;
}

interface BackendIntroductionWeightResult {
  projects: BackendIntroductionProjectWeight[];
  totalCount: number;
}

interface BackendIntroductionGenerateResult {
  requestId: number;
  aiIntroductionId: number;
  userIntroductionId: number;
  content: string;
  jobPostingText: string;
  weightResult: BackendIntroductionWeightResult;
  totalTokens: number;
  modelName: string;
}

type BackendOcrResult = Partial<OcrAnalyzeResponse> & {
  jobPostingText?: string;
};

interface IntroductionGenerateRequestBody {
  companyName: string;
  targetJob: string;
  keywords: string;
  type: 'RESUME';
  amount: 'SHORT' | 'MEDIUM' | 'LONG';
  extraDetail: string;
  jobPostingText: string;
  projectIds: number[];
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
  const isFormDataBody = typeof FormData !== 'undefined' && options?.body instanceof FormData;

  if (options?.body !== undefined && !isFormDataBody && !headers.has('Content-Type')) {
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

function createSaveProjectRequestBody(repo: Repository): BackendSaveProjectRequestBody {
  return {
    fullRepoName: repo.fullName,
    repoName: repo.name,
    repoUrl: repo.url,
    mainLang: repo.language,
    description: repo.description || null,
    isPrivate: repo.isPrivate,
  };
}

function toPositiveInteger(value: ProjectIdValue) {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
}

function getSavedProjectIds(result: BackendSaveProjectResult) {
  if (typeof result === 'number' || typeof result === 'string') {
    const projectId = toPositiveInteger(result);
    return projectId ? [projectId] : [];
  }

  if (!result) {
    return [];
  }

  const projectIds = [
    ...(result.projectIds ?? []),
    result.projectId,
    result.id,
    result.project?.projectId,
    result.project?.id,
  ]
    .map(toPositiveInteger)
    .filter((projectId): projectId is number => projectId !== null);

  return [...new Set(projectIds)];
}

function createMockProjectId(repo: Repository) {
  const hash = repo.id
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return (hash % 100000) + 1;
}

function getNumericProjectIds(repositoryIds: string[]) {
  return repositoryIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function normalizeKeywordList(values: readonly string[]) {
  const seen = new Set<string>();
  const keywords: string[] = [];

  values.forEach((value) => {
    const keyword = value.trim();
    const key = keyword.toLowerCase();

    if (keyword === '' || seen.has(key)) {
      return;
    }

    seen.add(key);
    keywords.push(keyword);
  });

  return keywords;
}

function getJobPostingText(jobInput: JobInput) {
  if (jobInput.jobPostingText?.trim()) {
    return jobInput.jobPostingText.trim();
  }

  return [
    jobInput.responsibilities && `주요 업무: ${jobInput.responsibilities}`,
    jobInput.requiredSkills.length > 0 && `필수 기술: ${jobInput.requiredSkills.join(', ')}`,
    jobInput.preferredSkills.length > 0 && `우대 기술: ${jobInput.preferredSkills.join(', ')}`,
    jobInput.traits.length > 0 && `인재상/자격요건: ${jobInput.traits.join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function createIntroductionKeywords(jobInput: JobInput) {
  return normalizeKeywordList([
    ...jobInput.keywords,
    ...jobInput.requiredSkills,
    ...jobInput.preferredSkills,
    jobInput.techStack,
  ]).join(', ');
}

function createIntroductionExtraDetail(jobInput: JobInput) {
  return [
    jobInput.responsibilities && `주요 업무: ${jobInput.responsibilities}`,
    jobInput.traits.length > 0 && `인재상/자격요건: ${jobInput.traits.join(', ')}`,
    jobInput.techStack && `지원자 보유 기술: ${jobInput.techStack}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function createIntroductionRequestBody(
  payload: ResumeGenerationRequest,
): IntroductionGenerateRequestBody {
  const { jobInput } = payload;

  return {
    companyName: jobInput.companyName,
    targetJob: jobInput.position,
    keywords: createIntroductionKeywords(jobInput),
    type: 'RESUME',
    amount: 'SHORT',
    extraDetail: createIntroductionExtraDetail(jobInput),
    jobPostingText: getJobPostingText(jobInput),
    projectIds: getNumericProjectIds(payload.repositoryIds),
  };
}

function mapBackendProjectToRepositoryMatch(
  project: BackendIntroductionProjectWeight,
  index: number,
): RepositoryMatch {
  const matchedKeywords = project.matchedKeywords ?? [];
  const reason = project.reason ?? '';

  return {
    repositoryId: String(project.projectId),
    repositoryName: project.repoName,
    repositoryUrl: '',
    rank: index + 1,
    score: project.score,
    maxScore: project.maxScore,
    scorePercent: project.scorePercent,
    mainLang: project.mainLang ?? '',
    matchedKeywords,
    reason,
    jobSignals: [],
    repositorySignals: project.mainLang ? [`주요 언어 ${project.mainLang}`] : [],
    summary: reason,
    improvement: '',
  };
}

function mapIntroductionResultToResumeResult(
  jobInput: JobInput,
  result: BackendIntroductionGenerateResult,
): ResumeResult {
  const projects = result.weightResult?.projects ?? [];
  const projectKeywords = projects.flatMap((project) => project.matchedKeywords);
  const techKeywords = normalizeKeywordList([
    ...jobInput.techStack.split(','),
    ...jobInput.requiredSkills,
    ...jobInput.preferredSkills,
    ...projectKeywords,
  ]).slice(0, 10);
  const strengths = projects
    .slice(0, 3)
    .map((project) => project.reason || `${project.repoName} 기반 경험`);

  return {
    title: `${jobInput.position} 지원 자기소개서`,
    content: result.content,
    strengths,
    techKeywords,
  };
}

function normalizeOcrAnalyzeResponse(result: BackendOcrResult): OcrAnalyzeResponse {
  const rawText = result.rawText?.trim() || result.jobPostingText?.trim() || '';

  return {
    rawText,
    jobPostingText: result.jobPostingText ?? rawText,
    companyName: result.companyName,
    position: result.position,
    mainTasks: result.mainTasks ?? [],
    requiredSkills: result.requiredSkills ?? [],
    preferredSkills: result.preferredSkills ?? [],
    qualifications: result.qualifications ?? [],
    keywords: result.keywords ?? [],
    warnings: result.warnings ?? [],
    totalTokens: result.totalTokens,
    modelName: result.modelName,
  };
}

function createMockOcrAnalyzeResponse(): OcrAnalyzeResponse {
  const rawText = `자바 백엔드 경력 채용
(주)인공지능팩토리
사용 기술: Linode, NGINX, PostgreSQL, Redis, Spring Boot, Spring MVC, Spring Data JPA, DB, Infra
주요업무
웹 백엔드 설계·개발·운영을 담당하게 됩니다.
REST API 설계 및 구현
비즈니스 로직 및 데이터 처리
자격요건
Java/Kotlin 언어 및 Spring Boot 기반 백엔드 실무 경험
관계형 DBMS(PostgreSQL 등)의 트랜잭션 설계·튜닝 가능
우대사항
Kubernetes + Docker 기반 컨테이너 오케스트레이션 경험
MSA 환경에서의 서비스 설계·운영 경험`;

  return {
    rawText,
    jobPostingText: rawText,
    companyName: {
      value: '(주)인공지능팩토리',
      evidence: '(주)인공지능팩토리',
      confidence: 0.95,
    },
    position: {
      value: '자바 백엔드 경력 채용',
      evidence: '자바 백엔드 경력 채용',
      confidence: 0.94,
    },
    mainTasks: [
      {
        value: '웹 백엔드 설계·개발·운영',
        evidence: '웹 백엔드 설계·개발·운영을 담당하게 됩니다.',
      },
      {
        value: 'REST API 설계 및 구현',
        evidence: 'REST API 설계 및 구현',
      },
      {
        value: '비즈니스 로직 및 데이터 처리',
        evidence: '비즈니스 로직 및 데이터 처리',
      },
    ],
    requiredSkills: [
      { name: 'Java', evidence: 'Java/Kotlin 언어 및 Spring Boot 기반 백엔드 실무 경험' },
      { name: 'Kotlin', evidence: 'Java/Kotlin 언어 및 Spring Boot 기반 백엔드 실무 경험' },
      { name: 'Spring Boot', evidence: 'Spring Boot 기반 백엔드 실무 경험' },
      { name: 'PostgreSQL', evidence: '관계형 DBMS(PostgreSQL 등)의 트랜잭션 설계·튜닝 가능' },
      { name: 'React', evidence: '근거 없는 프론트엔드 기술' },
      { name: 'Next.js', evidence: 'NestJS와 혼동된 항목' },
    ],
    preferredSkills: [
      { name: 'Docker', evidence: 'Kubernetes + Docker 기반 컨테이너 오케스트레이션 경험' },
      { name: 'Kubernetes', evidence: 'Kubernetes + Docker 기반 컨테이너 오케스트레이션 경험' },
      { name: 'MSA', evidence: 'MSA 환경에서의 서비스 설계·운영 경험' },
    ],
    qualifications: [
      {
        value: '백엔드 실무 경험',
        evidence: 'Spring Boot 기반 백엔드 실무 경험',
      },
    ],
    keywords: [
      { name: '자바 백엔드', evidence: '자바 백엔드 경력 채용' },
      { name: 'REST API', evidence: 'REST API 설계 및 구현' },
      { name: 'Redis', evidence: 'Redis' },
    ],
    warnings: ['이미지 분석 결과는 자동 입력값입니다. 제출 전 반드시 확인해주세요.'],
    totalTokens: 0,
    modelName: 'mock-ocr-analyze',
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

  async saveProject(repo: Repository): Promise<ApiResponse<number[]>> {
    if (MOCK_MODE) {
      await delay(500);
      return createApiResponse([createMockProjectId(repo)]);
    }

    const { data, message, code } = await request<BackendSaveProjectResult>('/git', {
      method: 'POST',
      body: JSON.stringify(createSaveProjectRequestBody(repo)),
    });

    return createApiResponse(getSavedProjectIds(data), message, code);
  },

  async generateResume(
    payload: ResumeGenerationRequest,
  ): Promise<ApiResponse<ResumeGenerationResult>> {
    if (MOCK_MODE) {
      await delay(500);
      const result = createMockResumeResult(payload.jobInput, payload.repositoryMatches);
      return createApiResponse({
        jobId: crypto.randomUUID(),
        result,
        repositoryMatches: payload.repositoryMatches,
      });
    }

    const { data, message, code } = await request<BackendIntroductionGenerateResult>(
      '/introductions/generate',
      {
        method: 'POST',
        body: JSON.stringify(createIntroductionRequestBody(payload)),
      },
    );

    return createApiResponse(
      {
        jobId: String(data.requestId),
        result: mapIntroductionResultToResumeResult(payload.jobInput, data),
        repositoryMatches: (data.weightResult?.projects ?? []).map(mapBackendProjectToRepositoryMatch),
      },
      message,
      code,
    );
  },

  async getResumeResult(
    _jobId: string,
    jobInput?: JobInput,
    repositoryMatches?: RepositoryMatch[],
    result?: ResumeResult,
  ): Promise<ApiResponse<ResumeResult>> {
    if (result) {
      return createApiResponse(result);
    }

    await delay(MOCK_MODE ? 2500 : 1800);
    return createApiResponse(createMockResumeResult(jobInput, repositoryMatches));
  },

  async analyzeJobPostingImages(
    images: File[],
    signal?: AbortSignal,
  ): Promise<ApiResponse<OcrAnalyzeResponse>> {
    if (MOCK_MODE) {
      await delay(700);
      return createApiResponse(createMockOcrAnalyzeResponse());
    }

    const formData = new FormData();

    images.forEach((image) => {
      formData.append('images', image);
    });

    if (images[0]) {
      formData.append('image', images[0]);
    }

    const { data, message, code } = await request<BackendOcrResult>('/introductions/ocr', {
      method: 'POST',
      body: formData,
      signal,
    });

    return createApiResponse(normalizeOcrAnalyzeResponse(data), message, code);
  },

  async extractJobPostingText(image: File): Promise<ApiResponse<OcrAnalyzeResponse>> {
    const formData = new FormData();
    formData.append('image', image);

    const { data, message, code } = await request<BackendOcrResult>('/introductions/ocr', {
      method: 'POST',
      body: formData,
    });

    return createApiResponse(normalizeOcrAnalyzeResponse(data), message, code);
  },
};
