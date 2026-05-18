import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Textarea from '../components/common/Textarea';
import { ROUTES } from '../constants/constants';
import { useResumeStore } from '../stores/resumeStore';
import type { JobInput, ResumeResult } from '../types/resume';
import styles from './ResultPage.module.css';

const RESULT_TABS = [
  { id: 'resume', label: '자기소개서' },
  { id: 'evidence', label: '자기소개서 근거' },
] as const;

type ResultTabId = (typeof RESULT_TABS)[number]['id'];

export default function ResultPage() {
  const navigate = useNavigate();
  const {
    result,
    jobInput,
    selectedRepositories,
    setResult,
    clear,
  } = useResumeStore();

  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<ResultTabId>('resume');

  useEffect(() => {
    if (result) {
      setEditContent(result.content);
    }
  }, [result]);

  if (!result) {
    return (
      <div className={styles.empty}>
        <h1 className={styles.emptyTitle}>생성된 결과가 없습니다.</h1>
        <p className={styles.emptyDesc}>GitHub 프로젝트 고르기와 자기소개서 설정을 먼저 진행하세요.</p>
        <Button onClick={() => navigate(ROUTES.REPOSITORIES)}>처음부터 시작하기</Button>
      </div>
    );
  }

  const handleSave = () => {
    const updated: ResumeResult = { ...result, content: editContent };
    setResult(updated);
    setEditMode(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result.content).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const printFrame = document.createElement('iframe');
    printFrame.title = '자기소개서 PDF 다운로드';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';

    document.body.appendChild(printFrame);

    const printWindow = printFrame.contentWindow;
    const printDocument = printFrame.contentDocument ?? printWindow?.document;

    if (!printWindow || !printDocument) {
      printFrame.remove();
      return;
    }

    const cleanup = () => {
      window.setTimeout(() => printFrame.remove(), 500);
    };

    printWindow.onafterprint = cleanup;
    printDocument.open();
    printDocument.write(createResumePrintHtml(result));
    printDocument.close();

    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 100);
  };

  const handleEditSettings = () => {
    if (jobInput && selectedRepositories.length > 0) {
      navigate(ROUTES.JOB_INPUT);
      return;
    }

    clear();
    navigate(ROUTES.REPOSITORIES);
  };

  const handleRestart = () => {
    clear();
    navigate(ROUTES.HOME);
  };

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <Button variant="ghost" size="sm" onClick={handleEditSettings}>
          <EditIcon />
          설정 수정
        </Button>
        <Button variant="secondary" size="sm" onClick={handleCopy}>
          <CopyIcon />
          {copied ? '복사됨' : '복사'}
        </Button>
        <Button size="sm" onClick={handleDownload}>
          <DownloadIcon />
          PDF 다운로드
        </Button>
      </div>

      <div className={styles.successBanner}>
        <div className={styles.successIcon}>
          <CheckIcon />
        </div>
        <div>
          <h1>자기소개서가 완성되었습니다!</h1>
          <p>AI가 GitHub 활동과 공고 정보를 분석해 자기소개서 초안을 작성했습니다.</p>
        </div>
      </div>

      <Card className={styles.tabCard}>
        <div className={styles.tabHeader}>
          <div className={styles.tabList} role="tablist" aria-label="결과 보기">
            {RESULT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={[styles.tabButton, activeTab === tab.id ? styles.activeTab : ''].join(' ')}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.contentDivider} />

        {activeTab === 'resume' ? (
          <div>
            <div className={styles.contentHeader}>
              <h2>생성된 자기소개서</h2>
              {!editMode && (
                <button type="button" className={styles.editButton} onClick={() => setEditMode(true)}>
                  <EditIcon />
                  편집
                </button>
              )}
            </div>

            <div className={styles.contentDivider} />

            {editMode ? (
              <>
                <Textarea
                  label="자기소개서 본문"
                  value={editContent}
                  onChange={(event) => setEditContent(event.target.value)}
                  style={{ minHeight: 420 }}
                />
                <div className={styles.editActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditContent(result.content);
                      setEditMode(false);
                    }}
                  >
                    취소
                  </Button>
                  <Button size="sm" onClick={handleSave}>저장</Button>
                </div>
              </>
            ) : (
              <div className={styles.contentBody}>{result.content}</div>
            )}
          </div>
        ) : (
          <div className={styles.evidencePanel}>
            <div className={styles.evidenceHeader}>
              <div>
                <h2>자기소개서에 사용된 근거</h2>
                <p>공고 요구사항, 선택한 GitHub 프로젝트, 기술 키워드를 기준으로 반영했습니다.</p>
              </div>
              <span>생성 근거</span>
            </div>

            <div className={styles.evidenceGrid}>
              <div className={styles.evidenceBlock}>
                <h3>공고에서 반영한 항목</h3>
                <div className={styles.evidenceTags}>
                  {getJobEvidenceTags(jobInput).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>

              <div className={styles.evidenceBlock}>
                <h3>본문에 반영된 기술 키워드</h3>
                {result.techKeywords.length > 0 ? (
                  <div className={styles.evidenceTags}>
                    {result.techKeywords.slice(0, 12).map((keyword) => (
                      <span key={keyword}>{keyword}</span>
                    ))}
                  </div>
                ) : (
                  <p>별도로 추출된 기술 키워드가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className={styles.footerActions}>
        <Button variant="secondary" onClick={handleRestart}>처음으로</Button>
        <Button onClick={() => navigate(ROUTES.REPOSITORIES)}>새 자기소개서 생성</Button>
      </div>
    </section>
  );
}

function getJobEvidenceTags(jobInput: JobInput | null) {
  if (!jobInput) {
    return ['공고 분석 결과'];
  }

  return [
    jobInput.position,
    ...jobInput.requiredSkills.slice(0, 4),
    ...jobInput.preferredSkills.slice(0, 2),
    ...jobInput.keywords.slice(0, 3),
  ].filter((tag, index, tags) => tag.trim() !== '' && tags.indexOf(tag) === index);
}

function createResumePrintHtml(result: ResumeResult) {
  const title = escapeHtml(result.title || '자기소개서');
  const content = escapeHtml(result.content);

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      @page {
        size: A4;
        margin: 18mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: #111827;
        background: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
      }

      h1 {
        margin: 0 0 22px;
        padding-bottom: 14px;
        border-bottom: 1px solid #d1d5db;
        font-size: 24px;
        line-height: 1.4;
        font-weight: 800;
      }

      .content {
        font-size: 13.5px;
        line-height: 1.85;
        white-space: pre-wrap;
        word-break: keep-all;
      }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <main class="content">${content}</main>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 8h11v13H8V8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M5 16H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m13.5 6.5 4 4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
