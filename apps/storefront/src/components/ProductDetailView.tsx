'use client';

import Link from 'next/link';
import { Badge, Button, Card, EmptyState, Icon, PageHeader } from '@neostore/ui';
import { ShopChrome } from './ShopChrome';
import { formatMoney, type PublicCatalog, type PublicProduct } from '../lib/catalog';

export function ProductDetailView({
  catalog,
  product,
  isPrimary = true,
}: {
  catalog: PublicCatalog;
  product: PublicProduct;
  isPrimary?: boolean;
}) {
  const store = catalog.store;
  const base = isPrimary ? '' : `/${store.slug}`;

  return (
    <ShopChrome storeTitle={store.title} storeSlug={isPrimary ? '' : store.slug}>
      <div className="ns-container" style={{ paddingTop: 28 }}>
        <Link
          href={base || '/'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ns-muted)', marginBottom: 20, fontSize: 14 }}
        >
          <Icon name="chevron" size={16} style={{ transform: 'rotate(180deg)' }} />
          Back to shop
        </Link>
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr' }} className="ns-product-grid">
          <div
            style={{
              minHeight: 280,
              borderRadius: 'var(--ns-radius-xl)',
              background:
                'linear-gradient(145deg, var(--ns-surface-sunken) 0%, #dce8e6 50%, var(--ns-accent-soft) 100%)',
              backgroundImage: product.imageUrl ? `url(${product.imageUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--ns-font-display)',
              fontSize: 72,
              fontWeight: 700,
              color: 'var(--ns-accent-ink)',
              opacity: product.imageUrl ? 1 : 0.4,
            }}
          >
            {!product.imageUrl ? product.type?.slice(0, 1) || 'P' : null}
          </div>
          <div>
            <PageHeader
              eyebrow={product.category?.name || product.type}
              title={product.name}
              description={product.description || 'Secure checkout. Delivery per product rules.'}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              <Badge tone="accent">{product.type}</Badge>
              {product.featured ? <Badge>Featured</Badge> : null}
            </div>
            <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 24px' }}>
              {formatMoney(product, store.defaultCurrency)}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href={`${base}/checkout?productId=${encodeURIComponent(product.id)}`}>
                <Button size="lg">Buy now</Button>
              </Link>
              <Link href={`${base}/search`}>
                <Button size="lg" variant="secondary">
                  Keep browsing
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <style>{`
          @media (min-width: 900px) {
            .ns-product-grid { grid-template-columns: 1.05fr 0.95fr !important; align-items: start; }
          }
        `}</style>
      </div>
    </ShopChrome>
  );
}

export function ProductNotFound({
  storeTitle,
  storeSlug,
  isPrimary,
}: {
  storeTitle: string;
  storeSlug: string;
  isPrimary: boolean;
}) {
  return (
    <ShopChrome storeTitle={storeTitle} storeSlug={isPrimary ? '' : storeSlug}>
      <div className="ns-container" style={{ paddingTop: 48 }}>
        <EmptyState
          icon="bag"
          title="Product not found"
          description="It may have been removed or is not visible."
          action={
            <Link href={isPrimary ? '/' : `/${storeSlug}`}>
              <Button>Back to shop</Button>
            </Link>
          }
        />
      </div>
    </ShopChrome>
  );
}
