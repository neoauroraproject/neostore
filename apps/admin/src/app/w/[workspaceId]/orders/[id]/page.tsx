'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Button, Card, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../../components/SellerShell';
import { api, workspacePath } from '../../../../../lib/api';

export default function OrderDetailPage() {
  const params = useParams<{ workspaceId: string; id: string }>();
  const { workspaceId, id } = params;
  const session = useSellerSession(workspaceId);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  async function load() {
    if (!session?.token) return;
    setLoading(true);
    try {
      const data = await api(workspacePath(workspaceId, `/orders/${id}`), { token: session.token });
      setOrder(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token, workspaceId, id]);

  async function act(action: 'approve' | 'reject' | 'fulfill') {
    if (!session?.token) return;
    setBusy(action);
    setError('');
    try {
      const body =
        action === 'reject'
          ? JSON.stringify({ reason: prompt('Reject reason (optional)') || undefined })
          : undefined;
      await api(workspacePath(workspaceId, `/orders/${id}/${action}`), {
        method: 'POST',
        token: session.token,
        body,
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader
        eyebrow="Orders"
        title={order?.trackingCode || 'Order'}
        actions={
          <Link href={`/w/${workspaceId}/orders`}>
            <Button variant="secondary" size="sm">
              Back
            </Button>
          </Link>
        }
      />
      {loading ? <Skeleton height={200} radius={16} /> : null}
      {order ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <Badge tone="accent">{order.status}</Badge>
                <p style={{ margin: '12px 0 0' }}>
                  <strong>{order.product?.name}</strong>
                </p>
                <p style={{ margin: '6px 0 0', color: 'var(--ns-muted)', fontSize: 14 }}>
                  {order.amount} {order.currency} · {order.customer?.name || order.customer?.email || 'Customer'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="sm" disabled={!!busy} onClick={() => act('approve')}>
                  {busy === 'approve' ? '…' : 'Approve'}
                </Button>
                <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => act('fulfill')}>
                  {busy === 'fulfill' ? '…' : 'Fulfill'}
                </Button>
                <Button size="sm" variant="danger" disabled={!!busy} onClick={() => act('reject')}>
                  {busy === 'reject' ? '…' : 'Reject'}
                </Button>
              </div>
            </div>
          </Card>
          <Card>
            <strong>Payment</strong>
            <pre style={{ margin: '8px 0 0', fontSize: 12, overflow: 'auto' }}>
              {JSON.stringify(order.payment, null, 2)}
            </pre>
          </Card>
          <Card>
            <strong>Timeline</strong>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {(order.timeline || []).map((t: any) => (
                <div key={t.id} style={{ fontSize: 13, color: 'var(--ns-muted)' }}>
                  <Badge>{t.status}</Badge> {t.message}
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
      {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
    </SellerShell>
  );
}
