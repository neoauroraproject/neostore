'use client';

import { useMemo } from 'react';
import { Button, Icon } from '@neostore/ui';
import {
  type ActiveContext,
  type AuthSession,
  contextLabel,
  saveContext,
} from '../lib/session';

/** Role / surface switcher — ordinary users with one context see a single label. */
export function RoleSwitcher({
  session,
  context,
  onChange,
}: {
  session: AuthSession;
  context: ActiveContext;
  onChange: (ctx: ActiveContext) => void;
}) {
  const options = useMemo(() => {
    const list: ActiveContext[] = [];
    if (session.role === 'super_admin') list.push({ kind: 'platform' });
    for (const w of session.workspaces || []) {
      list.push({
        kind: 'seller',
        workspaceId: w.id,
        workspaceName: w.name,
        workspaceSlug: w.slug,
      });
    }
    list.push({ kind: 'customer' });
    return list;
  }, [session]);

  if (options.length <= 1) {
    return (
      <span style={{ fontSize: 13, color: 'var(--ns-muted)', fontWeight: 600 }}>{contextLabel(context)}</span>
    );
  }

  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <Icon name="user" size={16} />
      <select
        value={
          context.kind === 'seller'
            ? `seller:${context.workspaceId}`
            : context.kind
        }
        onChange={(e) => {
          const v = e.target.value;
          let next: ActiveContext = { kind: 'customer' };
          if (v === 'platform') next = { kind: 'platform' };
          else if (v.startsWith('seller:')) {
            const id = v.slice(7);
            const w = session.workspaces.find((x) => x.id === id);
            next = {
              kind: 'seller',
              workspaceId: id,
              workspaceName: w?.name,
              workspaceSlug: w?.slug,
            };
          }
          saveContext(next);
          onChange(next);
        }}
        style={{
          height: 36,
          borderRadius: 10,
          border: '1px solid var(--ns-border)',
          background: 'var(--ns-surface-elevated)',
          padding: '0 10px',
          fontWeight: 600,
        }}
      >
        {options.map((o) => {
          const value = o.kind === 'seller' ? `seller:${o.workspaceId}` : o.kind;
          return (
            <option key={value} value={value}>
              {contextLabel(o)}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function AdminChrome({
  title,
  session,
  context,
  onContext,
  onLogout,
  children,
}: {
  title: string;
  session: AuthSession;
  context: ActiveContext;
  onContext: (ctx: ActiveContext) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
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
        <div className="ns-container" style={{ display: 'flex', width: '100%', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <div>
              <div style={{ fontFamily: 'var(--ns-font-display)', fontWeight: 700, letterSpacing: '-0.03em' }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--ns-muted)' }}>{session.email}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RoleSwitcher session={session} context={context} onChange={onContext} />
            <Button variant="secondary" size="sm" onClick={onLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <div className="ns-container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        {children}
      </div>
    </>
  );
}
