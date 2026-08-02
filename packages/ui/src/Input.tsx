'use client';

import type { ChangeEvent, CSSProperties, InputHTMLAttributes } from 'react';

const field: CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 14px',
  borderRadius: 'var(--ns-radius-md)',
  border: '1px solid var(--ns-border)',
  background: 'var(--ns-surface-elevated)',
  color: 'var(--ns-ink)',
  outline: 'none',
  transition: 'border-color var(--ns-duration-fast) var(--ns-ease), box-shadow var(--ns-duration-fast) var(--ns-ease)',
};

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ style, onFocus, onBlur, onChange, ...rest }: InputProps) {
  return (
    <input
      style={{ ...field, ...style }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--ns-focus)';
        e.currentTarget.style.boxShadow = '0 0 0 3px var(--ns-accent-soft)';
        onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--ns-border)';
        e.currentTarget.style.boxShadow = 'none';
        onBlur?.(e);
      }}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange?.(e)}
      {...rest}
    />
  );
}
