'use client';

import { Suspense } from 'react';
import CheckoutLoader from '@/components/CheckoutView';
import { Skeleton } from '@neostore/ui';

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="ns-container" style={{ paddingTop: 48 }}>
          <Skeleton height={220} radius={16} />
        </main>
      }
    >
      <CheckoutLoader isPrimary />
    </Suspense>
  );
}
