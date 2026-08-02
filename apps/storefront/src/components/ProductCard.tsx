import Link from 'next/link';
import { Badge, Card } from '@neostore/ui';
import { formatMoney, type PublicProduct } from '../lib/catalog';

export function ProductCard({
  product,
  href,
  currency,
}: {
  product: PublicProduct;
  href: string;
  currency?: string;
}) {
  return (
    <Link href={href} style={{ display: 'block' }}>
      <Card variant="interactive" padding={0} style={{ overflow: 'hidden', height: '100%' }}>
        <div
          style={{
            height: 140,
            background:
              'linear-gradient(145deg, var(--ns-surface-sunken) 0%, #dce8e6 45%, var(--ns-accent-soft) 100%)',
            position: 'relative',
            backgroundImage: product.imageUrl ? `url(${product.imageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {product.featured ? (
            <div style={{ position: 'absolute', top: 12, left: 12 }}>
              <Badge tone="accent">Featured</Badge>
            </div>
          ) : null}
          {!product.imageUrl ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--ns-font-display)',
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '-0.04em',
                color: 'var(--ns-accent-ink)',
                opacity: 0.35,
              }}
            >
              {product.type?.slice(0, 1) || 'P'}
            </div>
          ) : null}
        </div>
        <div style={{ padding: 14, display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
            <h3 style={{ margin: 0, fontSize: 14, letterSpacing: '-0.02em', lineHeight: 1.3 }}>{product.name}</h3>
            <Badge>{product.type}</Badge>
          </div>
          <p
            style={{
              margin: 0,
              color: 'var(--ns-muted)',
              fontSize: 12,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 32,
            }}
          >
            {product.description || 'Digital product'}
          </p>
          <p style={{ margin: '2px 0 0', fontWeight: 700, letterSpacing: '-0.02em', fontSize: 15 }}>
            {formatMoney(product, currency)}
          </p>
        </div>
      </Card>
    </Link>
  );
}
