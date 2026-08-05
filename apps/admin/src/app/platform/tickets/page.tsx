'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Input, PageHeader, Skeleton } from '@neostore/ui';
import { api } from '../../../lib/api';
import { loadSession } from '../../../lib/session';

export default function PlatformTicketsPage() {
  const [token, setToken] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  async function load(t: string) {
    try {
      const data = await api<any[]>('/admin/platform/tickets', { token: t });
      setItems(Array.isArray(data) ? data : []);
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

  async function sendReply(id: string) {
    if (!token || !reply[id]?.trim()) return;
    await api(`/admin/platform/tickets/${id}/reply`, {
      method: 'POST',
      token,
      body: JSON.stringify({ body: reply[id] }),
    });
    setReply({ ...reply, [id]: '' });
    await load(token);
  }

  return (
    <main className="ns-container" style={{ paddingTop: 40, paddingBottom: 48 }}>
      <PageHeader
        eyebrow="Super Admin"
        title="Tickets"
        description="Customer and seller support queue."
        actions={
          <Link href="/platform">
            <Button size="sm" variant="secondary">
              Back
            </Button>
          </Link>
        }
      />
      {!items.length ? <Skeleton height={100} radius={16} /> : null}
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((t) => (
          <Card key={t.id} padding={16}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong>{t.subject}</strong>
              <Badge>{t.status}</Badge>
              <Badge tone="accent">{t.kind}</Badge>
            </div>
            <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
              {(t.messages || []).map((m: any) => (
                <p key={m.id} style={{ margin: 0, fontSize: 13 }}>
                  <Badge>{m.authorKind}</Badge> {m.body}
                </p>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Input
                value={reply[t.id] || ''}
                onChange={(e) => setReply({ ...reply, [t.id]: e.target.value })}
                placeholder="Reply…"
              />
              <Button size="sm" onClick={() => sendReply(t.id)}>
                Send
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
    </main>
  );
}
