'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, EmptyState, Input, PageHeader } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../../components/SellerShell';
import { API, api, workspacePath } from '../../../../../lib/api';

const fieldLabel: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 };
const selectStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 12,
  border: '1px solid var(--ns-border)',
  padding: '0 12px',
  background: 'var(--ns-surface-elevated)',
};

export default function NewProductPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const session = useSellerSession(workspaceId);
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [pools, setPools] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'Digital',
    categoryId: '',
    blueprintId: '',
    deliveryMode: 'manual',
    poolId: '',
    priceUsd: '',
    priceToman: '',
    deliverWithinMinutes: '60',
    imageUrl: '',
    featured: false,
    visible: true,
    priceBase: 'USD',
    acceptedAssets: ['USDT_TRC20', 'USDT_BEP20', 'USDC_POLYGON'] as string[],
  });
  const ASSETS = [
    { id: 'USDT_TRC20', label: 'USDT (TRC20)' },
    { id: 'USDT_BEP20', label: 'USDT (BEP20)' },
    { id: 'USDC_POLYGON', label: 'USDC (Polygon)' },
  ];

  useEffect(() => {
    if (!session?.token) return;
    Promise.all([
      api<any[]>(workspacePath(workspaceId, '/categories'), { token: session.token }),
      api<any[]>(workspacePath(workspaceId, '/blueprints'), { token: session.token }),
      api<any[]>(workspacePath(workspaceId, '/inventory/pools'), { token: session.token }).catch(() => []),
    ])
      .then(async ([cats, bps, poolList]) => {
        let nextBps = bps || [];
        if (!nextBps.length) {
          const b = await api<any>(workspacePath(workspaceId, '/blueprints'), {
            method: 'POST',
            token: session.token,
            body: JSON.stringify({ name: 'Manual Delivery', providerType: 'neostore.delivery.manual' }),
          });
          nextBps = [b];
        }
        setCategories(cats || []);
        setBlueprints(nextBps);
        setPools(poolList || []);
        setForm((f) => ({
          ...f,
          categoryId: cats?.[0]?.id || '',
          blueprintId: nextBps.find((b: any) => b.providerType === 'neostore.delivery.manual')?.id || nextBps[0]?.id || '',
          poolId: poolList?.[0]?.id || '',
        }));
      })
      .catch((e) => setError(e.message));
  }, [session?.token, workspaceId]);

  async function uploadImage(file: File) {
    if (!session?.token) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}${workspacePath(workspaceId, '/media')}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Upload failed');
      setForm((f) => ({ ...f, imageUrl: data.url }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function resolveBlueprintId(): Promise<string> {
    if (!session?.token) throw new Error('Not signed in');
    if (form.deliveryMode === 'manual') {
      const manual =
        blueprints.find((b) => b.providerType === 'neostore.delivery.manual') ||
        (await api<any>(workspacePath(workspaceId, '/blueprints'), {
          method: 'POST',
          token: session.token,
          body: JSON.stringify({ name: 'Manual Delivery', providerType: 'neostore.delivery.manual' }),
        }));
      return manual.id;
    }
    if (!form.poolId) throw new Error('Select a voucher pool for instant delivery');
    const existing = blueprints.find((b) => {
      if (b.providerType !== 'neostore.delivery.entitlement_code') return false;
      const cfg = b.providerConfig || {};
      return cfg.poolId === form.poolId;
    });
    if (existing) return existing.id;
    const pool = pools.find((p) => p.id === form.poolId);
    const created = await api<any>(workspacePath(workspaceId, '/blueprints'), {
      method: 'POST',
      token: session.token,
      body: JSON.stringify({
        name: `Pool: ${pool?.name || 'codes'}`,
        providerType: 'neostore.delivery.entitlement_code',
        providerConfig: { poolId: form.poolId },
      }),
    });
    return created.id;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session?.token) return;
    if (!form.categoryId) {
      setError('Create a category first, then select it.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const blueprintId = await resolveBlueprintId();
      await api(workspacePath(workspaceId, '/products'), {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          type: form.type,
          categoryId: form.categoryId,
          blueprintId,
          deliveryMode: form.deliveryMode,
          priceUsd: Number(form.priceUsd || 0),
          priceToman: form.priceToman ? Number(form.priceToman) : null,
          featured: form.featured,
          visible: form.visible,
          imageUrl: form.imageUrl || null,
          deliverWithinMinutes:
            form.deliveryMode === 'manual' ? Number(form.deliverWithinMinutes || 60) : null,
          stockUnlimited: form.deliveryMode !== 'instant',
          priceBase: form.priceBase || 'USD',
          acceptedAssets: form.acceptedAssets,
        }),
      });
      router.push(`/w/${workspaceId}/products`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader
        eyebrow="Products"
        title="New product"
        actions={
          <Link href={`/w/${workspaceId}/products`}>
            <Button variant="secondary" size="sm">
              Cancel
            </Button>
          </Link>
        }
      />
      {!categories.length ? (
        <EmptyState
          icon="grid"
          title="Category required"
          description="Create at least one category before adding products."
          action={
            <Link href={`/w/${workspaceId}/categories`}>
              <Button>Manage categories</Button>
            </Link>
          }
        />
      ) : (
        <Card padding={24} style={{ maxWidth: 640 }}>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
            <label style={fieldLabel}>
              Name
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label style={fieldLabel}>
              Description
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label style={fieldLabel}>
              Image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadImage(f);
                }}
              />
              {uploading ? <span style={{ color: 'var(--ns-muted)' }}>Uploading…</span> : null}
              {form.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.imageUrl} alt="" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 10 }} />
              ) : null}
            </label>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              <label style={fieldLabel}>
                Type
                <select style={selectStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {['Digital', 'Voucher', 'License', 'Subscription', 'Service'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label style={fieldLabel}>
                Delivery
                <select
                  style={selectStyle}
                  value={form.deliveryMode}
                  onChange={(e) => setForm({ ...form, deliveryMode: e.target.value })}
                >
                  <option value="manual">Delayed (manual)</option>
                  <option value="instant">Instant (voucher pool)</option>
                </select>
              </label>
            </div>
            {form.deliveryMode === 'instant' ? (
              <label style={fieldLabel}>
                Voucher pool
                {pools.length === 0 ? (
                  <p style={{ margin: 0, color: 'var(--ns-danger)', fontWeight: 500 }}>
                    No pools — <Link href={`/w/${workspaceId}/inventory`}>create one</Link> first.
                  </p>
                ) : (
                  <select
                    required
                    style={selectStyle}
                    value={form.poolId}
                    onChange={(e) => setForm({ ...form, poolId: e.target.value })}
                  >
                    {pools.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.remaining} left)
                      </option>
                    ))}
                  </select>
                )}
              </label>
            ) : (
              <label style={fieldLabel}>
                Deliver within (minutes)
                <Input
                  type="number"
                  min={1}
                  value={form.deliverWithinMinutes}
                  onChange={(e) => setForm({ ...form, deliverWithinMinutes: e.target.value })}
                />
              </label>
            )}
            <div style={{ display: 'grid', gap: 8 }}>
              <strong style={{ fontSize: 13 }}>Accepted crypto assets</strong>
              {ASSETS.map((a) => (
                <label key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={form.acceptedAssets.includes(a.id)}
                    onChange={(e) => {
                      const set = new Set(form.acceptedAssets);
                      if (e.target.checked) set.add(a.id);
                      else set.delete(a.id);
                      setForm({ ...form, acceptedAssets: [...set] });
                    }}
                  />
                  {a.label}
                </label>
              ))}
            </div>
            <label style={fieldLabel}>
              Category
              <select
                required
                style={selectStyle}
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              <label style={fieldLabel}>
                Price USD
                <Input required value={form.priceUsd} onChange={(e) => setForm({ ...form, priceUsd: e.target.value })} />
              </label>
              <label style={fieldLabel}>
                Price IRT
                <Input value={form.priceToman} onChange={(e) => setForm({ ...form, priceToman: e.target.value })} />
              </label>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
              Featured
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} />
              Visible in store
            </label>
            {error ? <p style={{ color: 'var(--ns-danger)', margin: 0 }}>{error}</p> : null}
            <Button type="submit" disabled={saving || (form.deliveryMode === 'instant' && !form.poolId)}>
              {saving ? 'Saving…' : 'Create product'}
            </Button>
          </form>
        </Card>
      )}
    </SellerShell>
  );
}
