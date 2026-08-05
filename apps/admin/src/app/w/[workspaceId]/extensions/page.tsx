'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Button, Card, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../components/SellerShell';
import { api, workspacePath } from '../../../../lib/api';

export default function WorkspaceExtensionsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const session = useSellerSession(workspaceId);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!session?.token) return;
    setLoading(true);
    try {
      const data = await api<any>(workspacePath(workspaceId, '/extensions'), { token: session.token });
      setItems(data.extensions || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token, workspaceId]);

  async function toggle(id: string, enable: boolean) {
    if (!session?.token) return;
    await api(workspacePath(workspaceId, `/extensions/${encodeURIComponent(id)}/${enable ? 'enable' : 'disable'}`), {
      method: 'POST',
      token: session.token,
    });
    await load();
  }

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader
        eyebrow="Plugins"
        title="Extensions"
        description="Activate payment gateways and themes for this workspace. Settings survive deactivate."
      />
      {loading ? <Skeleton height={120} radius={16} /> : null}
      <div style={{ display: 'grid', gap: 10 }}>
        {items
          .filter((e) => ['payment_gateway', 'theme'].includes(e.type))
          .map((e) => (
            <Card key={e.id} padding={16}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <strong>{e.name}</strong>
                    <Badge>{e.type}</Badge>
                    <Badge tone={e.workspaceEnabled ? 'success' : 'warning'}>
                      {e.workspaceEnabled ? 'active' : 'off'}
                    </Badge>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ns-muted)' }}>{e.id}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link href={`/w/${workspaceId}/extensions/${encodeURIComponent(e.id)}`}>
                    <Button size="sm" variant="secondary">
                      Settings
                    </Button>
                  </Link>
                  <Button size="sm" onClick={() => toggle(e.id, !e.workspaceEnabled)}>
                    {e.workspaceEnabled ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
      </div>
      {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
    </SellerShell>
  );
}
