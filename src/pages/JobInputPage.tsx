import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { ROUTES } from '../constants/constants';
import { JOB_POSITION_SUGGESTIONS, type JobPositionSuggestion } from '../constants/jobPositions';
import { useResumeStore } from '../stores/resumeStore';
import type { JobInput, Repository } from '../types/resume';
import styles from './JobInputPage.module.css';

const INITIAL: JobInput = {
  position: '',
  jobPostingImageName: '',
  companyName: '',
  responsibilities: '',
  requiredSkills: [],
  preferredSkills: [],
  traits: [],
  keywords: [],
  techStack: '',
};

const MAX_POSITION_SUGGESTIONS = 10;
const POSITION_SUGGESTION_LIST_ID = 'position-suggestions';
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg'];
const IMAGE_ANALYSIS_STEPS = [
  '이미지 업로드 완료',
  '이미지 내 텍스트 인식 중',
  '회사명, 직무명 추출 중',
  '필수 기술 및 우대 사항 분석 중',
  '입력 폼 자동 채우기 준비 중',
];
const CHOSEONG = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

const DEFAULT_PROFILE: JobAnalysisProfile = {
  position: '백엔드 개발자',
  keywords: ['backend', 'back-end', '백엔드', 'server', '서버', 'api', 'spring', 'java'],
  responsibilities: '서비스 API를 설계하고 데이터베이스, 인증, 배포 환경을 고려해 안정적인 서버 기능을 구현합니다.',
  requiredSkills: ['Java', 'Spring Boot', 'MySQL', 'REST API'],
  preferredSkills: ['AWS', 'Docker', 'CI/CD'],
  traits: ['협업 능력', '문제 해결 능력', '자기주도성'],
};

const JOB_ANALYSIS_PROFILES: JobAnalysisProfile[] = [
  {
    position: 'React 개발자',
    keywords: ['react', 'react.js', 'reactjs', '리액트', 'next.js', 'nextjs'],
    responsibilities: 'React 기반 사용자 화면을 구현하고 API 연동, 상태 관리, 성능 최적화를 통해 제품 경험을 개선합니다.',
    requiredSkills: ['React', 'TypeScript', 'JavaScript', 'HTML/CSS'],
    preferredSkills: ['Next.js', 'Redux', '웹 접근성'],
    traits: ['사용자 중심 사고', '협업 능력', '문제 해결 능력'],
  },
  {
    position: '프론트엔드 개발자',
    keywords: ['frontend', 'front-end', 'front end', '프론트엔드', '프론트'],
    responsibilities: '웹 서비스 화면과 인터랙션을 구현하고 백엔드 API와 연결해 사용자가 안정적으로 기능을 이용하도록 만듭니다.',
    requiredSkills: ['JavaScript', 'TypeScript', 'React', 'HTML/CSS'],
    preferredSkills: ['Next.js', 'Storybook', '테스트 자동화'],
    traits: ['사용자 중심 사고', '꼼꼼함', '협업 능력'],
  },
  {
    position: 'Flutter 개발자',
    keywords: ['flutter', '플러터', 'dart', 'cross platform', '크로스플랫폼'],
    responsibilities: 'Flutter 기반 모바일 앱 화면과 상태 흐름을 구현하고 iOS, Android 양쪽에서 일관된 사용자 경험을 제공합니다.',
    requiredSkills: ['Flutter', 'Dart', 'REST API', 'Git'],
    preferredSkills: ['Firebase', 'iOS', 'Android'],
    traits: ['사용자 중심 사고', '문제 해결 능력', '품질 의식'],
  },
  {
    position: 'iOS 개발자',
    keywords: ['ios', 'swift', 'iphone', '아이오에스', '스위프트'],
    responsibilities: 'iOS 앱 기능을 구현하고 네이티브 UX, API 연동, 앱 성능과 안정성을 개선합니다.',
    requiredSkills: ['Swift', 'UIKit', 'SwiftUI', 'REST API'],
    preferredSkills: ['Combine', 'Firebase', 'App Store 배포'],
    traits: ['품질 의식', '문제 해결 능력', '사용자 중심 사고'],
  },
  {
    position: 'Android 개발자',
    keywords: ['android', '안드로이드', 'kotlin', 'jetpack', 'compose'],
    responsibilities: 'Android 앱 기능을 구현하고 화면 상태, API 연동, 앱 성능과 안정성을 개선합니다.',
    requiredSkills: ['Kotlin', 'Android', 'Jetpack Compose', 'REST API'],
    preferredSkills: ['Coroutine', 'Firebase', 'Play Store 배포'],
    traits: ['품질 의식', '문제 해결 능력', '사용자 중심 사고'],
  },
  {
    position: '백엔드 개발자',
    keywords: ['backend', 'back-end', 'back end', '백엔드', 'server', '서버', 'spring', 'java', 'node.js'],
    responsibilities: '서비스 API와 데이터 모델을 설계하고 장애에 강한 서버 로직과 운영 가능한 백엔드 시스템을 구현합니다.',
    requiredSkills: ['Java', 'Spring Boot', 'MySQL', 'REST API'],
    preferredSkills: ['AWS', 'Docker', 'Redis'],
    traits: ['문제 해결 능력', '책임감', '협업 능력'],
  },
  {
    position: '클라우드 엔지니어',
    keywords: ['cloud', '클라우드', 'aws', 'azure', 'gcp', 'infrastructure', 'infra', '인프라'],
    responsibilities: '클라우드 인프라를 설계하고 배포, 모니터링, 보안 설정을 자동화해 서비스 운영 안정성을 높입니다.',
    requiredSkills: ['AWS', 'Linux', 'Docker', 'Terraform'],
    preferredSkills: ['Kubernetes', 'CI/CD', '모니터링'],
    traits: ['안정성 중심 사고', '문제 해결 능력', '책임감'],
  },
  {
    position: 'DevOps 엔지니어',
    keywords: ['devops', 'dev ops', '데브옵스', 'ci/cd', 'cicd', 'kubernetes', 'docker'],
    responsibilities: '빌드, 배포, 모니터링 파이프라인을 자동화하고 개발팀이 빠르고 안정적으로 릴리즈할 수 있는 환경을 만듭니다.',
    requiredSkills: ['Docker', 'Kubernetes', 'GitHub Actions', 'Linux'],
    preferredSkills: ['AWS', 'Terraform', 'Prometheus'],
    traits: ['자동화 사고', '문제 해결 능력', '협업 능력'],
  },
  {
    position: '데이터 엔지니어',
    keywords: ['data engineer', '데이터 엔지니어', 'etl', 'pipeline', '파이프라인', 'spark', 'airflow'],
    responsibilities: '데이터 수집, 적재, 변환 파이프라인을 구축하고 분석과 서비스에 필요한 데이터 품질을 관리합니다.',
    requiredSkills: ['Python', 'SQL', 'Airflow', 'ETL'],
    preferredSkills: ['Spark', 'Kafka', 'AWS'],
    traits: ['정확성', '문제 해결 능력', '책임감'],
  },
  {
    position: '머신러닝 엔지니어',
    keywords: ['machine learning', 'ml engineer', '머신러닝', 'ai', '인공지능', 'deep learning', '딥러닝'],
    responsibilities: '모델 학습과 평가, 서빙 파이프라인을 구축하고 실제 서비스 지표를 기준으로 AI 기능을 개선합니다.',
    requiredSkills: ['Python', 'Machine Learning', 'PyTorch', 'SQL'],
    preferredSkills: ['MLOps', 'Docker', 'AWS'],
    traits: ['실험 설계 역량', '문제 해결 능력', '데이터 기반 사고'],
  },
  {
    position: 'QA 엔지니어',
    keywords: ['qa', 'quality assurance', 'test automation', '테스트', '품질'],
    responsibilities: '테스트 계획을 수립하고 주요 사용자 흐름과 회귀 테스트를 자동화해 제품 품질을 안정적으로 관리합니다.',
    requiredSkills: ['테스트 설계', 'Jira', 'API 테스트', '품질 관리'],
    preferredSkills: ['Playwright', 'Cypress', '테스트 자동화'],
    traits: ['꼼꼼함', '품질 의식', '커뮤니케이션'],
  },
  {
    position: '보안 엔지니어',
    keywords: ['security', '보안', 'cybersecurity', 'appsec', 'devsecops'],
    responsibilities: '서비스와 인프라의 보안 위험을 점검하고 취약점 대응, 접근 제어, 보안 정책 개선을 수행합니다.',
    requiredSkills: ['보안 점검', '네트워크', 'Linux', '취약점 분석'],
    preferredSkills: ['DevSecOps', '클라우드 보안', '침투 테스트'],
    traits: ['책임감', '분석력', '문제 해결 능력'],
  },
  {
    position: '프로덕트 매니저 (PM)',
    keywords: ['product manager', 'pm', '프로덕트 매니저', '제품 관리자', '서비스 기획', '기획자'],
    responsibilities: '사용자 문제를 정의하고 요구사항, 우선순위, 지표를 정리해 개발팀과 함께 제품 개선을 이끕니다.',
    requiredSkills: ['요구사항 정의', '데이터 분석', '커뮤니케이션', '제품 기획'],
    preferredSkills: ['SQL', 'Figma', 'Jira'],
    traits: ['문제 정의 능력', '협업 능력', '사용자 중심 사고'],
  },
];

const TECH_KEYWORDS = [
  'React',
  'TypeScript',
  'JavaScript',
  'Next.js',
  'Vue.js',
  'Node.js',
  'Java',
  'Spring Boot',
  'Kotlin',
  'Python',
  'Django',
  'FastAPI',
  'Go',
  'MySQL',
  'PostgreSQL',
  'MongoDB',
  'Redis',
  'AWS',
  'Azure',
  'GCP',
  'Docker',
  'Kubernetes',
  'Terraform',
  'GitHub Actions',
  'CI/CD',
  'Flutter',
  'Dart',
  'Swift',
  'iOS',
  'Android',
  'Firebase',
  'PyTorch',
  'TensorFlow',
  'SQL',
  'Airflow',
  'Kafka',
  'Spark',
  'Linux',
  'Figma',
  'Jira',
] as const;

type TextFieldKey = 'position' | 'companyName' | 'responsibilities' | 'techStack';
type TagFieldKey = 'requiredSkills' | 'preferredSkills' | 'traits' | 'keywords';

type PositionSearchTarget = {
  value: string;
  priority: number;
};

type JobAnalysisProfile = {
  position: string;
  keywords: string[];
  responsibilities: string;
  requiredSkills: string[];
  preferredSkills: string[];
  traits: string[];
};

type JobPostingAnalysis = Pick<
  JobInput,
  'companyName' | 'position' | 'responsibilities' | 'requiredSkills' | 'preferredSkills' | 'traits' | 'keywords'
>;

const POSITION_SEARCH_INDEX = JOB_POSITION_SUGGESTIONS.map((suggestion, index) => ({
  suggestion,
  index,
  targets: buildPositionSearchTargets(suggestion),
}));

export default function JobInputPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setJobInput = useResumeStore((s) => s.setJobInput);
  const selectedRepositories = useResumeStore((s) => s.selectedRepositories);

  const [form, setForm] = useState<JobInput>(INITIAL);
  const [postingImage, setPostingImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [analysisError, setAnalysisError] = useState('');
  const [hasAnalysisCompleted, setHasAnalysisCompleted] = useState(false);
  const [isPositionFocused, setIsPositionFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const ownedTechStack = useMemo(() => parseTags(form.techStack), [form.techStack]);
  const positionSuggestions = useMemo(
    () => getPositionSuggestions(form.position),
    [form.position],
  );
  const activePositionSuggestionIndex = Math.min(
    activeSuggestionIndex,
    positionSuggestions.length - 1,
  );
  const showPositionSuggestions =
    isPositionFocused &&
    form.position.trim() !== '' &&
    positionSuggestions.length > 0;
  const hasAnalysisResult =
    form.companyName.trim() !== '' ||
    form.responsibilities.trim() !== '' ||
    form.requiredSkills.length > 0 ||
    form.preferredSkills.length > 0 ||
    form.traits.length > 0;
  const isValid =
    form.position.trim() !== '' &&
    form.jobPostingImageName.trim() !== '' &&
    ownedTechStack.length > 0 &&
    !isAnalyzing;

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [form.position]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  if (selectedRepositories.length === 0) {
    return (
      <div className={styles.guard}>
        <p className={styles.guardMsg}>먼저 레포지토리를 선택해야 합니다.</p>
        <Button onClick={() => navigate(ROUTES.REPOSITORIES)}>레포지토리 선택하러 가기</Button>
      </div>
    );
  }

  const updateFormField = <Key extends keyof JobInput>(key: Key, value: JobInput[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTextChange =
    (key: TextFieldKey) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateFormField(key, event.target.value);

      if (key === 'position') {
        setIsPositionFocused(true);
      }
    };

  const updateTagField = (key: TagFieldKey, values: string[]) => {
    updateFormField(key, normalizeTags(values));
  };

  const updateOwnedTechStack = (values: string[]) => {
    updateFormField('techStack', formatTags(values));
  };

  const loadGitHubSkills = () => {
    updateOwnedTechStack(mergeTags(ownedTechStack, getRepositorySkillHints(selectedRepositories)));
  };

  const selectPosition = (position: string) => {
    updateFormField('position', position);
    setIsPositionFocused(false);
    setActiveSuggestionIndex(0);
  };

  const handlePositionKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || !showPositionSuggestions) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestionIndex((current) =>
        current >= positionSuggestions.length - 1 ? 0 : current + 1,
      );
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestionIndex((current) =>
        current <= 0 ? positionSuggestions.length - 1 : current - 1,
      );
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      selectPosition(positionSuggestions[activePositionSuggestionIndex].label);
    }

    if (event.key === 'Escape') {
      setIsPositionFocused(false);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectImageFile(event.target.files);
    event.target.value = '';
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    selectImageFile(event.dataTransfer.files);
  };

  const selectImageFile = (files: FileList | null) => {
    const file = files?.[0];

    if (!file) {
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setAnalysisError('PNG, JPG, JPEG 파일만 업로드할 수 있습니다.');
      return;
    }

    setPostingImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setAnalysisError('');
    setAnalysisStepIndex(0);
    setHasAnalysisCompleted(false);
    setForm((prev) => ({
      ...prev,
      jobPostingImageName: file.name,
      companyName: '',
      position: '',
      responsibilities: '',
      requiredSkills: [],
      preferredSkills: [],
      traits: [],
      keywords: [],
    }));
  };

  const analyzeImage = async () => {
    if (!postingImage) {
      setAnalysisError('채용공고 이미지를 먼저 업로드해 주세요.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');
    setHasAnalysisCompleted(false);

    try {
      for (let index = 1; index < IMAGE_ANALYSIS_STEPS.length; index += 1) {
        setAnalysisStepIndex(index);
        await wait(index === 1 ? 450 : 560);
      }

      const analysis = createJobPostingAnalysis({
        imageName: postingImage.name,
        selectedRepositories,
      });

      setForm((prev) => {
        const nextOwnedSkills = mergeTags(
          parseTags(prev.techStack),
          getRepositorySkillHints(selectedRepositories),
          analysis.requiredSkills.slice(0, 5),
        );

        return {
          ...prev,
          ...analysis,
          jobPostingImageName: postingImage.name,
          techStack: formatTags(nextOwnedSkills),
        };
      });
      setHasAnalysisCompleted(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = () => {
    setJobInput({
      ...form,
      position: form.position.trim(),
      jobPostingImageName: form.jobPostingImageName.trim(),
      companyName: form.companyName.trim(),
      responsibilities: form.responsibilities.trim(),
      requiredSkills: normalizeTags(form.requiredSkills),
      preferredSkills: normalizeTags(form.preferredSkills),
      traits: normalizeTags(form.traits),
      keywords: normalizeTags(form.keywords),
      techStack: formatTags(ownedTechStack),
    });
    navigate(ROUTES.LOADING);
  };

  return (
    <section className={styles.page}>
      <StepHeader />

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>자기소개서 설정</h1>
        <p className={styles.pageDesc}>
          채용공고 이미지를 업로드하면 AI가 공고 내용을 분석하여 필요한 항목을 자동으로 채워줍니다.
        </p>
      </div>

      <Card className={styles.formCard}>
        <div className={styles.section}>
          <SectionHeader
            number="1"
            title="채용공고 이미지 업로드"
            required
            description="채용공고 화면을 캡처하거나 저장한 이미지를 업로드해주세요."
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className={styles.visuallyHidden}
            onChange={handleFileInputChange}
          />

          <div
            className={[styles.uploadDropzone, isDragging ? styles.dragging : ''].join(' ')}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className={styles.uploadIcon} aria-hidden="true">
              <ImageIcon />
            </div>
            <div>
              <strong>채용공고 이미지를 업로드하세요</strong>
              <p>PNG, JPG, JPEG 파일 지원</p>
              <p>또는 이미지를 이 영역에 끌어다 놓기</p>
            </div>
            <Button variant="secondary" onClick={openFilePicker}>
              이미지 선택하기
            </Button>
          </div>

          {postingImage && imagePreviewUrl && (
            <div className={styles.previewPanel}>
              <div>
                <h3 className={styles.panelTitle}>업로드된 이미지 미리보기</h3>
                <div className={styles.previewFrame}>
                  <img src={imagePreviewUrl} alt="업로드된 채용공고 이미지 미리보기" />
                </div>
              </div>
              <div className={styles.previewMeta}>
                <p>
                  파일명: <strong>{postingImage.name}</strong>
                </p>
                <div className={styles.previewActions}>
                  <Button variant="secondary" onClick={openFilePicker}>
                    다른 이미지 선택
                  </Button>
                  <Button disabled={isAnalyzing} onClick={() => void analyzeImage()}>
                    {isAnalyzing ? '분석 중...' : '공고 이미지 분석'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.qualityGuide}>
            <h3>이미지 업로드 안내</h3>
            <ul>
              <li>글자가 선명하게 보이는 이미지를 사용해주세요.</li>
              <li>화면 전체 캡처보다 공고 본문 영역만 캡처하면 분석 정확도가 높아집니다.</li>
              <li>현재는 대표 이미지 1장을 업로드해주세요.</li>
              <li>흐릿한 이미지나 글자가 작은 이미지는 분석 결과가 부정확할 수 있습니다.</li>
            </ul>
          </div>

          {(postingImage || isAnalyzing || hasAnalysisCompleted) && (
            <ImageAnalysisStatus
              activeIndex={analysisStepIndex}
              isAnalyzing={isAnalyzing}
              isComplete={hasAnalysisCompleted}
            />
          )}

          {analysisError && <p className={styles.errorText}>{analysisError}</p>}
        </div>

        <div className={styles.divider} />

        <div className={styles.section}>
          <SectionHeader
            number="2"
            title="자동 분석 결과"
            description="이미지 분석이 완료되면 아래 항목이 자동으로 입력됩니다. 필요하면 직접 수정할 수 있습니다."
          />

          {!hasAnalysisResult && (
            <p className={styles.resultHint}>
              채용공고 이미지를 업로드하면 분석 결과가 이곳에 자동으로 입력됩니다.
            </p>
          )}

          <div className={styles.analysisGrid}>
            <TextInputField
              label="회사명"
              badge="AI 이미지 분석"
              name="companyName"
              placeholder="자동 입력 / 수정 가능"
              value={form.companyName}
              onChange={handleTextChange('companyName')}
            />

            <div className={styles.autocomplete}>
              <label htmlFor="position" className={styles.label}>
                지원 직무 <span className={styles.aiBadge}>AI 이미지 분석</span>
              </label>
              <input
                id="position"
                name="position"
                className={styles.control}
                placeholder="예: 백엔드 개발자, 프론트엔드 개발자, 클라우드 엔지니어"
                value={form.position}
                onChange={handleTextChange('position')}
                onFocus={() => setIsPositionFocused(true)}
                onBlur={() => setIsPositionFocused(false)}
                onKeyDown={handlePositionKeyDown}
                role="combobox"
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls={showPositionSuggestions ? POSITION_SUGGESTION_LIST_ID : undefined}
                aria-expanded={showPositionSuggestions}
                aria-activedescendant={
                  showPositionSuggestions
                    ? getPositionSuggestionOptionId(activePositionSuggestionIndex)
                    : undefined
                }
              />

              {showPositionSuggestions && (
                <ul
                  id={POSITION_SUGGESTION_LIST_ID}
                  className={styles.suggestionList}
                  role="listbox"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {positionSuggestions.map((position, index) => (
                    <li key={position.label} role="presentation">
                      <button
                        id={getPositionSuggestionOptionId(index)}
                        type="button"
                        className={[
                          styles.suggestionOption,
                          index === activePositionSuggestionIndex ? styles.activeSuggestion : '',
                        ].join(' ')}
                        role="option"
                        aria-selected={index === activePositionSuggestionIndex}
                        onMouseEnter={() => setActiveSuggestionIndex(index)}
                        onClick={() => selectPosition(position.label)}
                      >
                        {position.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.wideField}>
              <label htmlFor="responsibilities" className={styles.label}>
                주요 업무 <span className={styles.aiBadge}>AI 이미지 분석</span>
              </label>
              <textarea
                id="responsibilities"
                name="responsibilities"
                className={[styles.control, styles.textareaControl].join(' ')}
                placeholder="자동 입력 / 수정 가능"
                value={form.responsibilities}
                onChange={handleTextChange('responsibilities')}
              />
            </div>

            <TagEditor
              label="필수 기술"
              badge="AI 추출"
              values={form.requiredSkills}
              placeholder="예: Java, Spring Boot, MySQL, AWS"
              onChange={(values) => updateTagField('requiredSkills', values)}
            />

            <TagEditor
              label="우대 기술"
              badge="AI 추출"
              values={form.preferredSkills}
              placeholder="예: Docker, Kubernetes, CI/CD"
              onChange={(values) => updateTagField('preferredSkills', values)}
            />

            <TagEditor
              label="인재상 / 자격요건"
              badge="AI 추출"
              values={form.traits}
              placeholder="예: 협업 능력, 문제 해결 능력"
              onChange={(values) => updateTagField('traits', values)}
            />

            <TagEditor
              label="핵심 키워드"
              badge="AI 추출"
              values={form.keywords}
              placeholder="예: 백엔드, API, 클라우드"
              onChange={(values) => updateTagField('keywords', values)}
            />
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.section}>
          <SectionHeader
            number="3"
            title="내 보유 기술스택"
            required
            description="GitHub 분석 결과와 자기소개서에 강조할 기술을 선택하거나 입력해주세요."
          />

          <div className={styles.loadSkillsRow}>
            <Button variant="secondary" onClick={loadGitHubSkills}>
              GitHub 분석 기술 불러오기
            </Button>
          </div>

          <TagEditor
            label="강조할 기술스택"
            values={ownedTechStack}
            placeholder="예: React, TypeScript, Spring Boot, MySQL, Docker, AWS"
            onChange={updateOwnedTechStack}
          />
        </div>
      </Card>

      <div className={styles.selectedRepos}>
        {selectedRepositories.map((repo) => (
          <span key={repo.id}>{repo.name}</span>
        ))}
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.bottomInner}>
          <Button variant="ghost" onClick={() => navigate(ROUTES.REPOSITORIES)}>
            이전
          </Button>
          <Button disabled={!isValid} onClick={handleSubmit}>
            이 내용으로 자기소개서 생성
            <ArrowRightIcon />
          </Button>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  number,
  title,
  description,
  required = false,
}: {
  number: string;
  title: string;
  description: string;
  required?: boolean;
}) {
  return (
    <div>
      <h2 className={styles.sectionTitle}>
        <span className={styles.sectionNumber}>{number}</span>
        {title}
        {required && <span className={styles.requiredMark}>*</span>}
      </h2>
      <p className={styles.sectionDesc}>{description}</p>
    </div>
  );
}

function TextInputField({
  label,
  badge,
  name,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  badge?: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={name} className={styles.label}>
        {label}
        {badge && <span className={styles.aiBadge}>{badge}</span>}
      </label>
      <input
        id={name}
        name={name}
        className={styles.control}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function ImageAnalysisStatus({
  activeIndex,
  isAnalyzing,
  isComplete,
}: {
  activeIndex: number;
  isAnalyzing: boolean;
  isComplete: boolean;
}) {
  const message = isComplete
    ? '이미지 분석이 완료되었습니다. 자동 입력된 내용을 확인하고 필요한 경우 수정해주세요.'
    : isAnalyzing
      ? 'AI가 채용공고 이미지의 텍스트를 읽고 있습니다.'
      : '이미지가 업로드되었습니다. 공고 이미지 분석 버튼을 눌러주세요.';

  return (
    <div className={styles.visionStatus} role="status" aria-live="polite">
      <div className={styles.visionStatusHeader}>
        <h3>이미지 분석 진행 상태</h3>
        {isAnalyzing && <span className={styles.statusSpinner} aria-hidden="true" />}
      </div>
      <p>{message}</p>
      <ol className={styles.visionStepList}>
        {IMAGE_ANALYSIS_STEPS.map((step, index) => {
          const isActive = isAnalyzing && index === activeIndex;
          const isDone = isComplete || index < activeIndex || (!isAnalyzing && index === 0);

          return (
            <li
              key={step}
              className={[
                styles.visionStep,
                isDone ? styles.visionDone : '',
                isActive ? styles.visionActive : '',
              ].join(' ')}
            >
              <span>{isDone ? <CheckIcon /> : index + 1}</span>
              {step}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TagEditor({
  label,
  badge,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  badge?: string;
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const addDraft = () => {
    const nextTags = parseTags(draft);

    if (nextTags.length === 0) {
      return;
    }

    onChange(mergeTags(values, nextTags));
    setDraft('');
  };

  const removeTag = (target: string) => {
    onChange(values.filter((value) => value !== target));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addDraft();
    }
  };

  return (
    <div className={styles.tagField}>
      <label className={styles.label}>
        {label}
        {badge && <span className={styles.aiBadge}>{badge}</span>}
      </label>
      <div className={styles.tagBox}>
        {values.map((value) => (
          <span key={value} className={styles.tag}>
            {value}
            <button
              type="button"
              className={styles.tagRemove}
              aria-label={`${value} 삭제`}
              onClick={() => removeTag(value)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className={styles.tagInput}
          value={draft}
          placeholder={values.length === 0 ? placeholder : ''}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className={styles.addTagButton}
          disabled={draft.trim() === ''}
          onClick={addDraft}
        >
          + 추가
        </button>
      </div>
    </div>
  );
}

function StepHeader() {
  return (
    <div className={styles.steps} aria-label="자기소개서 생성 단계">
      <div className={styles.step}>
        <span className={styles.stepDone}>
          <CheckIcon />
        </span>
        <span>레포지토리 선택</span>
      </div>
      <span className={styles.stepLine} />
      <div className={styles.step}>
        <span className={styles.stepActive}>2</span>
        <span>설정</span>
      </div>
    </div>
  );
}

function ImageIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h16v14H4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m4 16 4.5-4.5 3.5 3.5 2-2L20 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 9.5h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function createJobPostingAnalysis({
  imageName,
  selectedRepositories,
}: {
  imageName: string;
  selectedRepositories: Repository[];
}): JobPostingAnalysis {
  const profile = inferJobProfile(imageName);
  const detectedSkills = extractKnownSkills(imageName);
  const requiredSkills = mergeTags(profile.requiredSkills, detectedSkills).slice(0, 8);
  const preferredSkills = mergeTags(profile.preferredSkills, getCloudOrOpsHints(imageName)).slice(0, 8);
  const traits = mergeTags(profile.traits, ['협업 능력', '문제 해결 능력', '자기주도성']).slice(0, 6);
  const repositoryKeywords = getRepositorySkillHints(selectedRepositories).slice(0, 4);
  const keywords = mergeTags(
    [profile.position],
    requiredSkills.slice(0, 4),
    preferredSkills.slice(0, 3),
    repositoryKeywords,
    traits.slice(0, 2),
  ).slice(0, 10);

  return {
    companyName: inferCompanyNameFromImageName(imageName),
    position: profile.position,
    responsibilities: profile.responsibilities,
    requiredSkills,
    preferredSkills,
    traits,
    keywords,
  };
}

function inferJobProfile(sourceValue: string) {
  const normalizedSource = normalizeSearchText(sourceValue);

  return (
    JOB_ANALYSIS_PROFILES.find((profile) =>
      profile.keywords.some((keyword) =>
        normalizedSource.includes(normalizeSearchText(keyword)),
      ),
    ) ?? DEFAULT_PROFILE
  );
}

function extractKnownSkills(sourceValue: string) {
  const normalizedSource = normalizeSearchText(sourceValue);

  return TECH_KEYWORDS.filter((skill) =>
    normalizedSource.includes(normalizeSearchText(skill)),
  );
}

function getCloudOrOpsHints(sourceValue: string) {
  const normalizedSource = normalizeSearchText(sourceValue);
  const hints: string[] = [];

  if (normalizedSource.includes('aws')) hints.push('AWS');
  if (normalizedSource.includes('docker')) hints.push('Docker');
  if (normalizedSource.includes('kubernetes') || normalizedSource.includes('k8s')) {
    hints.push('Kubernetes');
  }
  if (normalizedSource.includes('cicd') || normalizedSource.includes('githubactions')) {
    hints.push('CI/CD');
  }

  return hints;
}

function inferCompanyNameFromImageName(imageName: string) {
  const normalizedName = normalizeSearchText(imageName);
  const knownCompanies: Array<[string, string]> = [
    ['kakao', 'Kakao'],
    ['naver', 'NAVER'],
    ['line', 'LINE'],
    ['coupang', 'Coupang'],
    ['toss', 'Toss'],
    ['woowahan', '우아한형제들'],
    ['baemin', '우아한형제들'],
    ['danggeun', '당근'],
    ['carrot', '당근'],
    ['wanted', 'Wanted'],
    ['programmers', 'Programmers'],
    ['jumpit', 'Jumpit'],
  ];
  const matchedCompany = knownCompanies.find(([keyword]) => normalizedName.includes(keyword));

  return matchedCompany?.[1] ?? '채용공고 회사';
}

function getRepositorySkillHints(repositories: Repository[]) {
  return normalizeTags(
    repositories.flatMap((repo) => [
      repo.language,
      ...extractKnownSkills(`${repo.name} ${repo.description}`),
    ]),
  );
}

function getPositionSuggestions(query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery === '') {
    return [];
  }

  const matches: Array<{ suggestion: JobPositionSuggestion; index: number; score: number }> = [];

  POSITION_SEARCH_INDEX.forEach(({ suggestion, index, targets }) => {
    const score = getPositionMatchScore(targets, normalizedQuery);

    if (score !== null) {
      matches.push({ suggestion, index, score });
    }
  });

  return matches
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, MAX_POSITION_SUGGESTIONS)
    .map((item) => item.suggestion);
}

function getPositionMatchScore(targets: PositionSearchTarget[], normalizedQuery: string) {
  let score: number | null = null;

  targets.forEach((target) => {
    if (target.value === normalizedQuery) {
      score = Math.min(score ?? Number.POSITIVE_INFINITY, target.priority);
      return;
    }

    if (target.value.startsWith(normalizedQuery)) {
      score = Math.min(score ?? Number.POSITIVE_INFINITY, target.priority + 1);
      return;
    }

    if (target.value.includes(normalizedQuery)) {
      score = Math.min(score ?? Number.POSITIVE_INFINITY, target.priority + 2);
    }
  });

  return score;
}

function buildPositionSearchTargets(suggestion: JobPositionSuggestion) {
  return [suggestion.label, ...suggestion.aliases].flatMap((target, index) => {
    const basePriority = index === 0 || hasHangul(target) ? 0 : 3;

    return [
      { value: normalizeSearchText(target), priority: basePriority },
      { value: normalizeSearchText(extractInitialConsonants(target)), priority: basePriority + 5 },
    ];
  });
}

function parseTags(value: string) {
  return normalizeTags(value.split(/[,，\n]/));
}

function formatTags(values: string[]) {
  return normalizeTags(values).join(', ');
}

function mergeTags(...groups: Array<readonly string[]>) {
  return normalizeTags(groups.flat());
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

function hasHangul(value: string) {
  return /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(value);
}

function extractInitialConsonants(value: string) {
  return Array.from(value)
    .map((char) => {
      const code = char.charCodeAt(0) - 0xac00;

      if (code < 0 || code > 11171) {
        return char;
      }

      return CHOSEONG[Math.floor(code / 588)];
    })
    .join('');
}

function getPositionSuggestionOptionId(index: number) {
  return `position-suggestion-${index}`;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
