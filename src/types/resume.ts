export interface Repository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  description: string;
  language: string;
  isPrivate: boolean;
  stars: number;
  updatedAt: string;
}

export interface JobInput {
  position: string;
  jobPostingImageName: string;
  jobPostingText?: string;
  companyName: string;
  responsibilities: string;
  requiredSkills: string[];
  preferredSkills: string[];
  traits: string[];
  keywords: string[];
  techStack: string;
}

export interface OcrField {
  value: string;
  evidence?: string;
  confidence?: number;
}

export interface OcrEvidenceItem {
  value: string;
  evidence?: string;
  confidence?: number;
}

export interface OcrSkillItem {
  name: string;
  evidence?: string;
  confidence?: number;
}

export interface OcrAnalyzeResponse {
  rawText: string;
  jobPostingText?: string;
  companyName?: OcrField;
  position?: OcrField;
  mainTasks?: OcrEvidenceItem[];
  requiredSkills?: OcrSkillItem[];
  preferredSkills?: OcrSkillItem[];
  qualifications?: OcrEvidenceItem[];
  keywords?: OcrSkillItem[];
  warnings?: string[];
  totalTokens?: number;
  modelName?: string;
}

export interface ResumeGenerationRequest {
  repositoryIds: string[];
  jobInput: JobInput;
  repositoryMatches?: RepositoryMatch[];
}

export interface ResumeGenerationResult {
  jobId: string;
  result: ResumeResult;
}

export interface ResumeResult {
  title: string;
  content: string;
  strengths: string[];
  techKeywords: string[];
}

export interface RepositoryMatch {
  repositoryId: string;
  repositoryName: string;
  repositoryUrl: string;
  rank: number;
  score: number;
  matchedKeywords: string[];
  jobSignals: string[];
  repositorySignals: string[];
  summary: string;
  improvement: string;
}

/** 인증 상태 */
export interface AuthUser {
  login: string;       // GitHub username
  avatarUrl: string;
  name: string;
}
