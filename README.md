# ResumeGen Frontend

GitHub 레포지토리와 채용공고 정보를 바탕으로 AI 자기소개서 초안을 생성하는 프론트엔드입니다. GitHub 로그인, 레포지토리 선택, 채용공고 이미지 기반 입력 보조, 자기소개서 생성 대기, 결과 편집/복사/다운로드 흐름을 제공합니다.

## 주요 기능

- GitHub OAuth 로그인 및 세션 복원
- Mock 모드에서 백엔드 없이 주요 화면 흐름 확인
- GitHub 레포지토리 목록 조회 및 최대 3개 선택
- 채용공고 이미지 업로드, 미리보기, 분석 진행 상태 UI
- 직무명 자동완성 및 기술/자격요건 태그 입력
- 선택한 레포지토리와 공고 정보를 기반으로 자기소개서 생성 요청
- 생성 결과 편집, 클립보드 복사, Markdown 파일 다운로드

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router v6
- Zustand
- CSS Modules
- ESLint

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview

# 린트 검사
npm run lint
```

## 환경변수

`.env.example`을 참고해 `.env` 파일을 생성합니다.

```bash
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

`VITE_API_BASE_URL`은 API 요청과 GitHub OAuth 진입 URL을 만들 때 사용됩니다.

```ts
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export const GITHUB_OAUTH_URL = `${API_BASE_URL}/auth/github/login`;
```

## Mock 모드와 백엔드 연동

현재 `src/constants/constants.ts`의 `MOCK_MODE` 기본값은 `true`입니다. 이 상태에서는 GitHub 로그인, 레포지토리 조회, 자기소개서 생성 결과가 프론트엔드 Mock 데이터로 동작합니다.

```ts
/** 백엔드 연동 전: true / 연동 후: false */
export const MOCK_MODE = true;
```

백엔드와 연동할 때는 `MOCK_MODE`를 `false`로 변경하고, 아래 API가 동작해야 합니다. 모든 API 요청은 `credentials: 'include'`로 세션 쿠키를 포함합니다.

| 기능 | Method | Endpoint | 설명 |
| --- | --- | --- | --- |
| 현재 사용자 조회 | GET | `/auth/me` | GitHub OAuth 세션 확인 |
| 로그아웃 | POST | `/auth/logout` | 서버 세션 종료 |
| 레포지토리 목록 | GET | `/github/repositories` | 로그인 사용자의 GitHub 레포지토리 조회 |
| 자기소개서 생성 시작 | POST | `/resumes/generate` | `{ repositoryIds, jobInput }` 전송 후 `{ jobId }` 반환 |
| 자기소개서 결과 조회 | GET | `/resumes/result/{jobId}` | 생성된 자기소개서 결과 반환 |

채용공고 이미지 분석 UI는 현재 프론트엔드에서 파일명과 미리 정의된 직무 프로필을 기준으로 입력값을 채우는 Mock 흐름입니다. 실제 OCR/이미지 분석을 백엔드로 옮길 경우 `JobInputPage.tsx`의 `analyzeImage` 흐름을 API 호출로 교체하면 됩니다.

## 화면 흐름

```text
/              랜딩 페이지
/repositories  레포지토리 선택
/job-input     채용공고 이미지 업로드 및 자기소개서 설정
/loading       자기소개서 생성 대기 및 에러 처리
/result        결과 확인, 편집, 복사, 다운로드
*              404 페이지
```

`/repositories`, `/job-input`, `/loading`, `/result`는 `ProtectedRoute`로 보호됩니다. 비로그인 사용자는 랜딩 페이지로 이동합니다.

## 상태 관리

- `useAuthStore`: 로그인 사용자와 인증 여부를 `sessionStorage`에 저장합니다.
- `useResumeStore`: 선택한 레포지토리, 채용공고 입력값, 생성 결과를 `sessionStorage`에 저장합니다.
- `useAuthInit`: 앱 최초 진입 시 기존 인증 상태를 복원하거나 백엔드 세션을 확인합니다.

## 폴더 구조

```text
src/
├── api/
│   └── client.ts                  # API 클라이언트 및 Mock 데이터
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ProtectedRoute.tsx
│   └── layout/
│       ├── AppLayout.tsx
│       └── Header.tsx
├── constants/
│   ├── constants.ts               # 라우트, API URL, OAuth URL, Mock 모드
│   └── jobPositions.ts            # 직무 자동완성 데이터
├── hooks/
│   └── useAuth.ts                 # 앱 초기 인증 상태 복원
├── pages/
│   ├── LandingPage.tsx
│   ├── RepositorySelectPage.tsx
│   ├── JobInputPage.tsx
│   ├── LoadingPage.tsx
│   ├── ResultPage.tsx
│   └── NotFoundPage.tsx
├── stores/
│   ├── authStore.ts
│   └── resumeStore.ts
├── types/
│   ├── common.ts
│   └── resume.ts
├── index.css
└── main.tsx
```

## 주요 데이터 타입

```ts
interface ResumeGenerationRequest {
  repositoryIds: number[];
  jobInput: JobInput;
}

interface ResumeResult {
  title: string;
  content: string;
  strengths: string[];
  techKeywords: string[];
}
```
