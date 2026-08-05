'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, Input, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../../components/SellerShell';
import { API, api, workspacePath } from '../../../../../lib/api';

const fieldLabel: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 };

export default function EditProductPage() {
  const params = useParams<{ workspaceId: string; id: string }>();
  const { workspaceId, id } = params;
  const session = useSellerSession(workspaceId);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    priceUsd: '',
    priceToman: '',
    visible: true,
    featured: false,
    status: 'active',
    imageUrl: '',
    deliverWithinMinutes: '',
    priceBase: 'USD',
    acceptedAssets: [] as string[],
  });

  const ASSETS = [
    { id: 'USDT_TRC20', label: 'USDT (TRC20)' },
    { id: 'USDT_BEP20', label: 'USDT (BEP20)' },
    { id: 'USDC_POLYGON', label: 'USDC (Polygon)' },
  ];

  useEffect(() => {
    if (!session?.token) return;
    api<any[]>(workspacePath(workspaceId, '/products'), { token: session.token })
      .then((list) => {
        const p = (list || []).find((x) => x.id === id);
        if (!p) throw new Error('Product not found');
        setForm({
          name: p.name || '',
          description: p.description || '',
          priceUsd: String(p.priceUsd ?? ''),
          priceToman: p.priceToman != null ? String(p.priceToman) : '',
          visible: Boolean(p.visible),
          featured: Boolean(p.featured),
          status: p.status || 'active',
          imageUrl: p.imageUrl || '',
          deliverWithinMinutes: p.deliverWithinMinutes != null ? String(p.deliverWithinMinutes) : '',
          priceBase: p.priceBase || 'USD',
          acceptedAssets: Array.isArray(p.acceptedAssets) ? p.acceptedAssets : [],
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.token, workspaceId, id]);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session?.token) return;
    setSaving(true);
    setError('');
    try {
      await api(workspacePath(workspaceId, `/products/${id}`), {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          priceUsd: Number(form.priceUsd || 0),
          priceToman: form.priceToman ? Number(form.priceToman) : null,
          visible: form.visible,
          featured: form.featured,
          status: form.status,
          imageUrl: form.imageUrl || null,
          deliverWithinMinutes: form.deliverWithinMinutes ? Number(form.deliverWithinMinutes) : null,
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
        title="Edit product"
        actions={
          <Link href={`/w/${workspaceId}/products`}>
            <Button variant="secondary" size="sm">
              Back
            </Button>
          </Link>
        }
      />
      {loading ? <Skeleton height={240} radius={16} /> : null}
      {!loading ? (
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
                Price USD
                <Input value={form.priceUsd} onChange={(e) => setForm({ ...form, priceUsd: e.target.value })} />
              </label>
              <label style={fieldLabel}>
                Price IRT
                <Input value={form.priceToman} onChange={(e) => setForm({ ...form, priceToman: e.target.value })} />
              </label>
            </div>
            <label style={fieldLabel}>
              Deliver within (minutes)
              <Input
                type="number"
                value={form.deliverWithinMinutes}
                onChange={(e) => setForm({ ...form, deliverWithinMinutes: e.target.value })}
                placeholder="Store default if empty"
              />
            </label>
            <label style={fieldLabel}>
              Price base
              <select
                value={form.priceBase}
                onChange={(e) => setForm({ ...form, priceBase: e.target.value })}
                style={{ height: 44, borderRadius: 12, border: '1px solid var(--ns-border)', padding: '0 12px' }}
              >
                <option value="USD">USD</option>
                <option value="USDT">USDT</option>
              </select>
            </label>
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
              Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                style={{ height: 44, borderRadius: 12, border: '1px solid var(--ns-border)', padding: '0 12px' }}
              >
                <option value="active">active</option>
                <option value="draft">draft</option>
                <option value="archived">archived</option>
              </select>
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
              Featured
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} />
              Visible
            </label>
            {error ? <p style={{ color: 'var(--ns-danger)', margin: 0 }}>{error}</p> : null}
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </Card>
      ) : null}
    </SellerShell>
  );
}
