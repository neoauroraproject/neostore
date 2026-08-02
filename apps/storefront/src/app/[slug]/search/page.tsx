import { SearchView } from '@/components/SearchView';
import { fetchCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function SlugSearchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await fetchCatalog(slug);
  return <SearchView catalog={catalog} isPrimary={false} />;
}
