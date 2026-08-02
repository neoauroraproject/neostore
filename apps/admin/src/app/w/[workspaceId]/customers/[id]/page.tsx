'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Button, Card, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../../components/SellerShell';
import { api, workspacePath } from '../../../../../lib/api';

export default function CustomerDetailPage() {
  const params = useParams<{ workspaceId: string; id: string }>();
  const { workspaceId, id } = params;
  const session = useSellerSession(workspaceId);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.token) return;
    api(workspacePath(workspaceId, `/customers/${id}`), { token: session.token })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.token, workspaceId, id]);

  const customer = data?.customer || data;

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader
        eyebrow="Customers"
        title={customer?.name || customer?.email || 'Customer'}
        actions={
          <Link href={`/w/${workspaceId}/customers`}>
            <Button variant="secondary" size="sm">
              Back
            </Button>
          </Link>
        }
      />
      {loading ? <Skeleton height={180} radius={16} /> : null}
      {customer ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <p style={{ margin: 0 }}>Email: {customer.email || '—'}</p>
            <p style={{ margin: '8px 0 0' }}>Telegram: {customer.telegramUserId || '—'}</p>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ns-muted)' }}>Token: {customer.token || '—'}</p>
          </Card>
          <Card>
            <strong>Orders</strong>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {(data?.orders || []).map((o: any) => (
                <Link key={o.id} href={`/w/${workspaceId}/orders/${o.id}`} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{o.trackingCode}</span>
                  <Badge>{o.status}</Badge>
                </Link>
              ))}
              {(data?.orders || []).length === 0 ? <p style={{ color: 'var(--ns-muted)', margin: 0 }}>No orders</p> : null}
            </div>
          </Card>
          <Card>
            <strong>Services</strong>
            <pre style={{ margin: '8px 0 0', fontSize: 12, overflow: 'auto' }}>
              {JSON.stringify(data?.services || [], null, 2)}
            </pre>
          </Card>
        </div>
      ) : null}
      {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
    </SellerShell>
  );
}
