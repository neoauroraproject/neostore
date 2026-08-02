import { SearchView } from '@/components/SearchView';
import { configuredSlug, fetchCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;
  const slug = configuredSlug();
  const catalog = await fetchCatalog(slug || undefined);
  return <SearchView catalog={catalog} isPrimary categoryId={categoryId} />;
}
