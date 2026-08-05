import Link from 'next/link';
import { Badge, Button, CatalogIcon, EmptyState, Icon, Input } from '@neostore/ui';
import { ProductCard } from './ProductCard';
import { ShopChrome } from './ShopChrome';
import { formatMoney, type PublicCatalog, type PublicProduct } from '../lib/catalog';

function productHref(storeSlug: string, productId: string, isPrimary: boolean) {
  return isPrimary ? `/p/${productId}` : `/${storeSlug}/p/${productId}`;
}

function categoryHref(storeSlug: string, categoryId: string, isPrimary: boolean) {
  return isPrimary ? `/c/${categoryId}` : `/${storeSlug}/c/${categoryId}`;
}

function searchHref(storeSlug: string, isPrimary: boolean) {
  return isPrimary ? '/search' : `/${storeSlug}/search`;
}

type HomepageConfig = {
  hero?: { headline?: string; subhead?: string; ctaLabel?: string; ctaHref?: string };
  trustBullets?: string[];
  showCategoryRow?: boolean;
  featuredMode?: 'featured' | 'all' | 'manualIds';
  featuredProductIds?: string[];
  showSearch?: boolean;
  topMenu?: { id?: string; label: string; href: string; visible?: boolean }[];
};

function pickFeatured(products: PublicProduct[], cfg: HomepageConfig) {
  const mode = cfg.featuredMode || 'featured';
  if (mode === 'all') return products;
  if (mode === 'manualIds') {
    const ids = new Set(cfg.featuredProductIds || []);
    const picked = products.filter((p) => ids.has(p.id));
    return picked.length ? picked : products.filter((p) => p.featured);
  }
  const featured = products.filter((p) => p.featured);
  return featured.length ? featured : products;
}

export function ShopHomeView({
  catalog,
  isPrimary = true,
}: {
  catalog: PublicCatalog;
  isPrimary?: boolean;
}) {
  const { store, categories, products } = catalog;
  const cfg = (store.homepageConfig || {}) as HomepageConfig;
  const showSearch = cfg.showSearch !== false;
  const showCats = cfg.showCategoryRow !== false;
  const trust = (cfg.trustBullets || []).filter(Boolean);
  const grid = pickFeatured(products, cfg);
  const headline = cfg.hero?.headline?.trim() || store.title;
  const subhead =
    cfg.hero?.subhead?.trim() ||
    store.description ||
    'Digital goods with instant codes or timed manual delivery.';
  const ctaLabel = cfg.hero?.ctaLabel || 'Browse catalog';
  const ctaHrefRaw = cfg.hero?.ctaHref || '/search';
  const ctaHref =
    ctaHrefRaw.startsWith('/') && !isPrimary && !ctaHrefRaw.startsWith(`/${store.slug}`)
      ? `/${store.slug}${ctaHrefRaw}`
      : isPrimary
        ? ctaHrefRaw
        : ctaHrefRaw.startsWith('/')
          ? ctaHrefRaw
          : searchHref(store.slug, isPrimary);

  const branding = (store.branding || {}) as { theme?: string };
  const themeClass = branding.theme === 'crypto-dark' ? 'ns-theme-crypto-dark' : undefined;

  return (
    <ShopChrome
      storeTitle={store.title}
      storeSlug={isPrimary ? '' : store.slug}
      topMenu={cfg.topMenu || []}
      themeClass={themeClass}
    >
      <section className="ns-container ns-reveal" style={{ paddingTop: 20, display: 'grid', gap: 18 }}>
        {/* Search lives in expandable header */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'var(--ns-radius-xl)',
            background:
              'radial-gradient(120% 120% at 0% 0%, rgba(45,212,191,0.25) 0%, transparent 45%), linear-gradient(160deg, #0b0f14 0%, #1c2430 55%, #134e4a 100%)',
            color: '#fff',
            padding: 'clamp(24px, 4vw, 40px)',
            minHeight: 220,
            display: 'grid',
            alignContent: 'end',
            gap: 12,
          }}
          className="ns-glow-line"
        >
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--ns-font-display)',
              fontSize: 'clamp(1.85rem, 5vw, 3rem)',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              maxWidth: 640,
              fontWeight: 700,
            }}
          >
            {headline}
          </h1>
          <p style={{ margin: 0, maxWidth: 520, color: 'rgba(255,255,255,0.72)', fontSize: 15 }}>{subhead}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
            <Link href={ctaHref}>
              <Button size="lg" style={{ background: '#fff', color: 'var(--ns-ink)' }}>
                {ctaLabel}
              </Button>
            </Link>
          </div>
        </div>

        {trust.length ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'flex-start',
            }}
          >
            {trust.map((t) => (
              <Badge key={t} tone="accent" style={{ padding: '8px 12px' }}>
                <Icon name="shield" size={14} /> {t}
              </Badge>
            ))}
          </div>
        ) : null}
      </section>

      {showCats && categories.length > 0 ? (
        <section className="ns-container" style={{ paddingTop: 28 }}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingBottom: 4,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {categories.map((c) => (
              <Link
                key={c.id}
                href={categoryHref(store.slug, c.id, isPrimary)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                  padding: '10px 14px',
                  borderRadius: 999,
                  border: '1px solid var(--ns-border)',
                  background: 'var(--ns-surface-elevated)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                <CatalogIcon name={c.icon || 'box'} size={18} />
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ns-container" style={{ paddingTop: 32, paddingBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ns-muted)' }}>
              Catalog
            </p>
            <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--ns-font-display)', fontSize: 24, letterSpacing: '-0.03em' }}>
              {cfg.featuredMode === 'all' ? 'All products' : 'Featured'}
            </h2>
          </div>
          <Link href={searchHref(store.slug, isPrimary)}>
            <Button variant="secondary" size="sm">
              View all
            </Button>
          </Link>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon="bag"
            title="No products yet"
            description="This shop has an empty catalog. Check back soon."
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {grid.map((p, i) => (
              <div key={p.id} className="ns-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                <ProductCard
                  product={p}
                  currency={store.defaultCurrency}
                  href={productHref(store.slug, p.id, isPrimary)}
                />
              </div>
            ))}
          </div>
        )}

        {products.length > 0 && grid.length < products.length && cfg.featuredMode !== 'all' ? (
          <div style={{ marginTop: 28 }}>
            <h3 style={{ margin: '0 0 12px', fontFamily: 'var(--ns-font-display)', fontSize: 20 }}>More products</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              {products
                .filter((p) => !grid.some((g) => g.id === p.id))
                .map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    currency={store.defaultCurrency}
                    href={productHref(store.slug, p.id, isPrimary)}
                  />
                ))}
            </div>
          </div>
        ) : null}

        {grid[0] ? (
          <p style={{ marginTop: 24, color: 'var(--ns-muted)', fontSize: 13 }}>
            From {formatMoney(grid[0], store.defaultCurrency)} · {products.length} listed
          </p>
        ) : null}
      </section>
    </ShopChrome>
  );
}
