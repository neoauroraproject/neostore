'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge, Button, Card, EmptyState, Icon, Input, PageHeader, Skeleton } from '@neostore/ui';
import { ShopChrome } from '@/components/ShopChrome';
import {
  getApiBase,
  configuredSlug,
  fetchCatalog,
  formatMoney,
  type PublicCatalog,
  type PublicProduct,
} from '@/lib/catalog';

type Step = 1 | 2 | 3 | 4;

function enabledMethods(catalog: PublicCatalog): string[] {
  const cfg = (catalog.store.paymentConfig || {}) as { methods?: Record<string, boolean> };
  const methods = cfg.methods || {};
  const list = Object.entries(methods)
    .filter(([, on]) => on)
    .map(([k]) => k);
  return list.length ? list : ['manual_bank'];
}

export function CheckoutClient({
  catalog,
  product,
  isPrimary,
}: {
  catalog: PublicCatalog;
  product: PublicProduct;
  isPrimary: boolean;
}) {
  const store = catalog.store;
  const methods = useMemo(() => enabledMethods(catalog), [catalog]);
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(methods[0] || 'manual_bank');
  const [receiptText, setReceiptText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const base = isPrimary ? '' : `/${store.slug}`;
  const isManual = paymentMethod === 'manual_bank' || paymentMethod === 'manual_crypto';

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${getApiBase()}/public/${encodeURIComponent(store.slug)}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          configName: name.trim() || 'customer',
          name: name.trim() || 'Customer',
          email: email.trim() || undefined,
          paymentMethod,
          receiptText: isManual ? receiptText.trim() || undefined : undefined,
          currency: store.defaultCurrency || 'USD',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.message === 'string' ? data.message : 'Checkout failed');
        return;
      }
      setResult(data);
      setStep(4);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ShopChrome storeTitle={store.title} storeSlug={isPrimary ? '' : store.slug}>
      <div className="ns-container" style={{ paddingTop: 28, maxWidth: 720 }}>
        <Link
          href={isPrimary ? `/p/${product.id}` : `${base}/p/${product.id}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ns-muted)', marginBottom: 16, fontSize: 14 }}
        >
          <Icon name="chevron" size={16} style={{ transform: 'rotate(180deg)' }} />
          Back to product
        </Link>
        <PageHeader eyebrow="Checkout" title={product.name} description={`${formatMoney(product, store.defaultCurrency)} · ${product.type}`} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4].map((s) => (
            <Badge key={s} tone={step === s ? 'accent' : 'neutral'}>
              {s === 1 ? 'Contact' : s === 2 ? 'Payment' : s === 3 ? 'Confirm' : 'Done'}
            </Badge>
          ))}
        </div>

        {step === 1 ? (
          <Card padding={24}>
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
                Name
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
                Email (optional)
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </label>
              <Button onClick={() => setStep(2)}>Continue</Button>
            </div>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card padding={24}>
            <div style={{ display: 'grid', gap: 10 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Payment method</p>
              {methods.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  style={{
                    textAlign: 'left',
                    padding: 14,
                    borderRadius: 12,
                    border: `1px solid ${paymentMethod === m ? 'var(--ns-ink)' : 'var(--ns-border)'}`,
                    background: paymentMethod === m ? 'var(--ns-surface-sunken)' : 'var(--ns-surface-elevated)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {m}
                </button>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)}>Continue</Button>
              </div>
            </div>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card padding={24}>
            <div style={{ display: 'grid', gap: 12 }}>
              <p style={{ margin: 0, color: 'var(--ns-muted)', fontSize: 14 }}>
                {name || 'Customer'} · {paymentMethod} · {formatMoney(product, store.defaultCurrency)}
              </p>
              {isManual ? (
                <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
                  Receipt / payment note
                  <Input
                    value={receiptText}
                    onChange={(e) => setReceiptText(e.target.value)}
                    placeholder="Transaction id or bank transfer note"
                  />
                </label>
              ) : (
                <p style={{ margin: 0, fontSize: 14, color: 'var(--ns-muted)' }}>
                  Gateway checkout will return a payment intent from the API.
                </p>
              )}
              {error ? <p style={{ color: 'var(--ns-danger)', margin: 0 }}>{error}</p> : null}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={submit} disabled={loading}>
                  {loading ? 'Placing order…' : 'Place order'}
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        {step === 4 && result ? (
          <Card padding={24}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon name="check" size={20} />
              <strong>Order placed</strong>
            </div>
            <p style={{ margin: '0 0 8px' }}>
              Tracking:{' '}
              <Link
                href={`/track/${result.trackingCode || result.order?.trackingCode}`}
                style={{ color: 'var(--ns-accent)', fontWeight: 700 }}
              >
                {result.trackingCode || result.order?.trackingCode || '—'}
              </Link>
            </p>
            {result.customer?.token || result.order?.customer?.token ? (
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ns-muted)' }}>
                Customer token (portal): {result.customer?.token || result.order?.customer?.token}
              </p>
            ) : null}
            {result.paymentUrl || result.intent?.url ? (
              <p style={{ margin: '0 0 12px' }}>
                <a href={result.paymentUrl || result.intent?.url} style={{ color: 'var(--ns-accent)', fontWeight: 600 }}>
                  Open payment link
                </a>
              </p>
            ) : null}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href={`/track/${result.trackingCode || result.order?.trackingCode}`}>
                <Button>Track order</Button>
              </Link>
              <Link href="/portal">
                <Button variant="secondary">Portal</Button>
              </Link>
              <Link href={base || '/'}>
                <Button variant="ghost">Back to shop</Button>
              </Link>
            </div>
          </Card>
        ) : null}
      </div>
    </ShopChrome>
  );
}

export default function CheckoutLoader({ isPrimary = true, slug }: { isPrimary?: boolean; slug?: string }) {
  const search = useSearchParams();
  const productId = search.get('productId') || '';
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = slug || configuredSlug() || undefined;
    fetchCatalog(s)
      .then(setCatalog)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="ns-container" style={{ paddingTop: 48 }}>
        <Skeleton height={220} radius={16} />
      </main>
    );
  }
  if (error || !catalog) {
    return (
      <main className="ns-container" style={{ paddingTop: 48 }}>
        <EmptyState title="Checkout unavailable" description={error || 'Store not found'} />
      </main>
    );
  }
  const product = catalog.products.find((p) => p.id === productId);
  if (!product) {
    return (
      <ShopChrome storeTitle={catalog.store.title} storeSlug={isPrimary ? '' : catalog.store.slug}>
        <div className="ns-container" style={{ paddingTop: 48 }}>
          <EmptyState
            icon="bag"
            title="Product missing"
            description="Choose a product from the catalog first."
            action={
              <Link href={isPrimary ? '/' : `/${catalog.store.slug}`}>
                <Button>Browse</Button>
              </Link>
            }
          />
        </div>
      </ShopChrome>
    );
  }
  return <CheckoutClient catalog={catalog} product={product} isPrimary={isPrimary} />;
}
