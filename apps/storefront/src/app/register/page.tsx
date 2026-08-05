import { Suspense } from 'react';
import { AuthView } from '@/components/AuthView';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="ns-container" style={{ paddingTop: 48 }}>Loading…</div>}>
      <AuthView mode="register" />
    </Suspense>
  );
}
