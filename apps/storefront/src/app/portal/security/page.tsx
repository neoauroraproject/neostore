'use client';

import { Suspense, useState } from 'react';
import { Button, Card, EmptyState, Input } from '@neostore/ui';
import { PortalShell, portalFetch, usePortalToken } from '@/components/PortalShell';

function Body() {
  const token = usePortalToken();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [ok, setOk] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Card padding={24} style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
      <Input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Current password (if set)"
      />
      <Input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password (6+)"
        minLength={6}
      />
      <Button
        disabled={saving || newPassword.length < 6}
        onClick={async () => {
          setSaving(true);
          setOk('');
          setError('');
          try {
            await portalFetch('/customer/security/password', token, {
              method: 'POST',
              body: JSON.stringify({ currentPassword, newPassword }),
            });
            setOk('Password updated.');
            setCurrentPassword('');
            setNewPassword('');
          } catch (e: any) {
            setError(e.message);
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? 'Saving…' : 'Update password'}
      </Button>
      {ok ? <p style={{ color: 'var(--ns-success)', margin: 0 }}>{ok}</p> : null}
      {error ? <EmptyState title="Error" description={error} /> : null}
    </Card>
  );
}

export default function SecurityPage() {
  return (
    <Suspense>
      <PortalShell title="Security" description="Change your portal password.">
        <Body />
      </PortalShell>
    </Suspense>
  );
}
