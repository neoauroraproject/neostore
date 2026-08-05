'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Skeleton } from '@neostore/ui';
import { AdminChrome } from '../components/AdminChrome';
import {
  type ActiveContext,
  type AuthSession,
  clearSession,
  loadContext,
  loadSession,
  saveContext,
  saveSession,
} from '../lib/session';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function AdminHome() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [context, setContext] = useState<ActiveContext>({ kind: 'customer' });
  const [dashboard, setDashboard] = useState<any>(null);
  const [extensions, setExtensions] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get('google_token');
    if (googleToken) {
      void (async () => {
        try {
          const me = await fetch(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${googleToken}` },
          }).then((r) => r.json());
          const workspaces = (me.workspaces || []).map((w: any) => ({
            id: w.id,
            name: w.name,
            slug: w.slug || w.store?.slug,
          }));
          const s: AuthSession = {
            token: googleToken,
            role: me.user?.role || me.role,
            email: me.user?.email || me.email,
            name: me.user?.name || me.name,
            workspaces,
          };
          saveSession(s);
          setSession(s);
          const ctx = loadContext(s);
          setContext(ctx);
          window.history.replaceState({}, '', '/');
          void hydrate(s, ctx);
        } catch {
          setError('Google sign-in failed');
        }
      })();
      return;
    }
    const s = loadSession();
    if (s) {
      setSession(s);
      const ctx = loadContext(s);
      setContext(ctx);
      void hydrate(s, ctx);
    }
  }, []);

  async function hydrate(s: AuthSession, ctx: ActiveContext) {
    setLoading(true);
    setError('');
    try {
      if (ctx.kind === 'seller') {
        const dash = await fetch(`${API}/admin/workspaces/${ctx.workspaceId}/dashboard`, {
          headers: { Authorization: `Bearer ${s.token}` },
        }).then((r) => r.json());
        setDashboard(dash);
      } else {
        setDashboard(null);
      }
      const ext = await fetch(`${API}/admin/extensions`, {
        headers: { Authorization: `Bearer ${s.token}` },
      }).then((r) => r.json());
      setExtensions(ext);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: email, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Login failed');
        return;
      }
      const next: AuthSession = {
        token: data.token,
        role: data.user?.role || data.role,
        email: data.user?.email || email,
        name: data.user?.name,
        workspaces: data.workspaces || [],
      };
      saveSession(next);
      const ctx = loadContext(next);
      saveContext(ctx);
      setSession(next);
      setContext(ctx);
      if (ctx.kind === 'seller') {
        window.location.href = `/admin/w/${ctx.workspaceId}`;
        return;
      }
      if (ctx.kind === 'platform') {
        window.location.href = '/admin/platform';
        return;
      }
      await hydrate(next, ctx);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearSession();
    setSession(null);
    setDashboard(null);
    setExtensions(null);
  }

  async function onContext(ctx: ActiveContext) {
    setContext(ctx);
    saveContext(ctx);
    if (ctx.kind === 'customer') {
      window.location.href = '/portal';
      return;
    }
    if (ctx.kind === 'platform') {
      window.location.href = '/admin/platform';
      return;
    }
    if (ctx.kind === 'seller') {
      window.location.href = `/admin/w/${ctx.workspaceId}`;
      return;
    }
    if (session) await hydrate(session, ctx);
  }

  if (!session) {
    return (
      <main className="ns-container" style={{ paddingTop: 72, maxWidth: 420 }}>
        <PageHeader
          eyebrow="Console"
          title="Sign in"
          description="Use the Admin email or Admin name from install, plus the password you set."
        />
        <Card padding={24}>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Email or admin name
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com or Admin"
                autoComplete="username"
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Password
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Install password"
                autoComplete="current-password"
              />
            </label>
            <Button onClick={login} disabled={loading} fullWidth>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
            {error ? (
              <p style={{ color: 'var(--ns-danger)', margin: 0 }}>
                {error}
                {/invalid credentials/i.test(error)
                  ? ' — check ADMIN_EMAIL / ADMIN_NAME and password in /opt/neostore/.env'
                  : ''}
              </p>
            ) : null}
          </div>
        </Card>
      </main>
    );
  }

  const title =
    context.kind === 'platform' ? 'Platform' : context.kind === 'seller' ? 'Seller workspace' : 'Console';

  return (
    <AdminChrome title={title} session={session} context={context} onContext={onContext} onLogout={logout}>
      <PageHeader
        eyebrow={context.kind === 'platform' ? 'Super Admin' : 'Seller Panel'}
        title={
          context.kind === 'platform'
            ? 'Platform overview'
            : context.kind === 'seller'
              ? context.workspaceName || 'Workspace'
              : 'Choose a context'
        }
        description="Seller Panel is live — open your workspace for products, orders, and settings."
        actions={
          context.kind === 'seller' ? (
            <Link href={`/w/${context.workspaceId}`}>
              <Button size="sm">Open workspace routes</Button>
            </Link>
          ) : context.kind === 'platform' ? (
            <Link href="/platform">
              <Button size="sm">Platform routes</Button>
            </Link>
          ) : null
        }
      />

      {loading ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <Skeleton height={100} radius={16} />
          <Skeleton height={160} radius={16} />
        </div>
      ) : null}

      {context.kind === 'platform' && !loading ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {['Workspaces', 'Sellers', 'Payments', 'System'].map((label) => (
              <Card key={label}>
                <p style={{ margin: 0, color: 'var(--ns-muted)', fontSize: 13 }}>{label}</p>
                <p style={{ margin: '8px 0 0', fontWeight: 700 }}>Phase next</p>
              </Card>
            ))}
          </div>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>Extensions host</strong>
              <Badge tone="accent">Read-only</Badge>
            </div>
            <pre style={{ margin: 0, fontSize: 12, overflow: 'auto', maxHeight: 240 }}>
              {JSON.stringify(extensions?.installed?.slice?.(0, 8) || extensions, null, 2)}
            </pre>
          </Card>
        </div>
      ) : null}

      {context.kind === 'seller' && !loading ? (
        dashboard ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
              {Object.entries(dashboard)
                .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
                .slice(0, 6)
                .map(([k, v]) => (
                  <Card key={k}>
                    <p style={{ margin: 0, color: 'var(--ns-muted)', fontSize: 13 }}>{k}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>
                      {String(v)}
                    </p>
                  </Card>
                ))}
            </div>
            <Card>
              <strong>Raw dashboard</strong>
              <pre style={{ margin: '8px 0 0', fontSize: 12, overflow: 'auto' }}>{JSON.stringify(dashboard, null, 2)}</pre>
            </Card>
          </div>
        ) : (
          <EmptyState title="No dashboard data" description="Workspace metrics will appear after catalog activity." />
        )
      ) : null}

      {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
    </AdminChrome>
  );
}
