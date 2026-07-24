'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api';

export default function ShopHome() {
  const [slug, setSlug] = useState('demo');
  const [catalog, setCatalog] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    const res = await fetch(`${API}/public/${slug}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || 'Failed to load store');
      return;
    }
    setCatalog(data);
  }

  async function buy(productId: string) {
    setError('');
    const res = await fetch(`${API}/public/${slug}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        configName: 'demo-user',
        name: 'Demo Buyer',
        paymentMethod: 'manual_bank',
        receiptText: 'PAID-DEMO',
        currency: catalog?.store?.defaultCurrency || 'USD',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(JSON.stringify(data));
      return;
    }
    setResult(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: 40 }}>
      <p style={{ letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 12, opacity: 0.6 }}>NeoStore</p>
      <h1 style={{ fontSize: 48, margin: '8px 0 24px' }}>{catalog?.store?.title || 'Storefront'}</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} style={input} />
        <button onClick={load} style={btn}>
          Load
        </button>
      </div>
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
              Buy (manual bank + receipt)
            </button>
          </article>
        ))}
      </div>
      {result ? (
        <pre style={{ marginTop: 24, background: '#fff', padding: 16, borderRadius: 12 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
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
