'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, EmptyState, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../components/SellerShell';
import { api, workspacePath } from '../../../../lib/api';

export default function WalletPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const session = useSellerSession(workspaceId);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.token) return;
    api(workspacePath(workspaceId, '/wallet/settlement-preview'), { token: session.token })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.token, workspaceId]);

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader
        eyebrow="Finance"
        title="Wallet"
        description="Settlement preview only — payout APIs are not exposed yet (no fake buttons)."
      />
      {loading ? <Skeleton height={140} radius={16} /> : null}
      {data ? (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {[
            { label: 'Gross', value: data.gross },
            { label: 'Commission', value: data.commission },
            { label: 'Settleable', value: data.settleable },
            { label: 'Rate', value: data.commissionRate },
          ].map((s) => (
            <Card key={s.label}>
              <p style={{ margin: 0, color: 'var(--ns-muted)', fontSize: 13 }}>{s.label}</p>
              <p style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 700 }}>{String(s.value ?? '—')}</p>
            </Card>
          ))}
        </div>
      ) : null}
      <div style={{ marginTop: 16 }}>
        <EmptyState
          icon="wallet"
          title="Ledger & payouts reserved"
          description={data?.note || 'Request settlement and workspace ledger land when backend endpoints ship.'}
        />
      </div>
      {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
    </SellerShell>
  );
}
