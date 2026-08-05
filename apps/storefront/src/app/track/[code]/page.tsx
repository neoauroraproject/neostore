'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '@neostore/ui';
import { getApiBase } from '@/lib/catalog';

export default function TrackPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    fetch(`${getApiBase()}/track/${encodeURIComponent(code)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Not found');
        setData(json);
      })
      .catch((e) => setError(e.message || 'Failed'))
      .finally(() => setLoading(false));
  }, [code]);

  const waitingSeller =
    data?.product?.deliveryMode === 'manual' &&
    ['Paid', 'Processing', 'PendingPayment'].includes(data?.status);

  return (
    <main className="ns-container ns-reveal" style={{ paddingTop: 48, paddingBottom: 64, maxWidth: 720 }}>
      <PageHeader eyebrow="Tracking" title={String(code || 'Order')} description="Live order status." />
      {loading ? <Skeleton height={120} radius={16} /> : null}
      {error ? <EmptyState title="Order not found" description={error} /> : null}
      {data ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <Card padding={24}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <strong>{data.product?.name || data.configName}</strong>
              <Badge tone="accent">{data.status}</Badge>
            </div>
            <p style={{ margin: '0 0 8px', color: 'var(--ns-muted)' }}>
              Payment: {data.payment?.method || '—'} · {data.payment?.status || '—'}
            </p>
            <p style={{ margin: 0 }}>
              {data.amount} {data.currency}
            </p>
            {waitingSeller ? (
              <p style={{ marginTop: 12, color: 'var(--ns-muted)', fontSize: 14 }}>
                Waiting for seller delivery
                {data.deliverByAt
                  ? ` by ${new Date(data.deliverByAt).toLocaleString()}`
                  : ''}. Overdue orders refund to your wallet balance.
              </p>
            ) : null}
          </Card>
          <Card padding={24}>
            <strong>Timeline</strong>
            {(data.timeline || []).map((t: any) => (
              <div key={t.id} style={{ padding: '10px 0', borderTop: '1px solid var(--ns-border)', marginTop: 8 }}>
                <div style={{ fontWeight: 600 }}>{t.status}</div>
                <div style={{ fontSize: 13, color: 'var(--ns-muted)' }}>{t.message}</div>
                <div style={{ fontSize: 12, color: 'var(--ns-muted)' }}>{new Date(t.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {!data.timeline?.length ? <p style={{ color: 'var(--ns-muted)' }}>No events yet.</p> : null}
          </Card>
        </div>
      ) : null}
      <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
        <Link href="/">
          <Button variant="secondary">Back to shop</Button>
        </Link>
        <Link href="/portal">
          <Button variant="ghost">Portal</Button>
        </Link>
      </div>
    </main>
  );
}
