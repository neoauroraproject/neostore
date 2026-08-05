'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Card, Input, PageHeader, Skeleton, Badge } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../components/SellerShell';
import { api, workspacePath } from '../../../../lib/api';

export default function SellerTicketsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const session = useSellerSession(workspaceId);
  const [items, setItems] = useState<any[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!session?.token) return;
    setLoading(true);
    try {
      const data = await api<any[]>(workspacePath(workspaceId, '/tickets'), { token: session.token });
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token, workspaceId]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!session?.token) return;
    try {
      await api(workspacePath(workspaceId, '/tickets'), {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({ subject, body }),
      });
      setSubject('');
      setBody('');
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader eyebrow="Support" title="Tickets" description="Message Super Admin about orders or account issues." />
      <Card padding={20} style={{ marginBottom: 16, maxWidth: 560 }}>
        <form onSubmit={create} style={{ display: 'grid', gap: 10 }}>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" required />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={4}
            style={{ borderRadius: 12, border: '1px solid var(--ns-border)', padding: 12 }}
            placeholder="Describe the issue"
          />
          <Button type="submit">Open ticket</Button>
        </form>
      </Card>
      {loading ? <Skeleton height={100} radius={16} /> : null}
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((t) => (
          <Card key={t.id} padding={16}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <strong>{t.subject}</strong>
              <Badge>{t.status}</Badge>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ns-muted)' }}>
              {t.messages?.[0]?.body || '—'}
            </p>
          </Card>
        ))}
      </div>
      {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
    </SellerShell>
  );
}
