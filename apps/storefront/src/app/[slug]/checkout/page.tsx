'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import CheckoutLoader from '@/components/CheckoutView';
import { Skeleton } from '@neostore/ui';

export default function SlugCheckoutPage() {
  const params = useParams<{ slug: string }>();
  return (
    <Suspense
      fallback={
        <main className="ns-container" style={{ paddingTop: 48 }}>
          <Skeleton height={220} radius={16} />
        </main>
      }
    >
      <CheckoutLoader isPrimary={false} slug={params.slug} />
    </Suspense>
  );
}
