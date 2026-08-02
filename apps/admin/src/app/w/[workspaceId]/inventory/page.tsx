'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../components/SellerShell';
import { api, workspacePath } from '../../../../lib/api';

export default function InventoryPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const session = useSellerSession(workspaceId);
  const [pools, setPools] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [codes, setCodes] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadPools() {
    if (!session?.token) return;
    setLoading(true);
    try {
      const data = await api<any[]>(workspacePath(workspaceId, '/inventory/pools'), { token: session.token });
      setPools(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token, workspaceId]);

  async function createPool(e: FormEvent) {
    e.preventDefault();
    if (!session?.token || !name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api(workspacePath(workspaceId, '/inventory/pools'), {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({ name: name.trim() }),
      });
      setName('');
      setOk('Pool created.');
      await loadPools();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function openPool(id: string) {
    if (!session?.token) return;
    setError('');
    try {
      const data = await api(workspacePath(workspaceId, `/inventory/pools/${id}`), { token: session.token });
      setSelected(data);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function addCodes(e: FormEvent) {
    e.preventDefault();
    if (!session?.token || !selected?.id || !codes.trim()) return;
    setSaving(true);
    setError('');
    setOk('');
    try {
      const result = await api<{ added: number; skipped: number; remaining: number }>(
        workspacePath(workspaceId, `/inventory/pools/${selected.id}/codes`),
        {
          method: 'POST',
          token: session.token,
          body: JSON.stringify({ codes }),
        },
      );
      setCodes('');
      setOk(`Added ${result.added} codes (${result.skipped} skipped). Remaining: ${result.remaining}`);
      await openPool(selected.id);
      await loadPools();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader
        eyebrow="Fulfillment"
        title="Voucher pools"
        description="Paste codes for instant delivery. Stock syncs to products bound to each pool."
        actions={
          <Link href={`/w/${workspaceId}/products`}>
            <Button size="sm" variant="secondary">
              Products
            </Button>
          </Link>
        }
      />

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr)' }}>
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Card padding={20}>
            <form onSubmit={createPool} style={{ display: 'grid', gap: 10 }}>
              <strong>New pool</strong>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Steam $10" required />
              <Button type="submit" disabled={saving || !name.trim()}>
                Create pool
              </Button>
            </form>
          </Card>

          {loading ? <Skeleton height={100} radius={16} /> : null}
          {!loading && pools.length === 0 ? (
            <EmptyState icon="bag" title="No pools yet" description="Create a pool, then paste voucher codes." />
          ) : null}
          <div style={{ display: 'grid', gap: 8 }}>
            {pools.map((p) => (
              <Card
                key={p.id}
                variant="interactive"
                padding={16}
                onClick={() => openPool(p.id)}
                style={{ cursor: 'pointer', outline: selected?.id === p.id ? '2px solid var(--ns-accent)' : undefined }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{p.name}</strong>
                  <Badge tone="accent">{p.remaining} left</Badge>
                </div>
                <p style={{ margin: '6px 0 0', color: 'var(--ns-muted)', fontSize: 13 }}>
                  {p.total} total · {p.used} used
                </p>
              </Card>
            ))}
          </div>
        </div>

        <div>
          {!selected ? (
            <Card padding={24}>
              <p style={{ margin: 0, color: 'var(--ns-muted)' }}>Select a pool to add codes.</p>
            </Card>
          ) : (
            <Card padding={24} style={{ display: 'grid', gap: 16 }}>
              <div>
                <strong style={{ fontSize: 18 }}>{selected.name}</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--ns-muted)', fontSize: 13 }}>
                  Remaining {selected.remaining} · Used {selected.used}
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--ns-faint)' }}>
                  Bind via blueprint providerType <code>neostore.delivery.entitlement_code</code> and{' '}
                  <code>{`{"poolId":"${selected.id}"}`}</code>
                </p>
              </div>
              <form onSubmit={addCodes} style={{ display: 'grid', gap: 10 }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
                  Paste codes (one per line)
                  <textarea
                    value={codes}
                    onChange={(e) => setCodes(e.target.value)}
                    rows={8}
                    style={{
                      borderRadius: 12,
                      border: '1px solid var(--ns-border)',
                      padding: 12,
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: 13,
                      resize: 'vertical',
                    }}
                    placeholder={'CODE-1\nCODE-2\nCODE-3'}
                  />
                </label>
                <Button type="submit" disabled={saving || !codes.trim()}>
                  {saving ? 'Adding…' : 'Add codes'}
                </Button>
              </form>
              {selected.items?.length ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  <strong style={{ fontSize: 13 }}>Recent items</strong>
                  {selected.items.map((it: any) => (
                    <div
                      key={it.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        fontFamily: 'ui-monospace, monospace',
                        padding: '6px 0',
                        borderBottom: '1px solid var(--ns-border)',
                      }}
                    >
                      <span>{it.used ? '••••••••' : it.code}</span>
                      <Badge tone={it.used ? 'warning' : 'success'}>{it.used ? 'used' : 'available'}</Badge>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
          )}
        </div>
      </div>
      {ok ? <p style={{ color: 'var(--ns-success)' }}>{ok}</p> : null}
      {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
      <style>{`
        @media (max-width: 900px) {
          .ns-container > div[style*="grid-template-columns: minmax"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </SellerShell>
  );
}
