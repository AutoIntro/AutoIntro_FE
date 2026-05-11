import type { TextareaHTMLAttributes } from 'react';
import styles from './Field.module.css';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export default function Textarea({ label, id, error, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <div className={styles.field}>
      <label htmlFor={textareaId} className={styles.label}>
        {label}
      </label>
      <textarea
        id={textareaId}
        className={[styles.control, styles.textarea, error ? styles.hasError : ''].join(' ')}
        {...props}
      />
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
}
