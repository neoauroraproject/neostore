'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../components/SellerShell';
import { api, workspacePath } from '../../../../lib/api';

export default function ProductsPage() {
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
      const data = await api<any[]>(workspacePath(workspaceId, '/products'), { token: session.token });
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

  async function remove(id: string) {
    if (!session?.token || !confirm('Delete this product?')) return;
    try {
      await api(workspacePath(workspaceId, `/products/${id}`), { method: 'DELETE', token: session.token });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Create and manage sellable items."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/w/${workspaceId}/inventory`}>
              <Button size="sm" variant="secondary">
                Inventory
              </Button>
            </Link>
            <Link href={`/w/${workspaceId}/categories`}>
              <Button size="sm" variant="secondary">
                Categories
              </Button>
            </Link>
            <Link href={`/w/${workspaceId}/products/new`}>
              <Button size="sm">New product</Button>
            </Link>
          </div>
        }
      />
      {loading ? <Skeleton height={160} radius={16} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          icon="bag"
          title="No products"
          description="Add your first product to start selling."
          action={
            <Link href={`/w/${workspaceId}/products/new`}>
              <Button>Create product</Button>
            </Link>
          }
        />
      ) : null}
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((p) => (
          <Card key={p.id} padding={16}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: 'var(--ns-surface-sunken)',
                    backgroundImage: p.imageUrl ? `url(${p.imageUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong>{p.name}</strong>
                    <Badge>{p.type}</Badge>
                    <Badge tone={p.deliveryMode === 'instant' ? 'success' : 'warning'}>
                      {p.deliveryMode || 'manual'}
                    </Badge>
                    {p.featured ? <Badge tone="accent">Featured</Badge> : null}
                    {!p.visible ? <Badge tone="warning">Hidden</Badge> : null}
                  </div>
                  <p style={{ margin: '6px 0 0', color: 'var(--ns-muted)', fontSize: 13 }}>
                    ${Number(p.priceUsd || 0).toFixed(2)}
                    {p.priceToman ? ` · ${p.priceToman} IRT` : ''}
                    {p.category?.name ? ` · ${p.category.name}` : ''}
                    {p.deliveryMode === 'instant' && !p.stockUnlimited ? ` · stock ${p.stockCount}` : ''}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href={`/w/${workspaceId}/products/${p.id}`}>
                  <Button size="sm" variant="secondary">
                    Edit
                  </Button>
                </Link>
                <Button size="sm" variant="danger" onClick={() => remove(p.id)}>
                  Delete
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
