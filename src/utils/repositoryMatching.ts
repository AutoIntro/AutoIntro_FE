import type { JobInput, Repository, RepositoryMatch } from '../types/resume';

type KeywordMatcher = {
  label: string;
  aliases: string[];
};

const MATCH_KEYWORDS: KeywordMatcher[] = [
  { label: 'React', aliases: ['react', 'react.js', 'reactjs', '리액트'] },
  { label: 'TypeScript', aliases: ['typescript', 'ts', '타입스크립트'] },
  { label: 'JavaScript', aliases: ['javascript', 'js', '자바스크립트'] },
  { label: 'Java', aliases: ['java', '자바'] },
  { label: 'Spring Boot', aliases: ['spring boot', 'springboot', 'spring', '스프링'] },
  { label: 'Node.js', aliases: ['node.js', 'nodejs', 'node'] },
  { label: 'Next.js', aliases: ['next.js', 'nextjs', 'next'] },
  { label: 'Python', aliases: ['python', '파이썬'] },
  { label: 'Django', aliases: ['django'] },
  { label: 'FastAPI', aliases: ['fastapi'] },
  { label: 'MySQL', aliases: ['mysql'] },
  { label: 'PostgreSQL', aliases: ['postgresql', 'postgres'] },
  { label: 'MongoDB', aliases: ['mongodb', 'mongo'] },
  { label: 'Redis', aliases: ['redis'] },
  { label: 'REST API', aliases: ['rest api', 'restapi', 'api', 'api 연동'] },
  { label: 'OAuth', aliases: ['oauth', 'oauth2', '소셜 로그인'] },
  { label: '인증', aliases: ['auth', 'authentication', '인증', '로그인'] },
  { label: '상태 관리', aliases: ['state management', '상태 관리', 'zustand', 'redux'] },
  { label: 'HTML/CSS', aliases: ['html', 'css', 'html/css', '마크업'] },
  { label: 'AWS', aliases: ['aws', 'amazon web services'] },
  { label: 'Docker', aliases: ['docker', '도커'] },
  { label: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { label: 'CI/CD', aliases: ['ci/cd', 'cicd', 'github actions', 'githubactions'] },
  { label: '테스트 자동화', aliases: ['test automation', '테스트 자동화', 'playwright', 'cypress', 'vitest'] },
  { label: '배포', aliases: ['deploy', 'deployment', '배포', 'vercel', 'netlify'] },
  { label: '모니터링', aliases: ['monitoring', '모니터링', 'prometheus', 'grafana'] },
  { label: 'Linux', aliases: ['linux', '리눅스'] },
  { label: 'Flutter', aliases: ['flutter', '플러터'] },
  { label: 'Kotlin', aliases: ['kotlin', '코틀린'] },
  { label: 'Swift', aliases: ['swift', '스위프트'] },
];

const POSITION_KEYWORDS: KeywordMatcher[] = [
  { label: '프론트엔드', aliases: ['frontend', 'front-end', '프론트엔드', 'react'] },
  { label: '백엔드', aliases: ['backend', 'back-end', '백엔드', 'server', '서버', 'spring'] },
  { label: 'DevOps', aliases: ['devops', 'ci/cd', 'docker', 'kubernetes'] },
  { label: '데이터', aliases: ['data', '데이터', 'etl', 'pipeline'] },
  { label: '모바일', aliases: ['mobile', '모바일', 'ios', 'android', 'flutter'] },
];

export function rankRepositoriesForJob(
  jobInput: JobInput,
  repositories: Repository[],
): RepositoryMatch[] {
  const matches = repositories.map((repository, index) => {
    const requiredMatches = matchLabels(jobInput.requiredSkills, repository);
    const preferredMatches = matchLabels(jobInput.preferredSkills, repository);
    const responsibilityMatches = matchLabels(
      extractKnownKeywords(jobInput.responsibilities),
      repository,
    );
    const keywordMatches = matchLabels(jobInput.keywords, repository);
    const positionMatches = matchLabels(
      extractPositionKeywords(jobInput.position),
      repository,
      POSITION_KEYWORDS,
    );

    const readinessScore = getProjectReadinessScore(repository);
    const recencyScore = getRecencyScore(repository.updatedAt);

    const score = Math.min(
      100,
      Math.round(
        Math.min(requiredMatches.length * 18, 42) +
          Math.min(responsibilityMatches.length * 9, 22) +
          Math.min(preferredMatches.length * 8, 18) +
          Math.min(keywordMatches.length * 4, 10) +
          Math.min(positionMatches.length * 8, 10) +
          readinessScore +
          recencyScore,
      ),
    );

    const matchedKeywords = normalizeTags([
      ...requiredMatches,
      ...responsibilityMatches,
      ...preferredMatches,
      ...keywordMatches,
      ...positionMatches,
    ]).slice(0, 8);

    return {
      repositoryId: repository.id,
      repositoryName: repository.name,
      repositoryUrl: repository.url,
      rank: index + 1,
      score,
      matchedKeywords,
      jobSignals: buildJobSignals({
        requiredMatches,
        responsibilityMatches,
        preferredMatches,
        keywordMatches,
      }),
      repositorySignals: buildRepositorySignals(repository, matchedKeywords),
      summary: buildSummary(repository, jobInput, matchedKeywords),
      improvement: buildImprovement(jobInput, matchedKeywords),
      originalIndex: index,
      stars: repository.stars,
    };
  });

  return matches
    .sort((a, b) => b.score - a.score || b.stars - a.stars || a.originalIndex - b.originalIndex)
    .map((match, index) => ({
      repositoryId: match.repositoryId,
      repositoryName: match.repositoryName,
      repositoryUrl: match.repositoryUrl,
      rank: index + 1,
      score: match.score,
      matchedKeywords: match.matchedKeywords,
      jobSignals: match.jobSignals,
      repositorySignals: match.repositorySignals,
      summary: match.summary,
      improvement: match.improvement,
    }));
}

function matchLabels(
  labels: readonly string[],
  repository: Repository,
  matchers: KeywordMatcher[] = MATCH_KEYWORDS,
) {
  const matches: string[] = [];

  labels.forEach((label) => {
    const canonicalLabel = getCanonicalKeywordLabel(label, matchers);

    if (
      canonicalLabel !== '' &&
      !matches.some((match) => normalizeSearchText(match) === normalizeSearchText(canonicalLabel)) &&
      repositoryHasKeyword(repository, canonicalLabel, matchers)
    ) {
      matches.push(canonicalLabel);
    }
  });

  return matches;
}

function extractKnownKeywords(value: string) {
  return MATCH_KEYWORDS.filter((keyword) =>
    keyword.aliases.some((alias) => textHasKeyword(value, alias)),
  ).map((keyword) => keyword.label);
}

function extractPositionKeywords(value: string) {
  return POSITION_KEYWORDS.filter((keyword) =>
    keyword.aliases.some((alias) => textHasKeyword(value, alias)),
  ).map((keyword) => keyword.label);
}

function getCanonicalKeywordLabel(value: string, matchers: KeywordMatcher[]) {
  const trimmed = value.trim();
  const normalizedValue = normalizeSearchText(trimmed);

  if (normalizedValue === '') {
    return '';
  }

  const matched = matchers.find((keyword) =>
    keyword.aliases.some((alias) => {
      const normalizedAlias = normalizeSearchText(alias);
      return normalizedValue === normalizedAlias || normalizedValue.includes(normalizedAlias);
    }),
  );

  return matched?.label ?? trimmed;
}

function repositoryHasKeyword(
  repository: Repository,
  label: string,
  matchers: KeywordMatcher[],
) {
  const rawText = [
    repository.name,
    repository.fullName,
    repository.description,
    repository.language,
  ].join(' ');
  const keyword = matchers.find(
    (matcher) => normalizeSearchText(matcher.label) === normalizeSearchText(label),
  );
  const aliases = keyword ? keyword.aliases : [label];

  return aliases.some((alias) => textHasKeyword(rawText, alias));
}

function textHasKeyword(text: string, keyword: string) {
  const normalizedKeyword = normalizeSearchText(keyword);

  if (normalizedKeyword === '') {
    return false;
  }

  if (normalizedKeyword === 'java') {
    return /\bjava\b/i.test(text);
  }

  if (normalizedKeyword === 'go') {
    return /\bgo\b/i.test(text);
  }

  return normalizeSearchText(text).includes(normalizedKeyword);
}

function getProjectReadinessScore(repository: Repository) {
  let score = 0;

  if (repository.description.trim().length >= 12) score += 5;
  if (repository.language && repository.language !== 'Unknown') score += 3;
  if (repository.stars >= 10) score += 4;
  else if (repository.stars > 0) score += 2;

  return score;
}

function getRecencyScore(updatedAt: string) {
  const updatedDate = new Date(updatedAt);

  if (Number.isNaN(updatedDate.getTime())) {
    return 2;
  }

  const diffDays = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays <= 30) return 8;
  if (diffDays <= 90) return 6;
  if (diffDays <= 180) return 4;
  if (diffDays <= 365) return 2;
  return 0;
}

function buildJobSignals({
  requiredMatches,
  responsibilityMatches,
  preferredMatches,
  keywordMatches,
}: {
  requiredMatches: string[];
  responsibilityMatches: string[];
  preferredMatches: string[];
  keywordMatches: string[];
}) {
  const signals: string[] = [];

  if (requiredMatches.length > 0) {
    signals.push(`필수 기술: ${requiredMatches.slice(0, 4).join(', ')}`);
  }

  if (responsibilityMatches.length > 0) {
    signals.push(`주요 업무: ${responsibilityMatches.slice(0, 4).join(', ')}`);
  }

  if (preferredMatches.length > 0) {
    signals.push(`우대 조건: ${preferredMatches.slice(0, 4).join(', ')}`);
  }

  if (keywordMatches.length > 0) {
    signals.push(`핵심 키워드: ${keywordMatches.slice(0, 4).join(', ')}`);
  }

  return signals.slice(0, 3);
}

function buildRepositorySignals(repository: Repository, matchedKeywords: string[]) {
  return normalizeTags([
    repository.language !== 'Unknown' ? `주요 언어 ${repository.language}` : '',
    matchedKeywords.length > 0 ? `레포 설명에서 ${matchedKeywords.slice(0, 3).join(', ')} 확인` : '',
    repository.updatedAt ? `최근 활동 ${repository.updatedAt}` : '',
  ]).slice(0, 3);
}

function buildSummary(
  repository: Repository,
  jobInput: JobInput,
  matchedKeywords: string[],
) {
  const position = jobInput.position.trim() || '해당 직무';

  if (matchedKeywords.length === 0) {
    return `${repository.name}은 직접 일치하는 키워드는 적지만 보조 프로젝트 경험으로 활용할 수 있습니다.`;
  }

  return `${repository.name}은 ${matchedKeywords.slice(0, 3).join(', ')} 근거가 강해 ${position} 공고에 우선 활용하기 좋습니다.`;
}

function buildImprovement(jobInput: JobInput, matchedKeywords: string[]) {
  const missingKeywords = normalizeTags([
    ...jobInput.requiredSkills,
    ...jobInput.preferredSkills,
    ...extractKnownKeywords(jobInput.responsibilities),
  ]).filter(
    (keyword) =>
      !matchedKeywords.some((match) => normalizeSearchText(match) === normalizeSearchText(keyword)),
  );

  if (missingKeywords.length === 0) {
    return '현재 공고 요구사항과 연결되는 GitHub 근거가 충분합니다.';
  }

  return `README나 프로젝트 설명에 ${missingKeywords.slice(0, 2).join(', ')} 구현 근거를 보강하면 어필력이 올라갑니다.`;
}

function normalizeTags(values: readonly string[]) {
  const seen = new Set<string>();
  const tags: string[] = [];

  values.forEach((value) => {
    const tag = value.trim();
    const key = normalizeSearchText(tag);

    if (tag === '' || seen.has(key)) {
      return;
    }

    seen.add(key);
    tags.push(tag);
  });

  return tags;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/c\+\+/g, 'cplusplus')
    .replace(/c#/g, 'csharp')
    .replace(/\.net/g, 'dotnet')
    .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');
}
