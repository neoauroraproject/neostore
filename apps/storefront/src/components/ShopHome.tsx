'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const DEFAULT_SLUG = process.env.NEXT_PUBLIC_STORE_SLUG || 'demo';

export function ShopHome({ initialSlug }: { initialSlug?: string }) {
  const [slug, setSlug] = useState(initialSlug || DEFAULT_SLUG);
  const [catalog, setCatalog] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(nextSlug = slug) {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/public/${encodeURIComponent(nextSlug)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to load store');
        setCatalog(null);
        return;
      }
      setCatalog(data);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function buy(productId: string) {
    setError('');
    const res = await fetch(`${API}/public/${encodeURIComponent(slug)}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        configName: 'customer',
        name: 'Customer',
        paymentMethod: 'manual_bank',
        receiptText: 'PAID',
        currency: catalog?.store?.defaultCurrency || 'USD',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.message === 'string' ? data.message : JSON.stringify(data));
      return;
    }
    setResult(data);
  }

  useEffect(() => {
    const s = initialSlug || DEFAULT_SLUG;
    setSlug(s);
    load(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSlug]);

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: 40 }}>
      <p style={{ letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 12, opacity: 0.6 }}>NeoStore</p>
      <h1 style={{ fontSize: 48, margin: '8px 0 24px' }}>
        {catalog?.store?.title || (loading ? 'Loading…' : 'Store')}
      </h1>
      {!initialSlug ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} style={input} />
          <button onClick={() => load()} style={btn}>
            Load
          </button>
        </div>
      ) : null}
      {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
      <div style={{ display: 'grid', gap: 16 }}>
        {(catalog?.products || []).map((p: any) => (
          <article key={p.id} style={card}>
            <h2 style={{ margin: 0 }}>{p.name}</h2>
            <p style={{ opacity: 0.7 }}>{p.description}</p>
            <p>
              {p.priceUsd} USD{p.priceToman ? ` · ${p.priceToman} IRT` : ''} · {p.type}
            </p>
            <button onClick={() => buy(p.id)} style={btn}>
              Buy
            </button>
          </article>
        ))}
      </div>
      {!loading && catalog && (catalog.products || []).length === 0 ? (
        <p style={{ opacity: 0.7 }}>No products yet. Open Admin to add some.</p>
      ) : null}
      {result ? (
        <pre style={{ marginTop: 24, background: '#fff', padding: 16, borderRadius: 12 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
      <p style={{ marginTop: 40, fontSize: 13, opacity: 0.55 }}>
        <a href="/admin" style={{ color: 'inherit' }}>
          Admin
        </a>
        {' · '}
        <a href="/api/docs" style={{ color: 'inherit' }}>
          API docs
        </a>
      </p>
    </main>
  );
}

const input: React.CSSProperties = {
  flex: 1,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #d6cfc4',
};
const btn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: 0,
  background: '#111',
  color: '#fff',
  cursor: 'pointer',
};
const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
};
