'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, EmptyState, Input, PageHeader } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../../components/SellerShell';
import { api, workspacePath } from '../../../../../lib/api';

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
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'Digital',
    categoryId: '',
    blueprintId: '',
    deliveryMode: 'manual',
    priceUsd: '',
    priceToman: '',
    featured: false,
    visible: true,
  });

  useEffect(() => {
    if (!session?.token) return;
    Promise.all([
      api<any[]>(workspacePath(workspaceId, '/categories'), { token: session.token }),
      api<any[]>(workspacePath(workspaceId, '/blueprints'), { token: session.token }),
    ])
      .then(async ([cats, bps]) => {
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
        setForm((f) => ({
          ...f,
          categoryId: cats?.[0]?.id || '',
          blueprintId: nextBps[0]?.id || '',
        }));
      })
      .catch((e) => setError(e.message));
  }, [session?.token, workspaceId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session?.token) return;
    if (!form.categoryId) {
      setError('Create a category first, then select it.');
      return;
    }
    if (!form.blueprintId) {
      setError('Delivery blueprint missing.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api(workspacePath(workspaceId, '/products'), {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          type: form.type,
          categoryId: form.categoryId,
          blueprintId: form.blueprintId,
          deliveryMode: form.deliveryMode,
          priceUsd: Number(form.priceUsd || 0),
          priceToman: form.priceToman ? Number(form.priceToman) : null,
          featured: form.featured,
          visible: form.visible,
          stockUnlimited: true,
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
                  <option value="manual">manual</option>
                  <option value="instant">instant</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
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
              <label style={fieldLabel}>
                Blueprint
                <select
                  required
                  style={selectStyle}
                  value={form.blueprintId}
                  onChange={(e) => setForm({ ...form, blueprintId: e.target.value })}
                >
                  {blueprints.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
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
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Create product'}
            </Button>
          </form>
        </Card>
      )}
    </SellerShell>
  );
}
