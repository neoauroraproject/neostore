import type { ThemeExtension } from '../types';

export const marketplaceTheme: ThemeExtension = {
  type: 'theme',
  id: 'neostore.theme.marketplace',
  defaultSections: {
    hero: {
      headline: '',
      subhead: '',
      ctaLabel: 'Browse catalog',
      ctaHref: '/search',
    },
    trustBullets: ['Instant delivery', 'Crypto-friendly checkout', 'Secure entitlements'],
    showCategoryRow: true,
    featuredMode: 'featured',
    showSearch: true,
    topMenu: [
      { id: 'all', label: 'All products', href: '/search' },
      { id: 'cats', label: 'Categories', href: '/c/all' },
    ],
  },
};
