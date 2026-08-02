'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, EmptyState, Icon, Input, PageHeader, Skeleton } from '@neostore/ui';
import { getApiBase } from '@/lib/catalog';

type Tab = 'home' | 'orders' | 'wallet' | 'downloads' | 'profile';

const SESSION_KEY = 'ns_customer_session';

export default function PortalPage() {
  const [tab, setTab] = useState<Tab>('home');
  const [sessionToken, setSessionToken] = useState('');
  const [customerToken, setCustomerToken] = useState('');
  const [accessLink, setAccessLink] = useState('');
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
    if (saved) {
      setSessionToken(saved);
      void loadDashboard(saved);
    }
  }, []);

  async function loadDashboard(token: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${getApiBase()}/customer/session`, {
        headers: { 'x-customer-session': token },
      });
      const data = await res.json();
      if (!res.ok) {
        localStorage.removeItem(SESSION_KEY);
        setSessionToken('');
        setSession(null);
        setError(typeof data.message === 'string' ? data.message : 'Session expired');
        return;
      }
      setSession(data);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function loginWithCustomerToken() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${getApiBase()}/customer/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customerToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.message === 'string' ? data.message : 'Login failed');
        return;
      }
      const t = data.sessionToken as string;
      localStorage.setItem(SESSION_KEY, t);
      setSessionToken(t);
      await loadDashboard(t);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function claimAccess() {
    if (!sessionToken) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${getApiBase()}/customer/entitlements/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-customer-session': sessionToken,
        },
        body: JSON.stringify({ accessLink: accessLink.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.message === 'string' ? data.message : 'Claim failed');
        return;
      }
      setSession(data);
      setAccessLink('');
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (sessionToken) {
      await fetch(`${getApiBase()}/customer/logout`, {
        method: 'POST',
        headers: { 'x-customer-session': sessionToken },
      }).catch(() => undefined);
    }
    localStorage.removeItem(SESSION_KEY);
    setSessionToken('');
    setSession(null);
  }

  const tabs: { id: Tab; label: string; icon: 'home' | 'bag' | 'wallet' | 'download' | 'user' }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'orders', label: 'Orders', icon: 'bag' },
    { id: 'wallet', label: 'Wallet', icon: 'wallet' },
    { id: 'downloads', label: 'Downloads', icon: 'download' },
    { id: 'profile', label: 'Profile', icon: 'user' },
  ];

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--ns-surface)' }}>
      <header
        style={{
          height: 64,
          borderBottom: '1px solid var(--ns-border)',
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.86)',
          backdropFilter: 'blur(14px)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div className="ns-container" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="shield" size={20} />
            <strong style={{ fontFamily: 'var(--ns-font-display)', letterSpacing: '-0.03em' }}>Customer Portal</strong>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Back to shop
            </Button>
          </Link>
        </div>
      </header>

      <div className="ns-container" style={{ paddingTop: 28, paddingBottom: 96 }}>
        {!session ? (
          <Card padding={28} style={{ maxWidth: 440, margin: '40px auto' }}>
            <PageHeader
              eyebrow="Customer"
              title="Sign in"
              description="Use the customer token from your order confirmation. Telegram Mini App login is the next auth path."
            />
            <div style={{ display: 'grid', gap: 12 }}>
              <Input
                value={customerToken}
                onChange={(e) => setCustomerToken(e.target.value)}
                placeholder="Customer token"
                aria-label="Customer token"
              />
              <Button onClick={loginWithCustomerToken} disabled={loading || !customerToken.trim()} fullWidth>
                {loading ? 'Connecting…' : 'Continue'}
              </Button>
              {error ? <p style={{ color: 'var(--ns-danger)', margin: 0 }}>{error}</p> : null}
            </div>
          </Card>
        ) : (
          <>
            <PageHeader
              eyebrow="Portal"
              title={session?.customer?.name || session?.customer?.email || 'Welcome'}
              description="Orders, entitlements, and profile — business rules stay on the API."
              actions={
                <Button variant="secondary" size="sm" onClick={logout}>
                  Sign out
                </Button>
              }
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              {tabs.map((t) => (
                <Button key={t.id} size="sm" variant={tab === t.id ? 'primary' : 'secondary'} onClick={() => setTab(t.id)}>
                  <Icon name={t.icon} size={14} /> {t.label}
                </Button>
              ))}
            </div>

            {loading ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <Skeleton height={88} radius={16} />
                <Skeleton height={88} radius={16} />
              </div>
            ) : null}

            {tab === 'home' && !loading ? (
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {[
                  { label: 'Orders', value: session?.orders?.length ?? 0, tab: 'orders' as Tab },
                  { label: 'Downloads', value: session?.entitlements?.length ?? 0, tab: 'downloads' as Tab },
                  { label: 'Alerts', value: session?.notifications?.length ?? 0, tab: 'profile' as Tab },
                ].map((s) => (
                  <Card key={s.label} variant="interactive" onClick={() => setTab(s.tab)}>
                    <p style={{ margin: 0, color: 'var(--ns-muted)', fontSize: 13 }}>{s.label}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>{s.value}</p>
                  </Card>
                ))}
              </div>
            ) : null}

            {tab === 'orders' && !loading ? (
              (session?.orders || []).length ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {(session.orders as any[]).map((o) => (
                    <Card key={o.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <strong>{o.trackingCode || o.id}</strong>
                          <p style={{ margin: '6px 0 0', color: 'var(--ns-muted)', fontSize: 13 }}>
                            {o.product?.name || 'Product'} · {o.status}
                          </p>
                        </div>
                        <Badge>{o.status}</Badge>
                      </div>
                      {o.trackingCode ? (
                        <Link href={`/track/${o.trackingCode}`} style={{ display: 'inline-block', marginTop: 10, color: 'var(--ns-accent)', fontSize: 13, fontWeight: 600 }}>
                          Track order
                        </Link>
                      ) : null}
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState icon="bag" title="No orders yet" description="Purchases from the shop will appear here." />
              )
            ) : null}

            {tab === 'wallet' && !loading ? (
              <EmptyState
                icon="wallet"
                title="Wallet reserved"
                description="Customer ledger UI waits for wallet APIs. No temporary client-side balances."
              />
            ) : null}

            {tab === 'downloads' && !loading ? (
              <>
                <Card padding={18} style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 10px', fontWeight: 600 }}>Claim entitlement</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <Input value={accessLink} onChange={(e) => setAccessLink(e.target.value)} placeholder="Access link / key" />
                    </div>
                    <Button onClick={claimAccess} disabled={!accessLink.trim() || loading}>
                      Claim
                    </Button>
                  </div>
                </Card>
                {(session?.entitlements || []).length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {(session.entitlements as any[]).map((e) => (
                      <Card key={e.id}>
                        <strong>{e.label || e.accessKey || e.id}</strong>
                        <p style={{ margin: '6px 0 0', color: 'var(--ns-muted)', fontSize: 13 }}>{e.status || 'Active'}</p>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon="download" title="No downloads" description="Claim an access link or complete a delivery." />
                )}
              </>
            ) : null}

            {tab === 'profile' && !loading ? (
              <Card>
                <p style={{ margin: 0 }}>
                  <strong>Email:</strong> {session?.customer?.email || '—'}
                </p>
                <p style={{ margin: '8px 0 0' }}>
                  <strong>Telegram:</strong> {session?.customer?.telegramUserId || 'Not linked'}
                </p>
                {(session?.notifications || []).length ? (
                  <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
                    <strong>Notifications</strong>
                    {(session.notifications as any[]).slice(0, 8).map((n) => (
                      <p key={n.id} style={{ margin: 0, fontSize: 13, color: 'var(--ns-muted)' }}>
                        {n.title || n.body || n.id}
                      </p>
                    ))}
                  </div>
                ) : null}
                {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
              </Card>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
