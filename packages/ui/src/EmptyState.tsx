import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function EmptyState({
  icon = 'spark',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        color: 'var(--ns-muted)',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          margin: '0 auto 16px',
          borderRadius: 'var(--ns-radius-md)',
          background: 'var(--ns-surface-sunken)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ns-ink)',
        }}
      >
        <Icon name={icon} size={24} />
      </div>
      <h3 style={{ margin: '0 0 8px', color: 'var(--ns-ink)', fontSize: 'var(--ns-text-lg)' }}>{title}</h3>
      {description ? <p style={{ margin: '0 0 20px', maxWidth: 360, marginInline: 'auto' }}>{description}</p> : null}
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  style,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <header
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 28,
        ...style,
      }}
    >
      <div>
        {eyebrow ? (
          <p
            style={{
              margin: '0 0 8px',
              fontSize: 'var(--ns-text-xs)',
              letterSpacing: 'var(--ns-tracking-wide)',
              textTransform: 'uppercase',
              color: 'var(--ns-faint)',
              fontWeight: 600,
            }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--ns-font-display)',
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            letterSpacing: 'var(--ns-tracking-tight)',
            lineHeight: 'var(--ns-leading-tight)',
            fontWeight: 700,
          }}
        >
          {title}
        </h1>
        {description ? (
          <p style={{ margin: '10px 0 0', color: 'var(--ns-muted)', maxWidth: 520 }}>{description}</p>
        ) : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 10 }}>{actions}</div> : null}
    </header>
  );
}
