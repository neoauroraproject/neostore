'use client';

import { Suspense, useEffect, useState } from 'react';
import { Badge, Button, Card, EmptyState, Input, Skeleton } from '@neostore/ui';
import { PortalShell, portalFetch, usePortalToken } from '@/components/PortalShell';

function Body() {
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
      setTickets((list || []).filter((t: any) => t.kind === 'dispute'));
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
        <strong>Open a dispute</strong>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="What went wrong?" />
        <Button
          disabled={saving || !subject.trim() || !body.trim()}
          onClick={async () => {
            setSaving(true);
            setError('');
            try {
              await portalFetch('/customer/tickets', token, {
                method: 'POST',
                body: JSON.stringify({ subject, body, kind: 'dispute' }),
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
          {saving ? 'Sending…' : 'Submit dispute'}
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
        {!loading && !tickets.length ? <p style={{ color: 'var(--ns-muted)', margin: 0 }}>No disputes yet.</p> : null}
      </Card>
    </div>
  );
}

export default function DisputesPage() {
  return (
    <Suspense>
      <PortalShell title="Disputes" description="Escalate order or delivery problems to platform review.">
        <Body />
      </PortalShell>
    </Suspense>
  );
}
