'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, EmptyState, Skeleton } from '@neostore/ui';
import { PortalShell, portalFetch, usePortalToken } from '@/components/PortalShell';

function DashboardBody() {
  const token = usePortalToken();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalFetch('/customer/session', token)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Skeleton height={180} radius={16} />;
  if (error) return <EmptyState title="Could not load dashboard" description={error} />;
  if (!data) return null;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card padding={20}>
        <strong>{data.customer?.name || data.customer?.email || 'Customer'}</strong>
        <p style={{ margin: '8px 0 0', color: 'var(--ns-muted)', fontSize: 14 }}>
          {data.customer?.email || data.customer?.token}
        </p>
      </Card>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
        <Card padding={16}>
          <div style={{ color: 'var(--ns-muted)', fontSize: 12 }}>Orders</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{data.orders?.length || 0}</div>
        </Card>
        <Card padding={16}>
          <div style={{ color: 'var(--ns-muted)', fontSize: 12 }}>Services</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{data.entitlements?.length || 0}</div>
        </Card>
      </div>
      <Card padding={20}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <strong>Recent orders</strong>
          <Link href="/portal/transactions">
            <Button size="sm" variant="ghost">
              View all
            </Button>
          </Link>
        </div>
        {(data.orders || []).slice(0, 5).map((o: any) => (
          <div
            key={o.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 0',
              borderTop: '1px solid var(--ns-border)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{o.product?.name || o.configName}</div>
              <div style={{ fontSize: 13, color: 'var(--ns-muted)' }}>#{o.trackingCode}</div>
            </div>
            <Badge tone="accent">{o.status}</Badge>
          </div>
        ))}
        {!data.orders?.length ? <p style={{ color: 'var(--ns-muted)', margin: 0 }}>No orders yet.</p> : null}
      </Card>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={<main className="ns-container" style={{ paddingTop: 48 }}>Loading…</main>}>
      <PortalShell title="Dashboard" description="Orders, balances, and downloads at a glance.">
        <DashboardBody />
      </PortalShell>
    </Suspense>
  );
}
