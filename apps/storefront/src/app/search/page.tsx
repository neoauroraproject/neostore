import { SearchView } from '@/components/SearchView';
import { configuredSlug, fetchCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const slug = configuredSlug();
  const catalog = await fetchCatalog(slug || undefined);
  const sp = searchParams ? await searchParams : {};
  return <SearchView catalog={catalog} isPrimary initialQuery={sp.q || ''} />;
}
