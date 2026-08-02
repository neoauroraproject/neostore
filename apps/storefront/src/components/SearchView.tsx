'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, EmptyState, Input, PageHeader } from '@neostore/ui';
import { ProductCard } from './ProductCard';
import { ShopChrome } from './ShopChrome';
import type { PublicCatalog } from '../lib/catalog';

export function SearchView({
  catalog,
  isPrimary = true,
  initialQuery = '',
  categoryId,
}: {
  catalog: PublicCatalog;
  isPrimary?: boolean;
  initialQuery?: string;
  categoryId?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const store = catalog.store;
  const base = isPrimary ? '' : `/${store.slug}`;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return catalog.products.filter((p) => {
      if (categoryId && categoryId !== 'all' && p.categoryId !== categoryId && p.category?.id !== categoryId) {
        return false;
      }
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        (p.description || '').toLowerCase().includes(query) ||
        (p.type || '').toLowerCase().includes(query)
      );
    });
  }, [catalog.products, q, categoryId]);

  const categoryName =
    categoryId && categoryId !== 'all'
      ? catalog.categories.find((c) => c.id === categoryId)?.name || 'Category'
      : null;

  return (
    <ShopChrome storeTitle={store.title} storeSlug={isPrimary ? '' : store.slug}>
      <div className="ns-container" style={{ paddingTop: 28 }}>
        <PageHeader
          eyebrow={categoryName ? 'Category' : 'Search'}
          title={categoryName || 'Find products'}
          description="Filter by name, type, or description."
        />
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search catalog…"
              aria-label="Search"
            />
          </div>
          <Link href={`${base}/c/all`}>
            <Button variant="secondary">All categories</Button>
          </Link>
        </div>
        {catalog.categories.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            <Link href={`${base}/c/all`}>
              <Button size="sm" variant={!categoryId || categoryId === 'all' ? 'primary' : 'secondary'}>
                All
              </Button>
            </Link>
            {catalog.categories.map((c) => (
              <Link key={c.id} href={`${base}/c/${c.id}`}>
                <Button size="sm" variant={categoryId === c.id ? 'primary' : 'secondary'}>
                  {c.name}
                </Button>
              </Link>
            ))}
          </div>
        ) : null}
        {filtered.length === 0 ? (
          <EmptyState icon="search" title="No matches" description="Try another keyword or clear filters." />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                currency={store.defaultCurrency}
                href={isPrimary ? `/p/${p.id}` : `/${store.slug}/p/${p.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </ShopChrome>
  );
}
