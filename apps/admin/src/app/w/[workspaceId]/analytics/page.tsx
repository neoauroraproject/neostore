'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Card, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../components/SellerShell';
import { api, workspacePath } from '../../../../lib/api';

export default function AnalyticsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const session = useSellerSession(workspaceId);
  const [range, setRange] = useState('30d');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.token) return;
    setLoading(true);
    api(workspacePath(workspaceId, `/analytics?range=${range}&groupBy=day`), { token: session.token })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.token, workspaceId, range]);

  const points: any[] = data?.points || [];
  const max = Math.max(1, ...points.map((p) => Number(p.revenue || 0)));

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader eyebrow="Insights" title="Analytics" description="Revenue and order series from the API." />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['7d', '30d', '90d', '365d'].map((r) => (
          <Button key={r} size="sm" variant={range === r ? 'primary' : 'secondary'} onClick={() => setRange(r)}>
            {r}
          </Button>
        ))}
      </div>
      {loading ? <Skeleton height={200} radius={16} /> : null}
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 180 }}>
          {points.map((p) => (
            <div key={p.date} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' }} title={`${p.date}: ${p.revenue}`}>
              <div
                style={{
                  width: '100%',
                  height: `${Math.max(3, (Number(p.revenue) / max) * 100)}%`,
                  borderRadius: 6,
                  background: 'var(--ns-accent)',
                  opacity: 0.85,
                }}
              />
            </div>
          ))}
        </div>
        <p style={{ margin: '12px 0 0', color: 'var(--ns-muted)', fontSize: 13 }}>
          {points.length} points · orders sum {points.reduce((a, p) => a + Number(p.orders || 0), 0)}
        </p>
      </Card>
      {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
    </SellerShell>
  );
}
