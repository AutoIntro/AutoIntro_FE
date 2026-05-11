import { API_BASE_URL, MOCK_MODE } from '../constants/constants';
import type { ApiResponse } from '../types/common';
import type { AuthUser, JobInput, Repository, ResumeGenerationRequest, ResumeResult } from '../types/resume';

// ── Mock 데이터 ──────────────────────────────────────────────────────────────

const MOCK_USER: AuthUser = {
  login: 'jaebeom-dev',
  name: '안재범',
  avatarUrl: 'https://avatars.githubusercontent.com/u/9919',
};

const MOCK_REPOSITORIES: Repository[] = [
  {
    id: 1,
    name: 'gitresume-fe',
    fullName: 'jaebeom-dev/gitresume-fe',
    description: 'GitHub 기반 자기소개서 생성 서비스 프론트엔드 (React + Vite + TypeScript)',
    language: 'TypeScript',
    stars: 12,
    updatedAt: '2026-04-28',
  },
  {
    id: 2,
    name: 'auto-intro-api',
    fullName: 'jaebeom-dev/auto-intro-api',
    description: 'Spring Boot 기반 GitHub 분석 및 LLM 자기소개서 생성 REST API',
    language: 'Java',
    stars: 8,
    updatedAt: '2026-04-25',
  },
  {
    id: 3,
    name: 'weather-monitoring-system',
    fullName: 'jaebeom-dev/weather-monitoring-system',
    description: 'Raspberry Pi, Arduino, InfluxDB 기반 실시간 환경 모니터링 시스템',
    language: 'Python',
    stars: 18,
    updatedAt: '2026-04-17',
  },
  {
    id: 4,
    name: 'ds-algorithm-java',
    fullName: 'jaebeom-dev/ds-algorithm-java',
    description: '자료구조 & 알고리즘 Java/Python 구현 모음 (스택, 큐, 트리, 그래프)',
    language: 'Java',
    stars: 5,
    updatedAt: '2026-03-10',
  },
];

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function createApiResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * 공통 fetch 래퍼
 * - credentials: 'include' → 세션 쿠키 자동 첨부 (GitHub OAuth 세션 유지)
 * - 4xx/5xx → Error throw
 * - 정상 응답 → ApiResponse<T> 형태로 반환
 */
async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(message || `API 요청 실패: ${response.status}`);
  }

  const text = await response.text();
  const apiResponse = text
    ? (JSON.parse(text) as ApiResponse<T>)
    : createApiResponse(undefined as T);

  if (!apiResponse.success) {
    throw new Error(apiResponse.message || 'API 요청에 실패했습니다.');
  }

  return apiResponse;
}

// ── API 클라이언트 ────────────────────────────────────────────────────────────

export const apiClient = {
  /**
   * 현재 로그인된 사용자 정보 조회
   * 백엔드: GET /auth/me  (세션/쿠키 기반)
   */
  async getMe(): Promise<ApiResponse<AuthUser>> {
    if (MOCK_MODE) {
      await delay(300);
      return createApiResponse(MOCK_USER);
    }
    return request<AuthUser>('/auth/me');
  },

  /**
   * 로그아웃
   * 백엔드: POST /auth/logout
   */
  async logout(): Promise<ApiResponse<null>> {
    if (MOCK_MODE) {
      await delay(200);
      return createApiResponse(null);
    }
    return request<null>('/auth/logout', { method: 'POST' });
  },

  /**
   * GitHub 레포지토리 목록 조회
   * 백엔드: GET /github/repositories
   */
  async getRepositories(): Promise<ApiResponse<Repository[]>> {
    if (MOCK_MODE) {
      await delay(600);
      return createApiResponse(MOCK_REPOSITORIES);
    }
    return request<Repository[]>('/github/repositories');
  },

  /**
   * 자기소개서 생성 요청 (비동기 Job 시작)
   * 백엔드: POST /resumes/generate  → { jobId }
   */
  async generateResume(payload: ResumeGenerationRequest): Promise<ApiResponse<{ jobId: string }>> {
    if (MOCK_MODE) {
      await delay(500);
      return createApiResponse({ jobId: crypto.randomUUID() });
    }
    return request<{ jobId: string }>('/resumes/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * 생성 결과 폴링
   * 백엔드: GET /resumes/result/{jobId}
   * - 실제 서비스에서는 status 필드로 pending/done/error 구분
   * - 현재는 단순 폴링 (LoadingPage에서 완료될 때까지 반복 호출 가능)
   */
  async getResumeResult(jobId: string, jobInput?: JobInput): Promise<ApiResponse<ResumeResult>> {
    if (MOCK_MODE) {
      await delay(2500);
      const position = jobInput?.position ?? '풀스택 개발자';
      const techStack = jobInput?.techStack ?? 'React, TypeScript, Node.js';
      const postingImage = jobInput?.jobPostingImageName || '채용공고 이미지';
      const companyName = jobInput?.companyName ? `${jobInput.companyName}의 ` : '';
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

      return createApiResponse({
        title: `${position} 지원 자기소개서`,
        strengths: [
          'GitHub 프로젝트 기반 실전 개발 경험 보유',
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

특히 프로젝트를 진행하며 기능 구현뿐 아니라 요구사항 분석, API 연동, 상태 관리, 사용자 흐름 설계까지 함께 고려했습니다. 이러한 경험을 바탕으로 입사 후에도 ${traits}을 바탕으로 문제를 구조적으로 분석하고, 협업 과정에서 명확하게 소통하며, 안정적으로 동작하는 서비스를 만드는 데 기여하겠습니다.`,
      });
    }

    return request<ResumeResult>(`/resumes/result/${jobId}`);
  },
};
