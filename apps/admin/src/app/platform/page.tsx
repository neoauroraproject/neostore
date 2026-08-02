'use client';

import Link from 'next/link';
import { Button, Card, PageHeader } from '@neostore/ui';

/** Super Admin route group placeholder — full modules in next slice. */
export default function PlatformHome() {
  return (
    <main className="ns-container" style={{ paddingTop: 40, paddingBottom: 48 }}>
      <PageHeader
        eyebrow="Super Admin"
        title="Platform"
        description="Route reserved for marketplace-wide ops: sellers, payments, system, website."
        actions={
          <Link href="/">
            <Button variant="secondary" size="sm">
              Back
            </Button>
          </Link>
        }
      />
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        <Card>
          <strong>Website / Homepage</strong>
          <p style={{ margin: '8px 0 12px', color: 'var(--ns-muted)', fontSize: 13 }}>
            Edit the primary shop homepage via Seller → Homepage designer for that workspace.
          </p>
          <Link href="/">
            <Button size="sm" variant="secondary">
              Open workspaces
            </Button>
          </Link>
        </Card>
        {['Sellers', 'Wallets', 'Payments', 'Telegram', 'Email', 'System'].map((m) => (
          <Card key={m}>
            <strong>{m}</strong>
            <p style={{ margin: '8px 0 0', color: 'var(--ns-muted)', fontSize: 13 }}>Designed — not implemented yet</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
