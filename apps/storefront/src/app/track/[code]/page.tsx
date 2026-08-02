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

  return (
    <main className="ns-container" style={{ paddingTop: 48, paddingBottom: 64 }}>
      <PageHeader eyebrow="Tracking" title={String(code || 'Order')} description="Live order status from the API." />
      {loading ? <Skeleton height={120} radius={16} /> : null}
      {error ? <EmptyState title="Order not found" description={error} /> : null}
      {data ? (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <strong>{data.trackingCode || code}</strong>
            <Badge tone="accent">{data.status || '—'}</Badge>
          </div>
          <pre style={{ margin: 0, fontSize: 12, overflow: 'auto' }}>{JSON.stringify(data, null, 2)}</pre>
        </Card>
      ) : null}
      <div style={{ marginTop: 24 }}>
        <Link href="/">
          <Button variant="secondary">Back to shop</Button>
        </Link>
      </div>
    </main>
  );
}
