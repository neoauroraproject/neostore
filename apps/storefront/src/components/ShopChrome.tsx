'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button, Icon, Input, StoreShell } from '@neostore/ui';

type MenuItem = { id?: string; label: string; href: string; visible?: boolean };

export function ShopChrome({
  storeTitle,
  storeSlug,
  children,
  topMenu = [],
  themeClass,
}: {
  storeTitle: string;
  storeSlug: string;
  children: React.ReactNode;
  topMenu?: MenuItem[];
  themeClass?: string;
}) {
  const pathname = usePathname() || '/';
  const base = storeSlug ? `/${storeSlug}` : '';
  const homeHref = storeSlug ? `/${storeSlug}` : '/';
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSearchOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  const menu = (topMenu || []).filter((m) => m.visible !== false);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    window.location.href = `${base}/search${query ? `?q=${encodeURIComponent(query)}` : ''}`;
  }

  return (
    <div className={themeClass || undefined}>
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
        midNav={
          menu.length
            ? menu.map((m) => (
                <Link
                  key={m.id || m.href}
                  href={m.href.startsWith('/') ? (storeSlug && !m.href.startsWith(`/${storeSlug}`) ? `${base}${m.href}` : m.href) : m.href}
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--ns-muted)', padding: '6px 10px' }}
                >
                  {m.label}
                </Link>
              ))
            : undefined
        }
        searchSlot={
          <form
            onSubmit={submitSearch}
            className={`ns-search-expand ${searchOpen ? 'is-open' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 40,
              borderRadius: 12,
              border: '1px solid var(--ns-border)',
              background: 'var(--ns-surface-elevated)',
              paddingInline: searchOpen ? 10 : 0,
            }}
          >
            <button
              type="button"
              aria-label="Open search"
              onClick={() => setSearchOpen(true)}
              style={{
                width: 40,
                height: 40,
                border: 0,
                background: 'transparent',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                color: 'var(--ns-ink)',
              }}
            >
              <Icon name="search" size={18} />
            </button>
            {searchOpen ? (
              <Input
                ref={inputRef as never}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${storeTitle}…`}
                style={{ border: 0, boxShadow: 'none', height: 36, flex: 1, background: 'transparent' }}
                onBlur={() => {
                  if (!q) setTimeout(() => setSearchOpen(false), 150);
                }}
              />
            ) : null}
          </form>
        }
        topRight={
          <>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="secondary" size="sm">
                Register
              </Button>
            </Link>
          </>
        }
        navItems={items}
      >
        {children}
      </StoreShell>
    </div>
  );
}
