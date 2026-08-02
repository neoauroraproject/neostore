import type { CSSProperties, HTMLAttributes } from 'react';

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 'var(--ns-radius-sm)',
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, var(--ns-surface-sunken) 25%, #f0f3f7 50%, var(--ns-surface-sunken) 75%)',
        backgroundSize: '200% 100%',
        animation: 'ns-shimmer 1.2s linear infinite',
        ...style,
      }}
      {...rest}
    />
  );
}
