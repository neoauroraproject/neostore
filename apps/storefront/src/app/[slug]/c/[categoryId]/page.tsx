import { SearchView } from '@/components/SearchView';
import { fetchCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function SlugCategoryPage({
  params,
}: {
  params: Promise<{ slug: string; categoryId: string }>;
}) {
  const { slug, categoryId } = await params;
  const catalog = await fetchCatalog(slug);
  return <SearchView catalog={catalog} isPrimary={false} categoryId={categoryId} />;
}
