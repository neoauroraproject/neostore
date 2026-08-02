import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  border: '1px solid transparent',
  borderRadius: 'var(--ns-radius-md)',
  fontWeight: 600,
  letterSpacing: '-0.01em',
  cursor: 'pointer',
  transition: 'background var(--ns-duration-fast) var(--ns-ease), transform var(--ns-duration-fast) var(--ns-ease), border-color var(--ns-duration-fast) var(--ns-ease), opacity var(--ns-duration-fast) var(--ns-ease)',
  userSelect: 'none',
};

const sizes: Record<Size, CSSProperties> = {
  sm: { height: 36, padding: '0 12px', fontSize: 'var(--ns-text-sm)' },
  md: { height: 44, padding: '0 16px', fontSize: 'var(--ns-text-sm)' },
  lg: { height: 52, padding: '0 22px', fontSize: 'var(--ns-text-md)' },
};

const variants: Record<Variant, CSSProperties> = {
  primary: {
    background: 'var(--ns-ink)',
    color: '#fff',
  },
  secondary: {
    background: 'var(--ns-surface-elevated)',
    color: 'var(--ns-ink)',
    borderColor: 'var(--ns-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ns-ink)',
  },
  danger: {
    background: 'var(--ns-danger)',
    color: '#fff',
  },
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  children,
  style,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        ...base,
        ...sizes[size],
        ...variants[variant],
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) (e.currentTarget.style.transform = 'scale(0.98)');
        rest.onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        rest.onMouseUp?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        rest.onMouseLeave?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
