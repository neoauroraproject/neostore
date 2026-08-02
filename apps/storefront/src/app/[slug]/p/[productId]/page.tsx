import { ProductDetailView, ProductNotFound } from '@/components/ProductDetailView';
import { fetchCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function SlugProductPage({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>;
}) {
  const { slug, productId } = await params;
  const catalog = await fetchCatalog(slug);
  const product = catalog.products.find((p) => p.id === productId);
  if (!product) {
    return <ProductNotFound storeTitle={catalog.store.title} storeSlug={catalog.store.slug} isPrimary={false} />;
  }
  return <ProductDetailView catalog={catalog} product={product} isPrimary={false} />;
}
