'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  CatalogIcon,
  CATALOG_ICON_NAMES,
  EmptyState,
  Input,
  PageHeader,
  Skeleton,
} from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../components/SellerShell';
import { api, workspacePath } from '../../../../lib/api';

export default function CategoriesPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const session = useSellerSession(workspaceId);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('shopping-bag');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIcon, setEditIcon] = useState('shopping-bag');

  async function load() {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api<any[]>(workspacePath(workspaceId, '/categories'), { token: session.token });
      setItems(Array.isArray(data) ? data : []);
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

  async function createCategory(e: FormEvent) {
    e.preventDefault();
    if (!session?.token || !name.trim()) return;
    setSaving(true);
    setError('');
    setOk('');
    try {
      await api(workspacePath(workspaceId, '/categories'), {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, icon }),
      });
      setName('');
      setDescription('');
      setOk('Category created.');
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id: string) {
    if (!session?.token || !editName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api(workspacePath(workspaceId, `/categories/${id}`), {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          icon: editIcon,
        }),
      });
      setEditId(null);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisible(cat: any) {
    if (!session?.token) return;
    try {
      await api(workspacePath(workspaceId, `/categories/${cat.id}`), {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({ visible: !cat.visible, enabled: cat.enabled !== false }),
      });
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function remove(id: string) {
    if (!session?.token || !confirm('Delete this category? Products in it may fail until reassigned.')) return;
    try {
      await api(workspacePath(workspaceId, `/categories/${id}`), {
        method: 'DELETE',
        token: session.token,
      });
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
          gap: 6,
          maxHeight: 180,
          overflow: 'auto',
          padding: 8,
          border: '1px solid var(--ns-border)',
          borderRadius: 12,
        }}
      >
        {CATALOG_ICON_NAMES.map((key) => (
          <button
            key={key}
            type="button"
            title={key}
            onClick={() => onChange(key)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: value === key ? '2px solid var(--ns-accent)' : '1px solid var(--ns-border)',
              background: value === key ? 'var(--ns-accent-soft)' : 'var(--ns-surface-elevated)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <CatalogIcon name={key} size={20} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader
        eyebrow="Catalog"
        title="Categories"
        description="Organize products with marketplace icons."
        actions={
          <Link href={`/w/${workspaceId}/products`}>
            <Button size="sm" variant="secondary">
              Products
            </Button>
          </Link>
        }
      />

      <Card padding={24} style={{ marginBottom: 20, maxWidth: 640 }}>
        <form onSubmit={createCategory} style={{ display: 'grid', gap: 12 }}>
          <strong>New category</strong>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Icon</div>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Create category'}
          </Button>
        </form>
      </Card>

      {loading ? <Skeleton height={120} radius={16} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState icon="grid" title="No categories yet" description="Create your first category to start adding products." />
      ) : null}

      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((c) => (
          <Card key={c.id} padding={16}>
            {editId === c.id ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                <IconPicker value={editIcon} onChange={setEditIcon} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" onClick={() => saveEdit(c.id)} disabled={saving}>
                    Save
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: 'var(--ns-surface-sunken)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <CatalogIcon name={c.icon || 'box'} size={20} />
                  </span>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <strong>{c.name}</strong>
                      {!c.visible ? <Badge tone="warning">Hidden</Badge> : <Badge tone="success">Visible</Badge>}
                    </div>
                    <p style={{ margin: '6px 0 0', color: 'var(--ns-muted)', fontSize: 13 }}>{c.description || '—'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditId(c.id);
                      setEditName(c.name || '');
                      setEditDescription(c.description || '');
                      setEditIcon(c.icon || 'shopping-bag');
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => toggleVisible(c)}>
                    {c.visible ? 'Hide' : 'Show'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => remove(c.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      {ok ? <p style={{ color: 'var(--ns-success)' }}>{ok}</p> : null}
      {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
    </SellerShell>
  );
}
