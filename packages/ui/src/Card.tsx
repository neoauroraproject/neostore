import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

const styles: Record<string, CSSProperties> = {
  default: {
    background: 'var(--ns-surface-elevated)',
    border: '1px solid var(--ns-border)',
    borderRadius: 'var(--ns-radius-lg)',
    boxShadow: 'var(--ns-shadow-sm)',
  },
  soft: {
    background: 'var(--ns-surface-sunken)',
    border: '1px solid transparent',
    borderRadius: 'var(--ns-radius-lg)',
  },
  interactive: {
    background: 'var(--ns-surface-elevated)',
    border: '1px solid var(--ns-border)',
    borderRadius: 'var(--ns-radius-lg)',
    boxShadow: 'var(--ns-shadow-sm)',
    transition: 'transform var(--ns-duration) var(--ns-ease), box-shadow var(--ns-duration) var(--ns-ease), border-color var(--ns-duration) var(--ns-ease)',
    cursor: 'pointer',
  },
};

export function Card({
  variant = 'default',
  padding = 20,
  children,
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'soft' | 'interactive';
  padding?: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{ ...styles[variant], padding, ...style }}
      onMouseEnter={(e) => {
        if (variant === 'interactive') {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--ns-shadow-md)';
          e.currentTarget.style.borderColor = 'var(--ns-border-strong)';
        }
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (variant === 'interactive') {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--ns-shadow-sm)';
          e.currentTarget.style.borderColor = 'var(--ns-border)';
        }
        rest.onMouseLeave?.(e);
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
