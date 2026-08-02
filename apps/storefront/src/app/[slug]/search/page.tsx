import { SearchView } from '@/components/SearchView';
import { fetchCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function SlugSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const catalog = await fetchCatalog(slug);
  const sp = searchParams ? await searchParams : {};
  return <SearchView catalog={catalog} isPrimary={false} initialQuery={sp.q || ''} />;
}
