import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({
  message,
  size = 'md',
}: LoadingSpinnerProps) {
  return (
    <div className={styles.wrap}>
      <div className={[styles.spinner, styles[size]].join(' ')} aria-label="로딩 중" />
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}
