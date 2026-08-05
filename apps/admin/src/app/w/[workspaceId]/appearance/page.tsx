'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Card, Input, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../components/SellerShell';
import { api, workspacePath } from '../../../../lib/api';

const label: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 };

export default function AppearancePage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const session = useSellerSession(workspaceId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [themeId, setThemeId] = useState('neostore.theme.marketplace');
  const [brandTheme, setBrandTheme] = useState('default');
  const [extensions, setExtensions] = useState<any[]>([]);

  useEffect(() => {
    if (!session?.token) return;
    Promise.all([
      api<any>(workspacePath(workspaceId, '/profile'), { token: session.token }),
      api<any>(workspacePath(workspaceId, '/extensions'), { token: session.token }).catch(() => ({ extensions: [] })),
    ])
      .then(([profile, ext]) => {
        setThemeId(profile.themeId || 'neostore.theme.marketplace');
        setBrandTheme((profile.branding as any)?.theme || 'default');
        const list = Array.isArray(ext) ? ext : ext?.extensions || [];
        setExtensions(list.filter((e: any) => e.type === 'theme' || e.id?.includes('theme')));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.token, workspaceId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!session?.token) return;
    setSaving(true);
    setError('');
    setOk('');
    try {
      await api(workspacePath(workspaceId, '/profile'), {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({
          themeId,
          branding: { theme: brandTheme },
        }),
      });
      // activate theme extension when possible
      try {
        await api(workspacePath(workspaceId, `/extensions/${encodeURIComponent(themeId)}/enable`), {
          method: 'POST',
          token: session.token,
          body: '{}',
        });
      } catch {
        /* optional */
      }
      setOk('Appearance saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader
        eyebrow="Storefront"
        title="Appearance"
        description="Activate a theme and pick storefront visual tokens."
        actions={
          <Link href={`/w/${workspaceId}/homepage`}>
            <Button size="sm" variant="secondary">
              Homepage & menus
            </Button>
          </Link>
        }
      />
      {loading ? <Skeleton height={200} radius={16} /> : null}
      {!loading ? (
        <Card padding={24} style={{ maxWidth: 640 }}>
          <form onSubmit={save} style={{ display: 'grid', gap: 14 }}>
            <label style={label}>
              Theme
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value)}
                style={{ height: 44, borderRadius: 12, border: '1px solid var(--ns-border)', padding: '0 12px' }}
              >
                <option value="neostore.theme.marketplace">Marketplace (v1)</option>
                {extensions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name || e.id}
                  </option>
                ))}
              </select>
            </label>
            <label style={label}>
              Brand tone
              <select
                value={brandTheme}
                onChange={(e) => setBrandTheme(e.target.value)}
                style={{ height: 44, borderRadius: 12, border: '1px solid var(--ns-border)', padding: '0 12px' }}
              >
                <option value="default">Default marketplace</option>
                <option value="crypto-dark">Crypto dark</option>
              </select>
            </label>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ns-muted)' }}>
              Theme settings and payments live under{' '}
              <Link href={`/w/${workspaceId}/extensions`}>Extensions</Link>.
            </p>
            {ok ? <p style={{ color: 'var(--ns-success)', margin: 0 }}>{ok}</p> : null}
            {error ? <p style={{ color: 'var(--ns-danger)', margin: 0 }}>{error}</p> : null}
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save appearance'}
            </Button>
          </form>
        </Card>
      ) : null}
    </SellerShell>
  );
}
