import { ShopHomeView } from '@/components/ShopHomeView';
import { fetchCatalog } from '@/lib/catalog';
import { EmptyState, Button } from '@neostore/ui';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const RESERVED = new Set(['search', 'portal', 'admin', 'api', 'c', 'p', 'track', 'checkout']);

export default async function SlugShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED.has(slug)) {
    return (
      <main className="ns-container" style={{ paddingTop: 80 }}>
        <EmptyState title="Not found" description="This path is reserved." />
      </main>
    );
  }
  try {
    const catalog = await fetchCatalog(slug);
    return <ShopHomeView catalog={catalog} isPrimary={false} />;
  } catch (e: any) {
    return (
      <main className="ns-container" style={{ paddingTop: 80 }}>
        <EmptyState
          icon="bag"
          title="Store not found"
          description={e?.message || `No shop for “${slug}”.`}
          action={
            <Link href="/">
              <Button>Go home</Button>
            </Link>
          }
        />
      </main>
    );
  }
}
