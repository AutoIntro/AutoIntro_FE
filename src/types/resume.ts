export interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  updatedAt: string;
}

export interface JobInput {
  position: string;
  jobPostingImageName: string;
  companyName: string;
  responsibilities: string;
  requiredSkills: string[];
  preferredSkills: string[];
  traits: string[];
  keywords: string[];
  techStack: string;
}

export interface ResumeGenerationRequest {
  repositoryIds: number[];
  jobInput: JobInput;
}

export interface ResumeResult {
  title: string;
  content: string;
  strengths: string[];
  techKeywords: string[];
}

/** 인증 상태 */
export interface AuthUser {
  login: string;       // GitHub username
  avatarUrl: string;
  name: string;
}
