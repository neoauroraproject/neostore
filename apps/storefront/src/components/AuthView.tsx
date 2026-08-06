'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Input, PageHeader } from '@neostore/ui';
import { API } from '../lib/browser-api';
import { setCustomerSession } from '../lib/customer-session';

function storeSlug() {
  return (process.env.NEXT_PUBLIC_STORE_SLUG || '').trim();
}

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) {
    throw new Error(
      res.status === 502 || res.status === 503
        ? 'API is down (Bad Gateway). Run server update / check API container.'
        : `Empty response from API (HTTP ${res.status})`,
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`API returned non-JSON (HTTP ${res.status})`);
  }
}

export function AuthView({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = params.get('role') === 'seller' ? 'seller' : 'customer';
  const [role, setRole] = useState<'customer' | 'seller'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [resolvedSlug, setResolvedSlug] = useState(storeSlug());
  const slug = useMemo(() => resolvedSlug, [resolvedSlug]);

  useEffect(() => {
    fetch(`${API}/public`)
      .then(async (r) => {
        if (!r.ok) return null;
        return readJson(r).catch(() => null);
      })
      .then((d) => {
        if (!d) return;
        if (d?.store?.slug) setResolvedSlug(d.store.slug);
        setGoogleEnabled(Boolean(d?.store?.googleAuthEnabled));
      })
      .catch(() => null);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (role === 'seller') {
        const path = mode === 'login' ? '/auth/login' : '/auth/register';
        const body =
          mode === 'login'
            ? { login: email, password }
            : { email, password, name: name || email.split('@')[0], workspaceName: name || 'My Shop' };
        const res = await fetch(`${API}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await readJson(res);
        if (!res.ok) throw new Error(data?.message || 'Auth failed');
        const workspaces = (data.workspaces || (data.workspace ? [data.workspace] : [])).map((w: any) => ({
          id: w.id,
          name: w.name,
          slug: w.slug || w.store?.slug,
        }));
        localStorage.setItem(
          'ns_admin_token',
          JSON.stringify({
            token: data.token,
            role: data.user?.role,
            email: data.user?.email,
            name: data.user?.name,
            workspaces,
          }),
        );
        const wid = workspaces[0]?.id;
        window.location.href = wid ? `/admin/w/${wid}` : '/admin';
        return;
      }

      let s = slug;
      if (!s) {
        const pub = await fetch(`${API}/public`);
        const cat = await readJson(pub);
        s = cat?.store?.slug;
      }
      if (!s) throw new Error('Store not available');
      await customerAuth(s);
    } catch (err: any) {
      setError(err.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function customerAuth(s: string) {
    const path = mode === 'register' ? 'register' : 'login';
    const res = await fetch(`${API}/public/${encodeURIComponent(s)}/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(typeof data?.message === 'string' ? data.message : 'Auth failed');
    setCustomerSession(data.sessionToken);
    router.push('/portal');
  }

  async function googleAuth() {
    setError('');
    try {
      const qs = new URLSearchParams({
        role,
        ...(role === 'customer' && slug ? { slug } : {}),
      });
      const res = await fetch(`${API}/oauth/google/start?${qs}`);
      const data = await readJson(res);
      if (!res.ok) throw new Error(data?.message || 'Google OAuth unavailable');
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <main className="ns-container" style={{ paddingTop: 48, paddingBottom: 64, maxWidth: 480 }}>
      <PageHeader
        eyebrow="Account"
        title={mode === 'login' ? 'Log in' : 'Create account'}
        description="Customers shop and track orders. Sellers manage catalog and fulfillment."
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['customer', 'seller'] as const).map((r) => (
          <Button key={r} size="sm" variant={role === r ? 'primary' : 'secondary'} onClick={() => setRole(r)}>
            {r === 'customer' ? 'Customer' : 'Seller'}
          </Button>
        ))}
      </div>
      <Card padding={24}>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
          {mode === 'register' ? (
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          ) : null}
          <Input
            required
            type={role === 'seller' ? 'text' : 'email'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={role === 'seller' ? 'Email or admin name' : 'Email'}
          />
          <Input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            minLength={6}
          />
          {error ? <p style={{ color: 'var(--ns-danger)', margin: 0 }}>{error}</p> : null}
          <Button type="submit" disabled={saving}>
            {saving ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Register'}
          </Button>
          {googleEnabled ? (
            <Button type="button" variant="secondary" onClick={googleAuth}>
              Continue with Google
            </Button>
          ) : null}
        </form>
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--ns-muted)' }}>
          {mode === 'login' ? (
            <>
              No account? <Link href={`/register?role=${role}`}>Register</Link>
            </>
          ) : (
            <>
              Have an account? <Link href={`/login?role=${role}`}>Log in</Link>
            </>
          )}
        </p>
      </Card>
    </main>
  );
}
