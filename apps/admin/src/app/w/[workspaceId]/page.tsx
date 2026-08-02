'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Button, Card, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../components/SellerShell';
import { api, workspacePath } from '../../../lib/api';

export default function SellerDashboardPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const session = useSellerSession(workspaceId);
  const [dash, setDash] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.token || !workspaceId) return;
    setLoading(true);
    Promise.all([
      api(workspacePath(workspaceId, '/dashboard'), { token: session.token }),
      api(workspacePath(workspaceId, '/analytics?range=7d&groupBy=day'), { token: session.token }),
    ])
      .then(([d, a]) => {
        setDash(d);
        setAnalytics(a);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.token, workspaceId]);

  const points: { date: string; revenue: number; orders: number }[] = analytics?.points || [];
  const maxRev = Math.max(1, ...points.map((p) => Number(p.revenue || 0)));

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader
        eyebrow="Seller"
        title="Dashboard"
        description="Live workspace totals from the API."
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href={`/w/${workspaceId}/homepage`}>
              <Button size="sm" variant="secondary">
                Homepage
              </Button>
            </Link>
            <Link href={`/w/${workspaceId}/products/new`}>
              <Button size="sm">New product</Button>
            </Link>
          </div>
        }
      />
      {loading ? (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={96} radius={16} />
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: 24 }}>
            {[
              { label: 'Products', value: dash?.products ?? '—' },
              { label: 'Orders', value: dash?.orders ?? '—' },
              { label: 'Customers', value: dash?.customers ?? '—' },
              { label: 'Revenue', value: dash?.revenue ?? '—' },
            ].map((s) => (
              <Card key={s.label}>
                <p style={{ margin: 0, color: 'var(--ns-muted)', fontSize: 13 }}>{s.label}</p>
                <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>{s.value}</p>
              </Card>
            ))}
          </div>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <strong>Revenue · 7d</strong>
              <Badge tone="accent">{dash?.slug || 'store'}</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
              {points.length === 0 ? (
                <p style={{ color: 'var(--ns-muted)', margin: 0 }}>No analytics points yet.</p>
              ) : (
                points.map((p) => (
                  <div key={p.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                    <div
                      title={`${p.date}: ${p.revenue}`}
                      style={{
                        width: '100%',
                        maxWidth: 28,
                        height: `${Math.max(4, (Number(p.revenue) / maxRev) * 100)}%`,
                        borderRadius: 8,
                        background: 'linear-gradient(180deg, var(--ns-accent-hover), var(--ns-accent))',
                      }}
                    />
                  </div>
                ))
              )}
            </div>
          </Card>
          {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
        </>
      )}
    </SellerShell>
  );
}
