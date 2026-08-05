'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, PageHeader, Skeleton } from '@neostore/ui';
import { api } from '../../../lib/api';
import { loadSession } from '../../../lib/session';

export default function PlatformExtensionsPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  async function load(t: string) {
    try {
      const d = await api('/admin/extensions', { token: t });
      setData(d);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    const s = loadSession();
    if (!s?.token) return;
    setToken(s.token);
    void load(s.token);
  }, []);

  async function toggle(id: string, enable: boolean) {
    if (!token) return;
    await api(`/admin/extensions/${encodeURIComponent(id)}/${enable ? 'enable' : 'disable'}`, {
      method: 'POST',
      token,
    });
    await load(token);
  }

  return (
    <main className="ns-container" style={{ paddingTop: 40, paddingBottom: 48 }}>
      <PageHeader
        eyebrow="Super Admin"
        title="Extensions"
        description="Install, enable, and disable plugins and themes. Deactivate keeps settings."
        actions={
          <Link href="/platform">
            <Button size="sm" variant="secondary">
              Back
            </Button>
          </Link>
        }
      />
      {!data ? <Skeleton height={160} radius={16} /> : null}
      <div style={{ display: 'grid', gap: 10 }}>
        {(data?.runtime || []).map((e: any) => (
          <Card key={e.id} padding={16}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <strong>{e.name}</strong>
                  <Badge>{e.type}</Badge>
                  {e.official ? <Badge tone="accent">Official</Badge> : null}
                  <Badge tone={e.enabled ? 'success' : 'warning'}>{e.enabled ? 'enabled' : 'disabled'}</Badge>
                </div>
                <p style={{ margin: '6px 0 0', color: 'var(--ns-muted)', fontSize: 13 }}>
                  {e.id} · v{e.version}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="secondary" onClick={() => toggle(e.id, !e.enabled)}>
                  {e.enabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
    </main>
  );
}
