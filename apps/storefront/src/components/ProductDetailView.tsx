'use client';

import Link from 'next/link';
import { Badge, Button, Card, EmptyState, Icon, PageHeader } from '@neostore/ui';
import { ShopChrome } from './ShopChrome';
import { formatMoney, type PublicCatalog, type PublicProduct } from '../lib/catalog';

export function ProductNotFound({
  storeTitle,
  storeSlug,
  isPrimary = true,
}: {
  storeTitle: string;
  storeSlug: string;
  isPrimary?: boolean;
}) {
  return (
    <ShopChrome storeTitle={storeTitle} storeSlug={isPrimary ? '' : storeSlug}>
      <div className="ns-container" style={{ paddingTop: 48 }}>
        <EmptyState
          icon="bag"
          title="Product not found"
          description="This listing may be unavailable."
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
  const platformAssets = store.cryptoAssets || [];
  const accepted = Array.isArray(product.acceptedAssets)
    ? (product.acceptedAssets as string[])
    : [];
  const resolved =
    accepted.length > 0
      ? platformAssets.filter((a) => accepted.includes(a.id))
      : platformAssets.filter((a) => (a as { enabled?: boolean }).enabled !== false);
  const usd = Number(product.priceUsd || 0);
  const cryptoPrices = resolved
    .filter((asset) => Number(asset.rateToUsd || 0) > 0)
    .map((asset) => ({
      ...asset,
      amount: usd / Number(asset.rateToUsd),
    }));
  const inStock = product.stockUnlimited !== false || Number(product.stockCount || 0) > 0;

  return (
    <ShopChrome
      storeTitle={store.title}
      storeSlug={isPrimary ? '' : store.slug}
      topMenu={((store.homepageConfig as any)?.topMenu || []) as any}
      themeClass={(store.branding as any)?.theme === 'crypto-dark' ? 'ns-theme-crypto-dark' : undefined}
    >
      <div className="ns-container ns-reveal" style={{ paddingTop: 28 }}>
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
              minHeight: 320,
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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <Badge tone="accent">{product.type}</Badge>
              {product.featured ? <Badge>Featured</Badge> : null}
              <Badge tone={inStock ? 'accent' : 'neutral'}>
                {product.stockUnlimited !== false
                  ? 'In stock'
                  : `${product.stockCount || 0} left`}
              </Badge>
              {product.deliveryMode === 'manual' ? <Badge>Seller delivery</Badge> : <Badge>Fast redeem</Badge>}
            </div>
            <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
              {formatMoney(product, store.defaultCurrency)}
            </p>
            {cryptoPrices.length ? (
              <Card padding={14} style={{ margin: '0 0 20px' }}>
                <p
                  style={{
                    margin: '0 0 8px',
                    color: 'var(--ns-muted)',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Crypto estimates
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {cryptoPrices.map((asset) => (
                    <Badge key={asset.id} tone="accent">
                      {asset.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })} {asset.symbol}
                      {asset.network ? ` · ${asset.network}` : ''}
                    </Badge>
                  ))}
                </div>
              </Card>
            ) : null}
            <Card padding={18} style={{ marginBottom: 16 }}>
              <strong>Buy box</strong>
              <p style={{ margin: '8px 0 12px', color: 'var(--ns-muted)', fontSize: 14 }}>
                Pay with wallet balance or enabled gateways. Manual products wait for seller fulfillment SLA.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href={`${base}/checkout?productId=${encodeURIComponent(product.id)}`}>
                  <Button size="lg" disabled={!inStock}>
                    {inStock ? 'Buy now' : 'Out of stock'}
                  </Button>
                </Link>
                <Link href={`${base}/search`}>
                  <Button size="lg" variant="secondary">
                    Keep browsing
                  </Button>
                </Link>
              </div>
            </Card>
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
