import { ShopHome } from '../../components/ShopHome';

export default async function SlugShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ShopHome initialSlug={slug} />;
}
