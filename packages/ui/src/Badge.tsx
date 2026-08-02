import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const tones: Record<Tone, CSSProperties> = {
  neutral: { background: 'var(--ns-surface-sunken)', color: 'var(--ns-muted)' },
  accent: { background: 'var(--ns-accent-soft)', color: 'var(--ns-accent-ink)' },
  success: { background: 'var(--ns-success-soft)', color: 'var(--ns-success)' },
  warning: { background: 'var(--ns-warning-soft)', color: 'var(--ns-warning)' },
  danger: { background: 'var(--ns-danger-soft)', color: 'var(--ns-danger)' },
};

export function Badge({
  tone = 'neutral',
  children,
  style,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 24,
        padding: '0 10px',
        borderRadius: 999,
        fontSize: 'var(--ns-text-xs)',
        fontWeight: 600,
        letterSpacing: '0.02em',
        ...tones[tone],
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
