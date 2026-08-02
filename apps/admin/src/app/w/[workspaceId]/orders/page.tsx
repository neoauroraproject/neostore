'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../components/SellerShell';
import { api, workspacePath } from '../../../../lib/api';

export default function OrdersPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const session = useSellerSession(workspaceId);
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.token) return;
    setLoading(true);
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    api<any[]>(workspacePath(workspaceId, `/orders${q}`), { token: session.token })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.token, workspaceId, status]);

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader eyebrow="Commerce" title="Orders" description="Review payments and fulfill deliveries." />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {['', 'PendingPayment', 'Paid', 'Processing', 'Completed', 'Delivered', 'Cancelled'].map((s) => (
          <Button key={s || 'all'} size="sm" variant={status === s ? 'primary' : 'secondary'} onClick={() => setStatus(s)}>
            {s || 'All'}
          </Button>
        ))}
      </div>
      {loading ? <Skeleton height={140} radius={16} /> : null}
      {!loading && items.length === 0 ? <EmptyState icon="bag" title="No orders" description="Orders will appear after checkout." /> : null}
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((o) => (
          <Card key={o.id} padding={16}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>{o.trackingCode || o.id}</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--ns-muted)', fontSize: 13 }}>
                  {o.product?.name || 'Product'} · {o.amount} {o.currency}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge>{o.status}</Badge>
                <Link href={`/w/${workspaceId}/orders/${o.id}`}>
                  <Button size="sm" variant="secondary">
                    Open
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
    </SellerShell>
  );
}
