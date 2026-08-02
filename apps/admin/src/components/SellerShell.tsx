'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Icon, type IconName } from '@neostore/ui';
import { RoleSwitcher } from './AdminChrome';
import {
  type ActiveContext,
  type AuthSession,
  clearSession,
  loadContext,
  loadSession,
  saveContext,
} from '../lib/session';
import { requireWorkspace } from '../lib/api';

type NavItem = { href: string; label: string; icon: IconName };

export function SellerShell({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [session, setSession] = useState<AuthSession | null>(null);
  const [context, setContext] = useState<ActiveContext>({ kind: 'seller', workspaceId });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = loadSession();
    if (!s || !requireWorkspace(s, workspaceId)) {
      router.replace('/');
      return;
    }
    setSession(s);
    const ctx: ActiveContext = {
      kind: 'seller',
      workspaceId,
      workspaceName: s.workspaces.find((w) => w.id === workspaceId)?.name,
      workspaceSlug: s.workspaces.find((w) => w.id === workspaceId)?.slug,
    };
    saveContext(ctx);
    setContext(ctx);
    setReady(true);
  }, [workspaceId, router]);

  const base = `/w/${workspaceId}`;
  const nav: NavItem[] = [
    { href: base, label: 'Dashboard', icon: 'home' },
    { href: `${base}/products`, label: 'Products', icon: 'bag' },
    { href: `${base}/orders`, label: 'Orders', icon: 'check' },
    { href: `${base}/customers`, label: 'Customers', icon: 'user' },
    { href: `${base}/analytics`, label: 'Analytics', icon: 'spark' },
    { href: `${base}/wallet`, label: 'Wallet', icon: 'wallet' },
    { href: `${base}/settings`, label: 'Settings', icon: 'shield' },
  ];

  function logout() {
    clearSession();
    router.replace('/');
  }

  function onContext(ctx: ActiveContext) {
    setContext(ctx);
    saveContext(ctx);
    if (ctx.kind === 'customer') {
      window.location.href = '/portal';
      return;
    }
    if (ctx.kind === 'platform') {
      router.push('/platform');
      return;
    }
    if (ctx.kind === 'seller' && ctx.workspaceId !== workspaceId) {
      router.push(`/w/${ctx.workspaceId}`);
    }
  }

  if (!ready || !session) {
    return (
      <div className="ns-container" style={{ paddingTop: 48, color: 'var(--ns-muted)' }}>
        Loading console…
      </div>
    );
  }

  const workspaceName =
    context.kind === 'seller'
      ? context.workspaceName || context.workspaceSlug || 'Workspace'
      : 'Workspace';

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: '1fr' }} className="ns-seller-layout">
      <aside
        className="ns-seller-aside"
        style={{
          display: 'none',
          flexDirection: 'column',
          gap: 4,
          padding: 16,
          borderRight: '1px solid var(--ns-border)',
          background: 'var(--ns-surface-elevated)',
          position: 'sticky',
          top: 0,
          height: '100dvh',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 20px' }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'var(--ns-ink)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="spark" size={16} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--ns-font-display)', fontWeight: 700, letterSpacing: '-0.03em' }}>
              Seller
            </div>
            <div style={{ fontSize: 12, color: 'var(--ns-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {workspaceName}
            </div>
          </div>
        </div>
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== base && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 14,
                color: active ? 'var(--ns-ink)' : 'var(--ns-muted)',
                background: active ? 'var(--ns-surface-sunken)' : 'transparent',
              }}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          );
        })}
      </aside>

      <div style={{ minWidth: 0 }}>
        <header
          style={{
            height: 64,
            borderBottom: '1px solid var(--ns-border)',
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          <div
            className="ns-container"
            style={{ display: 'flex', width: '100%', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}
          >
            <strong style={{ fontFamily: 'var(--ns-font-display)', letterSpacing: '-0.03em' }}>{workspaceName}</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <RoleSwitcher session={session} context={context} onChange={onContext} />
              <Button variant="secondary" size="sm" onClick={logout}>
                Sign out
              </Button>
            </div>
          </div>
        </header>

        <div className="ns-container" style={{ paddingTop: 24, paddingBottom: 88 }}>
          {children}
        </div>

        <nav
          className="ns-seller-mobile-nav"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 30,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            height: 'calc(64px + env(safe-area-inset-bottom))',
            paddingBottom: 'env(safe-area-inset-bottom)',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(14px)',
            borderTop: '1px solid var(--ns-border)',
          }}
        >
          {nav.slice(0, 4).map((item) => {
            const active = pathname === item.href || (item.href !== base && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: active ? 'var(--ns-ink)' : 'var(--ns-faint)',
                }}
              >
                <Icon name={item.icon} size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <style>{`
        @media (min-width: 960px) {
          .ns-seller-layout { grid-template-columns: 240px 1fr !important; }
          .ns-seller-aside { display: flex !important; }
          .ns-seller-mobile-nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export function useSellerSession(workspaceId: string) {
  const [session, setSession] = useState<AuthSession | null>(null);
  useEffect(() => {
    setSession(loadSession());
  }, [workspaceId]);
  return session;
}
