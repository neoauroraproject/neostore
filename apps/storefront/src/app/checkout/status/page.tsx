'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '@neostore/ui';
import { getApiBase } from '@/lib/catalog';

export default function CheckoutStatusPage() {
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      setError('A payment tracking code is required.');
      return;
    }
    fetch(`${getApiBase()}/track/${encodeURIComponent(code)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Unable to verify payment');
        setState(data);
      })
      .catch((err) => setError(err.message));
  }, []);

  const waitingSeller =
    state?.product?.deliveryMode === 'manual' &&
    ['Paid', 'Processing', 'PendingPayment'].includes(state?.status);

  return (
    <main className="ns-container ns-reveal" style={{ paddingTop: 48 }}>
      {!state && !error ? <Skeleton height={240} radius={16} /> : null}
      {error ? (
        <EmptyState
          title="Payment status unavailable"
          description={error}
          action={
            <Link href="/">
              <Button>Back to shop</Button>
            </Link>
          }
        />
      ) : null}
      {state ? (
        <Card padding={28} style={{ maxWidth: 640, margin: '0 auto' }}>
          <PageHeader eyebrow="Checkout" title="Payment status" description={`Order ${state.trackingCode}`} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <Badge tone={state.payment?.status === 'APPROVED' ? 'accent' : 'neutral'}>{state.status}</Badge>
            <Badge>{state.payment?.status || '—'}</Badge>
          </div>
          <p style={{ color: 'var(--ns-muted)' }}>
            {waitingSeller
              ? `Payment received or pending review. Seller delivery SLA applies${
                  state.deliverByAt ? ` (by ${new Date(state.deliverByAt).toLocaleString()})` : ''
                }. Overdue orders refund to wallet.`
              : 'We are confirming your payment and preparing delivery.'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href={`/track/${state.trackingCode}`}>
              <Button>Track order</Button>
            </Link>
            <Link href="/portal">
              <Button variant="secondary">Portal</Button>
            </Link>
          </div>
        </Card>
      ) : null}
    </main>
  );
}
