'use client';

import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type BottomNavItem = {
  href: string;
  label: string;
  icon: IconName;
  active?: boolean;
};

export function BottomNav({ items }: { items: BottomNavItem[] }) {
  return (
    <nav
      aria-label="Primary"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        height: 'calc(var(--ns-bottom-nav-h) + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(255,255,255,0.86)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--ns-border)',
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      }}
      className="ns-bottom-nav"
    >
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            color: item.active ? 'var(--ns-ink)' : 'var(--ns-faint)',
            fontSize: 11,
            fontWeight: 600,
            transition: 'color var(--ns-duration-fast) var(--ns-ease)',
          }}
        >
          <Icon name={item.icon} size={22} />
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export function StoreShell({
  brand,
  children,
  navItems,
  topRight,
}: {
  brand: ReactNode;
  children: ReactNode;
  navItems: BottomNavItem[];
  topRight?: ReactNode;
}) {
  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          height: 'var(--ns-nav-h)',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--ns-border)',
          background: 'rgba(244,246,248,0.85)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div
          className="ns-container"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, width: '100%' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>{brand}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{topRight}</div>
        </div>
      </header>
      <div className="ns-page">{children}</div>
      <BottomNav items={navItems} />
      <style>{`
        @media (min-width: 900px) {
          .ns-bottom-nav { display: none !important; }
          .ns-page { padding-bottom: var(--ns-space-16) !important; }
        }
      `}</style>
    </>
  );
}
