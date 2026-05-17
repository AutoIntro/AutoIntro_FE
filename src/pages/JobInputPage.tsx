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
import { apiClient } from '../api/client';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { ROUTES } from '../constants/constants';
import { JOB_POSITION_SUGGESTIONS, type JobPositionSuggestion } from '../constants/jobPositions';
import { useResumeStore } from '../stores/resumeStore';
import type { JobInput, OcrAnalyzeResponse, Repository, RepositoryMatch } from '../types/resume';
import {
  mapOcrResultToFormState,
  type OcrFieldEvidence,
  type OcrFieldKey,
  type OcrTagFieldKey,
} from '../utils/ocrEvidence';
import { rankRepositoriesForJob } from '../utils/repositoryMatching';
import styles from './JobInputPage.module.css';

const INITIAL: JobInput = {
  position: '',
  jobPostingImageName: '',
  jobPostingText: '',
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
const MAX_JOB_POSTING_IMAGES = 2;
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

const SETUP_STEPS = [
  { id: 'upload', number: '1', title: '채용 공고 이미지 업로드' },
  { id: 'analysis', number: '2', title: '자동분석 결과' },
  { id: 'skills', number: '3', title: '기술 스택' },
] as const;

type SetupStepId = (typeof SETUP_STEPS)[number]['id'];

const EMPTY_TAG_EVIDENCE: Record<OcrTagFieldKey, Record<string, string>> = {
  requiredSkills: {},
  preferredSkills: {},
  traits: {},
  keywords: {},
};

const POSITION_SEARCH_INDEX = JOB_POSITION_SUGGESTIONS.map((suggestion, index) => ({
  suggestion,
  index,
  targets: buildPositionSearchTargets(suggestion),
}));

export default function JobInputPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewUrlsRef = useRef<string[]>([]);
  const setJobInput = useResumeStore((s) => s.setJobInput);
  const setRepositoryMatches = useResumeStore((s) => s.setRepositoryMatches);
  const selectedRepositories = useResumeStore((s) => s.selectedRepositories);

  const [form, setForm] = useState<JobInput>(INITIAL);
  const [postingImages, setPostingImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [analysisError, setAnalysisError] = useState('');
  const [hasAnalysisCompleted, setHasAnalysisCompleted] = useState(false);
  const [isPositionFocused, setIsPositionFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [activeSetupStep, setActiveSetupStep] = useState<SetupStepId>('upload');
  const [ocrResult, setOcrResult] = useState<OcrAnalyzeResponse | null>(null);
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const [fieldEvidence, setFieldEvidence] = useState<Partial<Record<OcrFieldKey, OcrFieldEvidence>>>({});
  const [tagEvidence, setTagEvidence] =
    useState<Record<OcrTagFieldKey, Record<string, string>>>(EMPTY_TAG_EVIDENCE);
  const [showRawText, setShowRawText] = useState(false);

  const ownedTechStack = useMemo(() => parseTags(form.techStack), [form.techStack]);
  const positionSuggestions = useMemo(
    () => getPositionSuggestions(form.position),
    [form.position],
  );
  const repositoryMatches = useMemo(
    () => rankRepositoriesForJob(form, selectedRepositories),
    [form, selectedRepositories],
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
  const completedSetupSteps: SetupStepId[] = [
    ...(postingImages.length > 0 ? (['upload'] as const) : []),
    ...(hasAnalysisResult ? (['analysis'] as const) : []),
    ...(ownedTechStack.length > 0 ? (['skills'] as const) : []),
  ];

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [form.position]);

  useEffect(() => {
    imagePreviewUrlsRef.current = imagePreviewUrls;
  }, [imagePreviewUrls]);

  useEffect(() => {
    return () => {
      imagePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

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

  const resetAnalysisStateForImages = (images: File[]) => {
    setAnalysisStepIndex(0);
    setHasAnalysisCompleted(false);
    setActiveSetupStep('upload');
    setOcrResult(null);
    setOcrWarnings([]);
    setFieldEvidence({});
    setTagEvidence(EMPTY_TAG_EVIDENCE);
    setShowRawText(false);
    setForm((prev) => ({
      ...prev,
      jobPostingImageName: images.map((file) => file.name).join(', '),
      companyName: '',
      position: '',
      responsibilities: '',
      requiredSkills: [],
      preferredSkills: [],
      traits: [],
      keywords: [],
      jobPostingText: '',
    }));
  };

  const selectImageFile = (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    if (selectedFiles.some((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type))) {
      setAnalysisError('PNG, JPG, JPEG 파일만 업로드할 수 있습니다.');
      return;
    }

    if (postingImages.length >= MAX_JOB_POSTING_IMAGES) {
      setAnalysisError(`이미지는 최대 ${MAX_JOB_POSTING_IMAGES}장까지 업로드할 수 있습니다.`);
      return;
    }

    const imageKeys = new Set(postingImages.map(getImageFileKey));
    const addedImages: File[] = [];

    selectedFiles.forEach((file) => {
      const key = getImageFileKey(file);

      if (imageKeys.has(key) || postingImages.length + addedImages.length >= MAX_JOB_POSTING_IMAGES) {
        return;
      }

      imageKeys.add(key);
      addedImages.push(file);
    });

    if (addedImages.length === 0) {
      setAnalysisError('이미 선택된 이미지이거나 업로드 가능한 개수를 초과했습니다.');
      return;
    }

    const nextImages = [...postingImages, ...addedImages];
    const nextPreviewUrls = [
      ...imagePreviewUrls,
      ...addedImages.map((file) => URL.createObjectURL(file)),
    ];

    setPostingImages(nextImages);
    setImagePreviewUrls(nextPreviewUrls);
    setAnalysisError(
      selectedFiles.length > addedImages.length
        ? `최대 ${MAX_JOB_POSTING_IMAGES}장까지만 분석합니다. 추가 가능한 이미지만 반영했어요.`
        : '',
    );
    resetAnalysisStateForImages(nextImages);
  };

  const removePostingImage = (targetIndex: number) => {
    const removedPreviewUrl = imagePreviewUrls[targetIndex];
    const nextImages = postingImages.filter((_, index) => index !== targetIndex);
    const nextPreviewUrls = imagePreviewUrls.filter((_, index) => index !== targetIndex);

    if (removedPreviewUrl) {
      URL.revokeObjectURL(removedPreviewUrl);
    }

    setPostingImages(nextImages);
    setImagePreviewUrls(nextPreviewUrls);
    setAnalysisError('');
    resetAnalysisStateForImages(nextImages);
  };

  const analyzeImage = async () => {
    if (postingImages.length === 0) {
      setAnalysisError('채용공고 이미지를 먼저 업로드해 주세요.');
      setActiveSetupStep('upload');
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

      const { data } = await apiClient.analyzeJobPostingImages(postingImages);
      const mappedResult = mapOcrResultToFormState(data);

      setForm((prev) => {
        const nextOwnedSkills = mergeTags(
          parseTags(prev.techStack),
          getRepositorySkillHints(selectedRepositories),
        );

        return {
          ...prev,
          ...mappedResult.formPatch,
          jobPostingImageName: postingImages.map((image) => image.name).join(', '),
          techStack: formatTags(nextOwnedSkills),
        };
      });
      setOcrResult(data);
      setOcrWarnings(mappedResult.warnings);
      setFieldEvidence(mappedResult.fieldEvidence);
      setTagEvidence(mappedResult.tagEvidence);
      setHasAnalysisCompleted(true);
      setActiveSetupStep('analysis');
    } catch (err) {
      console.error(err);
      setAnalysisError(err instanceof Error ? err.message : '채용공고 OCR 처리에 실패했습니다.');
      setHasAnalysisCompleted(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = () => {
    setRepositoryMatches(repositoryMatches);
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
      jobPostingText: form.jobPostingText?.trim() ?? '',
    });
    navigate(ROUTES.LOADING);
  };

  const handlePreviousAction = () => {
    if (activeSetupStep === 'upload') {
      navigate(ROUTES.REPOSITORIES);
      return;
    }

    const activeIndex = SETUP_STEPS.findIndex((step) => step.id === activeSetupStep);
    setActiveSetupStep(SETUP_STEPS[Math.max(activeIndex - 1, 0)].id);
  };

  return (
    <section className={styles.page}>
      <StepHeader
        activeStep={activeSetupStep}
        completedSteps={completedSetupSteps}
        onSelect={setActiveSetupStep}
      />

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>자기소개서 설정</h1>
        <p className={styles.pageDesc}>
          채용공고 이미지 업로드부터 자동분석 결과 확인, 기술 스택 정리까지 단계별로 진행합니다.
        </p>
      </div>

      <Card className={styles.formCard}>
        {activeSetupStep === 'upload' && (
          <div className={styles.section}>
            <SectionHeader
              number="1"
              title="채용공고 이미지 업로드"
              required
              description="같은 채용공고의 연속 이미지를 상단부터 순서대로 최대 2장까지 업로드해주세요."
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              multiple
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
                <p>같은 공고의 연속 캡처를 최대 2장까지 선택할 수 있습니다.</p>
              </div>
              <Button
                variant="secondary"
                disabled={postingImages.length >= MAX_JOB_POSTING_IMAGES || isAnalyzing}
                onClick={openFilePicker}
              >
                {postingImages.length >= MAX_JOB_POSTING_IMAGES ? '최대 2장 선택됨' : '이미지 선택하기'}
              </Button>
            </div>

            {postingImages.length > 0 && imagePreviewUrls.length > 0 && (
              <div className={styles.previewPanel}>
                <div>
                  <h3 className={styles.panelTitle}>업로드된 이미지 미리보기</h3>
                  <div className={styles.previewGrid}>
                    {postingImages.map((image, index) => (
                      <div key={`${image.name}-${image.lastModified}`} className={styles.previewItem}>
                        <div className={styles.previewFrame}>
                          <button
                            type="button"
                            className={styles.removeImageButton}
                            aria-label={`${index + 1}번 이미지 삭제`}
                            disabled={isAnalyzing}
                            onClick={() => removePostingImage(index)}
                          >
                            ×
                          </button>
                          <img
                            src={imagePreviewUrls[index]}
                            alt={`업로드된 채용공고 이미지 ${index + 1} 미리보기`}
                          />
                        </div>
                        <span>{index + 1}번 이미지</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.previewMeta}>
                  <div>
                    <p>
                      업로드 이미지: <strong>{postingImages.length}장</strong>
                    </p>
                    <ul className={styles.previewFileList}>
                      {postingImages.map((image, index) => (
                        <li key={`${image.name}-${image.lastModified}`}>
                          {index + 1}. {image.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={styles.previewActions}>
                    <Button
                      variant="secondary"
                      disabled={postingImages.length >= MAX_JOB_POSTING_IMAGES || isAnalyzing}
                      onClick={openFilePicker}
                    >
                      {postingImages.length >= MAX_JOB_POSTING_IMAGES ? '최대 2장 선택됨' : '이미지 추가하기'}
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
                <li>서로 다른 공고가 아닌 같은 공고의 상단/하단 이미지만 업로드해주세요.</li>
                <li>화면 전체 캡처보다 공고 본문 영역만 캡처하면 분석 정확도가 높아집니다.</li>
                <li>이미지는 선택한 순서대로 이어지는 내용으로 분석됩니다.</li>
                <li>흐릿한 이미지나 글자가 작은 이미지는 분석 결과가 부정확할 수 있습니다.</li>
              </ul>
            </div>

            {(postingImages.length > 0 || isAnalyzing || hasAnalysisCompleted) && (
              <ImageAnalysisStatus
                activeIndex={analysisStepIndex}
                isAnalyzing={isAnalyzing}
                isComplete={hasAnalysisCompleted}
              />
            )}

            {analysisError && <p className={styles.errorText}>{analysisError}</p>}
          </div>
        )}

        {activeSetupStep === 'analysis' && (
          <div className={styles.section}>
            <SectionHeader
              number="2"
              title="자동분석 결과"
              description="이미지 분석이 완료되면 아래 항목이 자동으로 입력됩니다. 필요하면 직접 수정할 수 있습니다."
            />

            {!ocrResult && !hasAnalysisResult ? (
              <div className={styles.emptyStepState}>
                <strong>아직 분석된 채용공고가 없습니다.</strong>
                <p>1단계에서 이미지를 업로드한 뒤 공고 이미지 분석 버튼을 누르면 이 탭으로 자동 이동합니다.</p>
                <Button variant="secondary" onClick={() => setActiveSetupStep('upload')}>
                  이미지 업로드로 돌아가기
                </Button>
              </div>
            ) : (
              <>
                <AnalysisTrustPanel
                  rawText={ocrResult?.rawText ?? form.jobPostingText ?? ''}
                  warnings={ocrWarnings}
                  showRawText={showRawText}
                  onToggleRawText={() => setShowRawText((current) => !current)}
                />

                <div className={styles.analysisGrid}>
                  <TextInputField
                    label="회사명"
                    name="companyName"
                    placeholder="자동 입력 / 수정 가능"
                    value={form.companyName}
                    onChange={handleTextChange('companyName')}
                    evidence={fieldEvidence.companyName}
                  />

                  <div className={styles.autocomplete}>
                    <label htmlFor="position" className={styles.label}>
                      지원 직무
                      {fieldEvidence.position?.requiresReview && (
                        <span className={styles.reviewBadge}>확인 필요</span>
                      )}
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
                                index === activePositionSuggestionIndex
                                  ? styles.activeSuggestion
                                  : '',
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
                    <FieldEvidenceNote evidence={fieldEvidence.position} />
                  </div>

                  <div className={styles.wideField}>
                    <label htmlFor="responsibilities" className={styles.label}>
                      주요 업무
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
                    values={form.requiredSkills}
                    placeholder="예: Java, Spring Boot, MySQL, AWS"
                    evidenceByValue={tagEvidence.requiredSkills}
                    onChange={(values) => updateTagField('requiredSkills', values)}
                  />

                  <TagEditor
                    label="우대 기술"
                    values={form.preferredSkills}
                    placeholder="예: Docker, Kubernetes, CI/CD"
                    evidenceByValue={tagEvidence.preferredSkills}
                    onChange={(values) => updateTagField('preferredSkills', values)}
                  />

                  <TagEditor
                    label="인재상 / 자격요건"
                    values={form.traits}
                    placeholder="예: 협업 능력, 문제 해결 능력"
                    evidenceByValue={tagEvidence.traits}
                    onChange={(values) => updateTagField('traits', values)}
                  />

                  <TagEditor
                    label="핵심 키워드"
                    values={form.keywords}
                    placeholder="예: 백엔드, API, 클라우드"
                    evidenceByValue={tagEvidence.keywords}
                    onChange={(values) => updateTagField('keywords', values)}
                  />
                </div>

                <RepositoryRankingPanel matches={repositoryMatches} />

                <div className={styles.nextStepCallout}>
                  <div>
                    <strong>분석 결과 확인이 끝났다면</strong>
                    <p>다음 단계에서 자기소개서에 강조할 내 보유 기술스택을 정리해주세요.</p>
                  </div>
                  <Button onClick={() => setActiveSetupStep('skills')}>
                    기술 스택으로 이동
                    <ArrowRightIcon />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {activeSetupStep === 'skills' && (
          <div className={styles.section}>
            <SectionHeader
              number="3"
              title="내 보유 기술스택"
              required
              description="GitHub 분석 결과와 자기소개서에 강조할 기술을 선택하거나 입력해주세요."
            />

            <div className={styles.stepNotice}>
              <strong>마지막 단계입니다.</strong>
              <p>자동분석 결과에서 뽑힌 필수 기술과 선택한 GitHub 레포의 기술을 함께 확인한 뒤 생성하면 됩니다.</p>
            </div>

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
        )}
      </Card>

      <div className={styles.selectedRepos}>
        {selectedRepositories.map((repo) => (
          <span key={repo.id}>{repo.name}</span>
        ))}
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.bottomInner}>
          <Button variant="ghost" onClick={handlePreviousAction}>
            {activeSetupStep === 'upload' ? '이전' : '이전 단계'}
          </Button>
          <div className={styles.bottomActions}>
            {activeSetupStep === 'upload' && (
              <Button disabled={postingImages.length === 0 || isAnalyzing} onClick={() => void analyzeImage()}>
                {isAnalyzing ? '분석 중...' : '공고 이미지 분석'}
                <ArrowRightIcon />
              </Button>
            )}

            {activeSetupStep === 'analysis' && (
              <Button disabled={!hasAnalysisResult} onClick={() => setActiveSetupStep('skills')}>
                기술 스택으로 이동
                <ArrowRightIcon />
              </Button>
            )}

            {activeSetupStep === 'skills' && (
              <Button disabled={!isValid} onClick={handleSubmit}>
                이 내용으로 자기소개서 생성
                <ArrowRightIcon />
              </Button>
            )}
          </div>
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
  name,
  placeholder,
  value,
  onChange,
  evidence,
}: {
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  evidence?: OcrFieldEvidence;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={name} className={styles.label}>
        {label}
        {evidence?.requiresReview && <span className={styles.reviewBadge}>확인 필요</span>}
      </label>
      <input
        id={name}
        name={name}
        className={styles.control}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <FieldEvidenceNote evidence={evidence} />
    </div>
  );
}

function FieldEvidenceNote({ evidence }: { evidence?: OcrFieldEvidence }) {
  if (!evidence) {
    return <p className={styles.noEvidenceText}>근거 없음: 자동 입력되지 않았거나 사용자가 직접 입력한 값입니다.</p>;
  }

  return (
    <p className={evidence.requiresReview ? styles.reviewEvidenceText : styles.evidenceText}>
      근거: {evidence.evidence}
      {typeof evidence.confidence === 'number' && ` · confidence ${Math.round(evidence.confidence * 100)}%`}
    </p>
  );
}

function AnalysisTrustPanel({
  rawText,
  warnings,
  showRawText,
  onToggleRawText,
}: {
  rawText: string;
  warnings: string[];
  showRawText: boolean;
  onToggleRawText: () => void;
}) {
  return (
    <div className={styles.trustPanel}>
      <div className={styles.trustHeader}>
        <div>
          <strong>근거가 확인된 항목만 자동 입력됩니다.</strong>
          <p>이미지 분석 결과는 자동 입력값입니다. 제출 전 반드시 확인해주세요.</p>
        </div>
        <button type="button" className={styles.rawToggleButton} onClick={onToggleRawText}>
          {showRawText ? '원문 접기' : 'OCR 원문 보기'}
        </button>
      </div>

      {warnings.length > 0 && (
        <div className={styles.warningBox}>
          <strong>확인 필요</strong>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {showRawText && (
        <pre className={styles.rawTextBox}>{rawText || 'OCR 원문이 없습니다.'}</pre>
      )}
    </div>
  );
}

function RepositoryRankingPanel({ matches }: { matches: RepositoryMatch[] }) {
  return (
    <div className={styles.rankingPanel}>
      <div className={styles.rankingHeader}>
        <div>
          <h3>공고 맞춤 레포 우선순위</h3>
          <p>선택한 후보 레포를 공고 요구사항 기준으로 자동 정렬했습니다.</p>
        </div>
        <span className={styles.rankingMeta}>상위 레포 중심 반영</span>
      </div>

      <ol className={styles.rankingList}>
        {matches.map((match) => (
          <li key={match.repositoryId} className={styles.rankingItem}>
            <div className={styles.rankBadge}>{match.rank}</div>
            <div className={styles.rankingContent}>
              <div className={styles.rankingTitleRow}>
                <h4>{match.repositoryName}</h4>
                <span>{match.score}점</span>
              </div>
              <p className={styles.rankingSummary}>{match.summary}</p>

              {match.matchedKeywords.length > 0 && (
                <div className={styles.keywordRow}>
                  {match.matchedKeywords.slice(0, 5).map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                </div>
              )}

              <div className={styles.rankingEvidence}>
                {match.jobSignals.slice(0, 2).map((signal) => (
                  <p key={signal}>
                    <strong>공고</strong>
                    {signal}
                  </p>
                ))}
                {match.repositorySignals.slice(0, 2).map((signal) => (
                  <p key={signal}>
                    <strong>GitHub</strong>
                    {signal}
                  </p>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
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
      ? 'AI가 채용공고 이미지의 텍스트를 순서대로 읽고 있습니다.'
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
  values,
  placeholder,
  evidenceByValue = {},
  onChange,
}: {
  label: string;
  values: string[];
  placeholder: string;
  evidenceByValue?: Record<string, string>;
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
      </label>
      <div className={styles.tagBox}>
        {values.map((value) => {
          const evidence = evidenceByValue[value];

          return (
            <span
              key={value}
              className={[styles.tag, evidence ? styles.evidenceTag : styles.manualTag].join(' ')}
              title={evidence ? `근거: ${evidence}` : '사용자가 직접 추가했거나 OCR 근거가 없는 항목'}
            >
              {value}
              {evidence ? <span className={styles.tagEvidenceDot} aria-label="근거 있음" /> : null}
              <button
                type="button"
                className={styles.tagRemove}
                aria-label={`${value} 삭제`}
                onClick={() => removeTag(value)}
              >
                ×
              </button>
            </span>
          );
        })}
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

function StepHeader({
  activeStep,
  completedSteps,
  onSelect,
}: {
  activeStep: SetupStepId;
  completedSteps: SetupStepId[];
  onSelect: (step: SetupStepId) => void;
}) {
  return (
    <nav className={styles.steps} aria-label="채용공고 분석 단계">
      {SETUP_STEPS.map((step, index) => {
        const isActive = activeStep === step.id;
        const isComplete = completedSteps.includes(step.id);

        return (
          <div key={step.id} className={styles.stepTrackItem}>
            <button
              type="button"
              className={[
                styles.stepButton,
                isActive ? styles.stepButtonActive : '',
                isComplete ? styles.stepButtonComplete : '',
              ].join(' ')}
              aria-current={isActive ? 'step' : undefined}
              onClick={() => onSelect(step.id)}
            >
              <span className={styles.stepBadge}>{step.number}</span>
              <span>{step.title}</span>
            </button>
            {index < SETUP_STEPS.length - 1 && <span className={styles.stepLine} />}
          </div>
        );
      })}
    </nav>
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

function getImageFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function extractKnownSkills(sourceValue: string) {
  const normalizedSource = normalizeSearchText(sourceValue);

  return TECH_KEYWORDS.filter((skill) =>
    normalizedSource.includes(normalizeSearchText(skill)),
  );
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
