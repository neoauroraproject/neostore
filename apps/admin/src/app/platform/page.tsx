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
          <strong>Extensions</strong>
          <p style={{ margin: '8px 0 12px', color: 'var(--ns-muted)', fontSize: 13 }}>
            Plugins & themes — install, enable, deactivate (data kept).
          </p>
          <Link href="/platform/extensions">
            <Button size="sm">Manage extensions</Button>
          </Link>
        </Card>
        <Card>
          <strong>System updates</strong>
          <p style={{ margin: '8px 0 12px', color: 'var(--ns-muted)', fontSize: 13 }}>
            Check GitHub releases and deploy GHCR images (DB migrates on API boot).
          </p>
          <Link href="/platform/updates">
            <Button size="sm">Check updates</Button>
          </Link>
        </Card>
        <Card>
          <strong>Platform settings</strong>
          <p style={{ margin: '8px 0 12px', color: 'var(--ns-muted)', fontSize: 13 }}>SMTP, Google OAuth, crypto assets.</p>
          <Link href="/platform/settings">
            <Button size="sm" variant="secondary">
              Open settings
            </Button>
          </Link>
        </Card>
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
        {['Sellers', 'Wallets', 'Payments', 'Telegram', 'Tickets', 'System'].map((m) => (
          <Card key={m}>
            <strong>{m}</strong>
            <p style={{ margin: '8px 0 0', color: 'var(--ns-muted)', fontSize: 13 }}>
              {m === 'Tickets' ? (
                <Link href="/platform/tickets">Open queue</Link>
              ) : (
                'Designed — iterate next'
              )}
            </p>
          </Card>
        ))}
      </div>
    </main>
  );
}
