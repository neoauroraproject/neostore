function serverApiBase(): string {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.API_URL ||
    // Docker Compose service name
    'http://api:4100/api'
  );
}

/** Browser uses relative /api (via Caddy). Server must use an absolute URL. */
export function getApiBase(): string {
  if (typeof window === 'undefined') {
    const pub = process.env.NEXT_PUBLIC_API_URL;
    if (pub && /^https?:\/\//i.test(pub)) return pub.replace(/\/$/, '');
    return serverApiBase().replace(/\/$/, '');
  }
  return (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '');
}

/** @deprecated Prefer getApiBase() — absolute on server, relative in browser */
export const API_BASE = '/api';

export type PublicStore = {
  title: string;
  slug: string;
  description?: string | null;
  defaultCurrency?: string;
  paymentConfig?: unknown;
  homepageConfig?: unknown;
  branding?: unknown;
  workspaceId?: string;
};

export type PublicProduct = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  priceUsd: number | string;
  priceToman?: number | string | null;
  featured?: boolean;
  imageUrl?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
};

export type PublicCatalog = {
  store: PublicStore;
  categories: { id: string; name: string; description?: string | null; icon?: string | null }[];
  products: PublicProduct[];
};

export function configuredSlug(): string {
  return (process.env.STORE_SLUG || process.env.NEXT_PUBLIC_STORE_SLUG || '').trim();
}

export async function fetchCatalog(slug?: string): Promise<PublicCatalog> {
  const base = getApiBase();
  const path = slug ? `${base}/public/${encodeURIComponent(slug)}` : `${base}/public`;
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
