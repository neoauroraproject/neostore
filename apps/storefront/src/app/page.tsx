import { ShopHome } from '../components/ShopHome';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const slug = process.env.STORE_SLUG || process.env.NEXT_PUBLIC_STORE_SLUG || 'store';
  return <ShopHome initialSlug={slug} />;
}
