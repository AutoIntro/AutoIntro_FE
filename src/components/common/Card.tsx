import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  selected?: boolean;
}

export default function Card({
  children,
  hoverable = false,
  selected = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={[
        styles.card,
        hoverable ? styles.hoverable : '',
        selected ? styles.selected : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
