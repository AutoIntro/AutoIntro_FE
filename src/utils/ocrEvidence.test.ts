import { filterSkillsByEvidence, hasEvidenceInRawText } from './ocrEvidence';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const javaBackendRawText = [
  '자바 백엔드 경력 채용',
  '사용 기술: Java/Kotlin, Spring Boot, PostgreSQL, Redis, NGINX, NestJS',
  'RESTful API 설계 원칙에 대한 깊은 이해',
].join('\n');

const filtered = filterSkillsByEvidence(
  [
    { name: 'Java', evidence: 'Java/Kotlin' },
    { name: 'React', evidence: '프론트엔드 프레임워크' },
    { name: 'TypeScript', evidence: '프론트엔드 언어' },
    { name: 'Redux', evidence: '상태 관리' },
    { name: 'Next.js', evidence: 'NestJS' },
    { name: 'REST API', evidence: 'RESTful API 설계 원칙' },
  ],
  javaBackendRawText,
);

assert(hasEvidenceInRawText('NestJS', javaBackendRawText), 'NestJS should match NestJS evidence.');
assert(!hasEvidenceInRawText('Next.js', javaBackendRawText), 'Next.js must not match NestJS.');
assert(!hasEvidenceInRawText('React', javaBackendRawText), 'React must not be inferred from backend text.');
assert(!hasEvidenceInRawText('JavaScript', javaBackendRawText), 'JavaScript must not be inferred from Java.');
assert(
  filtered.accepted.map((skill) => skill.name).join(',') === 'Java,REST API',
  'Only Java and REST API should pass evidence filtering.',
);
