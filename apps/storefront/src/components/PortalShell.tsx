'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { Button, Card, Input, PageHeader } from '@neostore/ui';
import { getApiBase } from '@/lib/catalog';
import {
  clearCustomerSession,
  getCustomerSession,
  setCustomerSession,
} from '@/lib/customer-session';

const NAV = [
  { href: '/portal', label: 'Dashboard' },
  { href: '/portal/transactions', label: 'Transactions' },
  { href: '/portal/financial', label: 'Financial' },
  { href: '/portal/profile', label: 'Profile' },
  { href: '/portal/disputes', label: 'Disputes' },
  { href: '/portal/security', label: 'Security' },
  { href: '/portal/support', label: 'Support' },
];

const PortalCtx = createContext<{ token: string }>({ token: '' });
export function usePortalToken() {
  return useContext(PortalCtx).token;
}

export function PortalShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '/portal';
  const search = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customerToken, setCustomerToken] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fromQuery = search.get('session');
    if (fromQuery) {
      setCustomerSession(fromQuery);
      router.replace(pathname || '/portal');
    }
    setToken(getCustomerSession());
    setLoading(false);
  }, [search, router, pathname]);

  function logout() {
    clearCustomerSession();
    setToken('');
    router.push('/login');
  }

  async function loginWithToken() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${getApiBase()}/customer/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customerToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Login failed');
      setCustomerSession(data.sessionToken);
      setToken(data.sessionToken);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="ns-container ns-theme-crypto-dark" style={{ paddingTop: 48 }}>
        <p style={{ color: 'var(--ns-muted)' }}>Loading…</p>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="ns-container ns-theme-crypto-dark" style={{ paddingTop: 48, maxWidth: 480 }}>
        <PageHeader
          eyebrow="Account"
          title="Customer portal"
          description="Log in with email or paste your customer access token."
        />
        <Card padding={24} style={{ display: 'grid', gap: 12 }}>
          <Link href="/login">
            <Button>Log in with email</Button>
          </Link>
          <Input
            value={customerToken}
            onChange={(e) => setCustomerToken(e.target.value)}
            placeholder="Customer token (NS-…)"
          />
          <Button variant="secondary" disabled={busy} onClick={loginWithToken}>
            Continue with token
          </Button>
          {error ? <p style={{ color: 'var(--ns-danger)', margin: 0 }}>{error}</p> : null}
        </Card>
      </main>
    );
  }

  return (
    <PortalCtx.Provider value={{ token }}>
      <main className="ns-container ns-theme-crypto-dark ns-reveal" style={{ paddingTop: 28, paddingBottom: 64 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <PageHeader eyebrow="Portal" title={title} description={description} />
          <Button size="sm" variant="secondary" onClick={logout}>
            Log out
          </Button>
        </div>
        <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button size="sm" variant={active ? 'primary' : 'secondary'}>
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        {children}
      </main>
    </PortalCtx.Provider>
  );
}

export async function portalFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      'x-customer-session': token,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === 'string' ? data.message : 'Request failed');
  return data;
}
