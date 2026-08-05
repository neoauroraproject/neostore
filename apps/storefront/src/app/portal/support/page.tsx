'use client';

import { Suspense, useEffect, useState } from 'react';
import { Badge, Button, Card, EmptyState, Input, Skeleton } from '@neostore/ui';
import { PortalShell, portalFetch, usePortalToken } from '@/components/PortalShell';

function TicketsBody({ kind, createLabel }: { kind?: string; createLabel: string }) {
  const token = usePortalToken();
  const [tickets, setTickets] = useState<any[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const list = await portalFetch('/customer/tickets', token);
      setTickets((list || []).filter((t: any) => (kind ? t.kind === kind : t.kind !== 'dispute')));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
      <Card padding={20} style={{ display: 'grid', gap: 10 }}>
        <strong>{createLabel}</strong>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe the issue" />
        <Button
          disabled={saving || !subject.trim() || !body.trim()}
          onClick={async () => {
            setSaving(true);
            setError('');
            try {
              await portalFetch('/customer/tickets', token, {
                method: 'POST',
                body: JSON.stringify({ subject, body, kind: kind || 'support' }),
              });
              setSubject('');
              setBody('');
              await load();
            } catch (e: any) {
              setError(e.message);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Sending…' : 'Submit'}
        </Button>
      </Card>
      {loading ? <Skeleton height={120} radius={16} /> : null}
      {error ? <EmptyState title="Error" description={error} /> : null}
      <Card padding={20}>
        {tickets.map((t) => (
          <div key={t.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--ns-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong>{t.subject}</strong>
              <Badge>{t.status}</Badge>
            </div>
            <p style={{ margin: '8px 0 0', color: 'var(--ns-muted)', fontSize: 13 }}>
              {(t.messages || []).slice(-1)[0]?.body || 'No messages'}
            </p>
          </div>
        ))}
        {!loading && !tickets.length ? <p style={{ color: 'var(--ns-muted)', margin: 0 }}>No tickets yet.</p> : null}
      </Card>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense>
      <PortalShell title="Support" description="Reach the platform team for help with orders and account issues.">
        <TicketsBody createLabel="New support ticket" />
      </PortalShell>
    </Suspense>
  );
}
