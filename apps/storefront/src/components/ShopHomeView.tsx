import Link from 'next/link';
import { Badge, Button, Card, EmptyState, Icon, PageHeader } from '@neostore/ui';
import { ProductCard } from './ProductCard';
import { ShopChrome } from './ShopChrome';
import { formatMoney, type PublicCatalog } from '../lib/catalog';

function productHref(storeSlug: string, productId: string, isPrimary: boolean) {
  return isPrimary ? `/p/${productId}` : `/${storeSlug}/p/${productId}`;
}

function categoryHref(storeSlug: string, categoryId: string, isPrimary: boolean) {
  return isPrimary ? `/c/${categoryId}` : `/${storeSlug}/c/${categoryId}`;
}

export function ShopHomeView({
  catalog,
  isPrimary = true,
}: {
  catalog: PublicCatalog;
  isPrimary?: boolean;
}) {
  const { store, categories, products } = catalog;
  const featured = products.filter((p) => p.featured);
  const rest = featured.length ? products.filter((p) => !p.featured) : products;
  const hero = featured[0] || products[0];

  return (
    <ShopChrome storeTitle={store.title} storeSlug={isPrimary ? '' : store.slug}>
      <section
        className="ns-container ns-fade-up"
        style={{
          paddingTop: 28,
          display: 'grid',
          gap: 20,
          gridTemplateColumns: '1fr',
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'var(--ns-radius-xl)',
            background:
              'radial-gradient(120% 120% at 0% 0%, #ccfbf1 0%, transparent 45%), radial-gradient(90% 80% at 100% 10%, #e2e8f0 0%, transparent 40%), linear-gradient(160deg, #0b0f14 0%, #1c2430 55%, #134e4a 100%)',
            color: '#fff',
            padding: 'clamp(28px, 5vw, 48px)',
            minHeight: 280,
            display: 'grid',
            alignContent: 'end',
            gap: 16,
          }}
        >
          <Badge tone="accent" style={{ width: 'fit-content', background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
            NeoStore
          </Badge>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--ns-font-display)',
              fontSize: 'clamp(2rem, 6vw, 3.4rem)',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              maxWidth: 640,
              fontWeight: 700,
            }}
          >
            {store.title}
          </h1>
          <p style={{ margin: 0, maxWidth: 480, color: 'rgba(255,255,255,0.72)', fontSize: 16 }}>
            {store.description || 'Curated digital products. Instant or manual delivery. Built for serious commerce.'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
            <Link href={isPrimary ? '/search' : `/${store.slug}/search`}>
              <Button
                size="lg"
                style={{ background: '#fff', color: 'var(--ns-ink)' }}
              >
                Browse catalog
              </Button>
            </Link>
            {hero ? (
              <Link href={productHref(store.slug, hero.id, isPrimary)}>
                <Button size="lg" variant="ghost" style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
                  View {hero.name}
                  <Icon name="arrow" size={16} />
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {categories.length > 0 ? (
        <section className="ns-container" style={{ paddingTop: 36 }}>
          <PageHeader eyebrow="Browse" title="Categories" description="Jump straight into what you need." />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 12,
            }}
          >
            {categories.map((c) => (
              <Link key={c.id} href={categoryHref(store.slug, c.id, isPrimary)}>
                <Card variant="interactive" padding={18}>
                  <p style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>{c.name}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ns-muted)' }}>
                    {c.description || 'Explore products'}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ns-container" style={{ paddingTop: 40 }}>
        <PageHeader
          eyebrow="Catalog"
          title={featured.length ? 'Featured' : 'Products'}
          description={`${products.length} available`}
          actions={
            <Link href={isPrimary ? '/search' : `/${store.slug}/search`}>
              <Button variant="secondary" size="sm">
                Search
              </Button>
            </Link>
          }
        />
        {products.length === 0 ? (
          <EmptyState
            icon="bag"
            title="No products yet"
            description="Open Admin to add your first product to this shop."
            action={
              <Link href="/admin">
                <Button>Open Admin</Button>
              </Link>
            }
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            {(featured.length ? featured : rest).map((p, i) => (
              <div key={p.id} className="ns-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <ProductCard
                  product={p}
                  currency={store.defaultCurrency}
                  href={productHref(store.slug, p.id, isPrimary)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {featured.length && rest.length ? (
        <section className="ns-container" style={{ paddingTop: 40 }}>
          <PageHeader eyebrow="More" title="All products" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            {rest.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                currency={store.defaultCurrency}
                href={productHref(store.slug, p.id, isPrimary)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {hero ? (
        <section className="ns-container" style={{ paddingTop: 48, paddingBottom: 8 }}>
          <Card
            padding={28}
            style={{
              display: 'grid',
              gap: 12,
              background: 'linear-gradient(120deg, var(--ns-surface-elevated), var(--ns-accent-soft))',
            }}
          >
            <Badge tone="accent">Spotlight</Badge>
            <h2 style={{ margin: 0, fontFamily: 'var(--ns-font-display)', fontSize: 28, letterSpacing: '-0.03em' }}>
              {hero.name}
            </h2>
            <p style={{ margin: 0, color: 'var(--ns-muted)', maxWidth: 520 }}>
              {hero.description || 'Ready for checkout with secure payment options.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 20 }}>{formatMoney(hero, store.defaultCurrency)}</strong>
              <Link href={productHref(store.slug, hero.id, isPrimary)}>
                <Button>
                  View details <Icon name="arrow" size={16} />
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      ) : null}
    </ShopChrome>
  );
}
