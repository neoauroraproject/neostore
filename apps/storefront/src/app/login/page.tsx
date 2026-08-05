import { Suspense } from 'react';
import { AuthView } from '@/components/AuthView';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="ns-container" style={{ paddingTop: 48 }}>Loading…</div>}>
      <AuthView mode="login" />
    </Suspense>
  );
}
