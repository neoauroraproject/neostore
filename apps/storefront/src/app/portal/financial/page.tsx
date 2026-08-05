'use client';

import { Suspense, useEffect, useState } from 'react';
import { Badge, Card, EmptyState, Skeleton } from '@neostore/ui';
import { PortalShell, portalFetch, usePortalToken } from '@/components/PortalShell';

function Body() {
  const token = usePortalToken();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    portalFetch('/customer/financial', token)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);
  if (loading) return <Skeleton height={160} radius={16} />;
  if (error) return <EmptyState title="Unable to load" description={error} />;
  if (!data) return null;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
        {(data.balances || []).map((b: any) => (
          <Card key={b.accountId || b.currency} padding={16}>
            <div style={{ color: 'var(--ns-muted)', fontSize: 12 }}>{b.currency} balance</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{Number(b.balance).toFixed(2)}</div>
          </Card>
        ))}
      </div>
      <Card padding={20}>
        <strong>Ledger</strong>
        {(data.entries || []).map((e: any) => (
          <div
            key={e.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderTop: '1px solid var(--ns-border)',
              marginTop: 8,
            }}
          >
            <div>
              <Badge>{e.type}</Badge>
              <div style={{ fontSize: 12, color: 'var(--ns-muted)', marginTop: 4 }}>
                {new Date(e.createdAt).toLocaleString()}
              </div>
            </div>
            <strong>
              {e.amount} {e.currency}
            </strong>
          </div>
        ))}
        {!data.entries?.length ? <p style={{ color: 'var(--ns-muted)' }}>No ledger entries yet.</p> : null}
      </Card>
    </div>
  );
}

export default function FinancialPage() {
  return (
    <Suspense>
      <PortalShell title="Financial" description="Wallet balances and ledger activity.">
        <Body />
      </PortalShell>
    </Suspense>
  );
}
