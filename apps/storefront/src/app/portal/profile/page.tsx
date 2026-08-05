'use client';

import { Suspense, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Input, Skeleton } from '@neostore/ui';
import { PortalShell, portalFetch, usePortalToken } from '@/components/PortalShell';

function Body() {
  const token = usePortalToken();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ok, setOk] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    portalFetch('/customer/session', token)
      .then((d) => {
        setName(d.customer?.name || '');
        setEmail(d.customer?.email || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);
  if (loading) return <Skeleton height={140} radius={16} />;
  return (
    <Card padding={24} style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
      <Button
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          setOk('');
          setError('');
          try {
            await portalFetch('/customer/profile', token, {
              method: 'POST',
              body: JSON.stringify({ name, email }),
            });
            setOk('Profile saved.');
          } catch (e: any) {
            setError(e.message);
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? 'Saving…' : 'Save profile'}
      </Button>
      {ok ? <p style={{ color: 'var(--ns-success)', margin: 0 }}>{ok}</p> : null}
      {error ? <EmptyState title="Error" description={error} /> : null}
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <Suspense>
      <PortalShell title="Profile" description="Update how we address you on invoices and notices.">
        <Body />
      </PortalShell>
    </Suspense>
  );
}
