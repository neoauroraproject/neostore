import { ProductDetailView, ProductNotFound } from '@/components/ProductDetailView';
import { configuredSlug, fetchCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const slug = configuredSlug();
  const catalog = await fetchCatalog(slug || undefined);
  const product = catalog.products.find((p) => p.id === productId);
  if (!product) {
    return <ProductNotFound storeTitle={catalog.store.title} storeSlug={catalog.store.slug} isPrimary />;
  }
  return <ProductDetailView catalog={catalog} product={product} isPrimary />;
}
