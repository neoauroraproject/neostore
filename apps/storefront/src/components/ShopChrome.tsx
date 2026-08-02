'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, Icon, StoreShell } from '@neostore/ui';

export function ShopChrome({
  storeTitle,
  storeSlug,
  children,
}: {
  storeTitle: string;
  storeSlug: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '/';
  const base = storeSlug ? `/${storeSlug}` : '';
  const homeHref = storeSlug ? `/${storeSlug}` : '/';

  const items = [
    { href: homeHref, label: 'Home', icon: 'home' as const, active: pathname === '/' || pathname === homeHref },
    {
      href: `${base}/search`,
      label: 'Search',
      icon: 'search' as const,
      active: pathname.includes('/search'),
    },
    {
      href: `${base}/c/all`,
      label: 'Browse',
      icon: 'grid' as const,
      active: pathname.includes('/c/'),
    },
    {
      href: '/portal',
      label: 'Account',
      icon: 'user' as const,
      active: pathname.startsWith('/portal'),
    },
  ];

  return (
    <StoreShell
      brand={
        <Link href={homeHref} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'var(--ns-ink)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="spark" size={16} />
          </span>
          <span
            style={{
              fontFamily: 'var(--ns-font-display)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              fontSize: 18,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {storeTitle}
          </span>
        </Link>
      }
      topRight={
        <>
          <Link href={`${base}/search`} className="ns-desktop-only" style={{ display: 'none' }}>
            <Button variant="ghost" size="sm" style={{ gap: 6 }}>
              <Icon name="search" size={16} /> Search
            </Button>
          </Link>
          <Link href="/portal">
            <Button variant="secondary" size="sm">
              Account
            </Button>
          </Link>
          <style>{`
            @media (min-width: 900px) {
              .ns-desktop-only { display: inline-flex !important; }
            }
          `}</style>
        </>
      }
      navItems={items}
    >
      {children}
    </StoreShell>
  );
}
