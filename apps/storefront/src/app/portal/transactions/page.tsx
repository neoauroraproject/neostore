'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Card, EmptyState, Skeleton } from '@neostore/ui';
import { PortalShell, portalFetch, usePortalToken } from '@/components/PortalShell';

function Body() {
  const token = usePortalToken();
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    portalFetch('/customer/session', token)
      .then((d) => setOrders(d.orders || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);
  if (loading) return <Skeleton height={160} radius={16} />;
  if (error) return <EmptyState title="Unable to load" description={error} />;
  return (
    <Card padding={20}>
      {orders.map((o) => (
        <div
          key={o.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 0',
            borderBottom: '1px solid var(--ns-border)',
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{o.product?.name || o.configName}</div>
            <div style={{ fontSize: 13, color: 'var(--ns-muted)' }}>
              {o.amount} {o.currency} ·{' '}
              <Link href={`/track/${o.trackingCode}`} style={{ color: 'var(--ns-accent)' }}>
                #{o.trackingCode}
              </Link>
            </div>
          </div>
          <Badge>{o.status}</Badge>
        </div>
      ))}
      {!orders.length ? <p style={{ color: 'var(--ns-muted)', margin: 0 }}>No transactions yet.</p> : null}
    </Card>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense>
      <PortalShell title="Transactions" description="Purchase history and tracking codes.">
        <Body />
      </PortalShell>
    </Suspense>
  );
}
