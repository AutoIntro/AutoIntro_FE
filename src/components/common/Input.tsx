import type { InputHTMLAttributes } from 'react';
import styles from './Field.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function Input({ label, id, error, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        className={[styles.control, error ? styles.hasError : ''].join(' ')}
        {...props}
      />
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
}
