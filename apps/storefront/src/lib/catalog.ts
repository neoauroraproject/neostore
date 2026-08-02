export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export type PublicStore = {
  title: string;
  slug: string;
  description?: string | null;
  defaultCurrency?: string;
  paymentConfig?: unknown;
};

export type PublicProduct = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  priceUsd: number | string;
  priceToman?: number | string | null;
  featured?: boolean;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
};

export type PublicCatalog = {
  store: PublicStore;
  categories: { id: string; name: string; description?: string | null }[];
  products: PublicProduct[];
};

export function configuredSlug(): string {
  return (process.env.STORE_SLUG || process.env.NEXT_PUBLIC_STORE_SLUG || '').trim();
}

export async function fetchCatalog(slug?: string): Promise<PublicCatalog> {
  const path = slug ? `${API_BASE}/public/${encodeURIComponent(slug)}` : `${API_BASE}/public`;
  const res = await fetch(path, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data?.message === 'string' ? data.message : 'Failed to load store');
  }
  return data as PublicCatalog;
}

export function formatMoney(product: PublicProduct, currency?: string) {
  const cur = (currency || 'USD').toUpperCase();
  if (cur === 'IRT' || cur === 'TOMAN') {
    const n = Number(product.priceToman || 0);
    return `${n.toLocaleString()} IRT`;
  }
  return `$${Number(product.priceUsd || 0).toFixed(2)}`;
}
