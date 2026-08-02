import { ShopHomeView } from '@/components/ShopHomeView';
import { configuredSlug, fetchCatalog } from '@/lib/catalog';
import { EmptyState, Button } from '@neostore/ui';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const slug = configuredSlug();
  try {
    const catalog = await fetchCatalog(slug || undefined);
    return <ShopHomeView catalog={catalog} isPrimary />;
  } catch (e: any) {
    return (
      <main className="ns-container" style={{ paddingTop: 80 }}>
        <EmptyState
          icon="shield"
          title="Store unavailable"
          description={e?.message || 'Could not load the primary shop.'}
          action={
            <Link href="/admin">
              <Button>Open Admin</Button>
            </Link>
          }
        />
      </main>
    );
  }
}
