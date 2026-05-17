   import type { JobInput, OcrAnalyzeResponse, OcrEvidenceItem, OcrField, OcrSkillItem } from '../types/resume';

const LOW_CONFIDENCE_THRESHOLD = 0.75;

const SKILL_ALIASES: Record<string, string[]> = {
  'CI/CD': ['CI/CD', 'CICD'],
  'JPA': ['JPA', 'Spring Data JPA'],
  'NGINX': ['NGINX', 'Nginx'],
  'Node.js': ['Node.js', 'NodeJS'],
  'Next.js': ['Next.js', 'NextJS'],
  'NestJS': ['NestJS', 'Nest.js'],
  'PostgreSQL': ['PostgreSQL', 'Postgres'],
  'REST API': ['REST API', 'RESTful API'],
  'Spring Boot': ['Spring Boot'],
  'TypeScript': ['TypeScript', 'TS'],
};

export type OcrFieldKey = 'companyName' | 'position';
export type OcrTagFieldKey = 'requiredSkills' | 'preferredSkills' | 'traits' | 'keywords';

export type OcrFieldEvidence = {
  evidence: string;
  confidence?: number;
  requiresReview: boolean;
};

export type OcrMappingResult = {
  formPatch: Pick<
    JobInput,
    'companyName' | 'position' | 'responsibilities' | 'requiredSkills' | 'preferredSkills' | 'traits' | 'keywords' | 'jobPostingText'
  >;
  fieldEvidence: Partial<Record<OcrFieldKey, OcrFieldEvidence>>;
  tagEvidence: Record<OcrTagFieldKey, Record<string, string>>;
  warnings: string[];
  rawText: string;
};

type FilteredSkillResult = {
  accepted: OcrSkillItem[];
  excludedWarnings: string[];
};

export function normalizeText(text: string) {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasEvidenceInRawText(skillName: string, rawText: string) {
  if (!skillName.trim() || !rawText.trim()) {
    return false;
  }

  return getSkillAliases(skillName).some((alias) => createTermPattern(alias).test(rawText));
}

export function filterSkillsByEvidence(skills: readonly OcrSkillItem[] = [], rawText: string) {
  const seen = new Set<string>();

  return skills.reduce<FilteredSkillResult>(
    (result, skill) => {
      const name = skill.name.trim();
      const key = normalizeText(name);

      if (!name || seen.has(key)) {
        return result;
      }

      seen.add(key);

      if (!skill.evidence?.trim()) {
        result.excludedWarnings.push(`${name}은 근거 문장이 없어 제외되었습니다.`);
        return result;
      }

      if (!hasEvidenceInRawText(name, rawText)) {
        result.excludedWarnings.push(`${name}은 원문 근거가 없어 제외되었습니다.`);
        return result;
      }

      result.accepted.push(skill);
      return result;
    },
    { accepted: [], excludedWarnings: [] },
  );
}

export function mapOcrResultToFormState(response: OcrAnalyzeResponse): OcrMappingResult {
  const rawText = response.rawText || response.jobPostingText || '';
  const warnings = [...(response.warnings ?? [])];
  const fieldEvidence: Partial<Record<OcrFieldKey, OcrFieldEvidence>> = {};
  const tagEvidence: Record<OcrTagFieldKey, Record<string, string>> = {
    requiredSkills: {},
    preferredSkills: {},
    traits: {},
    keywords: {},
  };

  const companyName = mapFieldValue('companyName', response.companyName, fieldEvidence, warnings);
  const position = mapFieldValue('position', response.position, fieldEvidence, warnings);
  const mainTasks = filterEvidenceItems(response.mainTasks, '주요업무', warnings);
  const qualifications = filterEvidenceItems(response.qualifications, '자격요건', warnings);
  const requiredSkills = filterSkillsByEvidence(response.requiredSkills, rawText);
  const preferredSkills = filterSkillsByEvidence(response.preferredSkills, rawText);
  const keywords = filterSkillsByEvidence(response.keywords, rawText);

  warnings.push(...requiredSkills.excludedWarnings, ...preferredSkills.excludedWarnings, ...keywords.excludedWarnings);

  collectTagEvidence('requiredSkills', requiredSkills.accepted, tagEvidence);
  collectTagEvidence('preferredSkills', preferredSkills.accepted, tagEvidence);
  collectTagEvidence('keywords', keywords.accepted, tagEvidence);
  collectEvidenceItemTagEvidence('traits', qualifications, tagEvidence);

  return {
    formPatch: {
      companyName,
      position,
      responsibilities: mainTasks.map((item) => item.value.trim()).join('\n'),
      requiredSkills: requiredSkills.accepted.map((skill) => skill.name.trim()),
      preferredSkills: preferredSkills.accepted.map((skill) => skill.name.trim()),
      traits: qualifications.map((item) => item.value.trim()),
      keywords: keywords.accepted.map((skill) => skill.name.trim()),
      jobPostingText: rawText,
    },
    fieldEvidence,
    tagEvidence,
    warnings: dedupeStrings(warnings),
    rawText,
  };
}

function mapFieldValue(
  key: OcrFieldKey,
  field: OcrField | undefined,
  fieldEvidence: Partial<Record<OcrFieldKey, OcrFieldEvidence>>,
  warnings: string[],
) {
  const value = field?.value.trim() ?? '';
  const evidence = field?.evidence?.trim() ?? '';

  if (!value) {
    return '';
  }

  if (!evidence) {
    warnings.push(`${getFieldLabel(key)}은 근거 문장이 없어 자동 입력하지 않았습니다.`);
    return '';
  }

  const requiresReview = typeof field?.confidence === 'number' && field.confidence < LOW_CONFIDENCE_THRESHOLD;

  if (requiresReview) {
    warnings.push(`${getFieldLabel(key)}의 confidence가 낮아 확인이 필요합니다.`);
  }

  fieldEvidence[key] = {
    evidence,
    confidence: field?.confidence,
    requiresReview,
  };

  return value;
}

function filterEvidenceItems(
  items: readonly OcrEvidenceItem[] = [],
  label: string,
  warnings: string[],
) {
  return items.filter((item) => {
    const value = item.value.trim();
    const evidence = item.evidence?.trim();

    if (!value) {
      return false;
    }

    if (!evidence) {
      warnings.push(`${label} "${value}"은 근거 문장이 없어 제외되었습니다.`);
      return false;
    }

    return true;
  });
}

function collectTagEvidence(
  key: OcrTagFieldKey,
  skills: readonly OcrSkillItem[],
  tagEvidence: Record<OcrTagFieldKey, Record<string, string>>,
) {
  skills.forEach((skill) => {
    tagEvidence[key][skill.name.trim()] = skill.evidence?.trim() ?? '';
  });
}

function collectEvidenceItemTagEvidence(
  key: OcrTagFieldKey,
  items: readonly OcrEvidenceItem[],
  tagEvidence: Record<OcrTagFieldKey, Record<string, string>>,
) {
  items.forEach((item) => {
    tagEvidence[key][item.value.trim()] = item.evidence?.trim() ?? '';
  });
}

function getSkillAliases(skillName: string) {
  return [skillName, ...(SKILL_ALIASES[skillName] ?? [])].filter(
    (alias, index, aliases) => alias.trim() && aliases.indexOf(alias) === index,
  );
}

function createTermPattern(term: string) {
  const escapedParts = term
    .normalize('NFKC')
    .trim()
    .split(/[\s._/+:-]+/)
    .filter(Boolean)
    .map(escapeRegExp);
  const body = escapedParts.join('[\\s._/+:-]*');

  return new RegExp(`(^|[^a-z0-9가-힣])${body}($|[^a-z0-9가-힣])`, 'i');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getFieldLabel(key: OcrFieldKey) {
  return key === 'companyName' ? '회사명' : '지원직무';
}

function dedupeStrings(values: readonly string[]) {
  return values.filter((value, index, array) => value.trim() && array.indexOf(value) === index);
}
