import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { JobInput, Repository, RepositoryMatch, ResumeResult } from '../types/resume';

interface ResumeState {
  selectedRepositories: Repository[];
  repositoryMatches: RepositoryMatch[];
  jobInput: JobInput | null;
  result: ResumeResult | null;

  setSelectedRepositories: (repositories: Repository[]) => void;
  setRepositoryMatches: (matches: RepositoryMatch[]) => void;
  setJobInput: (jobInput: JobInput) => void;
  setResult: (result: ResumeResult) => void;
  clear: () => void;
}

/**
 * 자기소개서 생성 흐름 전역 상태
 * - persist: 새로고침해도 선택한 레포/공고 정보 유지 (sessionStorage)
 * - 상태 변경 시 구독 컴포넌트 자동 리렌더링 (Zustand 기본 동작)
 */
export const useResumeStore = create<ResumeState>()(
  persist(
    (set) => ({
      selectedRepositories: [],
      repositoryMatches: [],
      jobInput: null,
      result: null,

      setSelectedRepositories: (repositories) =>
        set({ selectedRepositories: repositories, repositoryMatches: [] }),

      setRepositoryMatches: (matches) => set({ repositoryMatches: matches }),

      setJobInput: (jobInput) => set({ jobInput }),

      setResult: (result) => set({ result }),

      clear: () =>
        set({
          selectedRepositories: [],
          repositoryMatches: [],
          jobInput: null,
          result: null,
        }),
    }),
    {
      name: 'gitresume-resume',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
