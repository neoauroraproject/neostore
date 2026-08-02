'use client';

import type { CSSProperties, ReactNode, SVGProps } from 'react';

/** Marketplace category icon keys (store in Category.icon). */
export const CATALOG_ICON_NAMES = [
  'gamepad',
  'controller',
  'joystick',
  'trophy',
  'steam',
  'play',
  'film',
  'music',
  'headphones',
  'tv',
  'retail',
  'shopping-bag',
  'tag',
  'gift',
  'ticket',
  'coupon',
  'food',
  'coffee',
  'pizza',
  'plane',
  'car',
  'globe',
  'map',
  'phone',
  'laptop',
  'chip',
  'wifi',
  'cloud',
  'shield',
  'key',
  'lock',
  'wallet',
  'card',
  'coins',
  'chart',
  'book',
  'graduation',
  'heart',
  'star',
  'spark',
  'box',
  'truck',
  'users',
  'chat',
  'camera',
  'palette',
  'bolt',
  'leaf',
  'fitness',
  'pet',
] as const;

export type CatalogIconName = (typeof CATALOG_ICON_NAMES)[number];

const paths: Record<CatalogIconName, ReactNode> = {
  gamepad: (
    <>
      <rect x="3" y="8" width="18" height="10" rx="3" />
      <path d="M8 13h0.01M10 11v4M7 13h2" />
      <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="14" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  controller: (
    <>
      <path d="M6 10c0-1.5 1-3 3-3h6c2 0 3 1.5 3 3v4c0 2-1.5 3-3.5 3H9.5C7.5 17 6 16 6 14v-4Z" />
      <path d="M9 12h2M10 11v2" />
      <circle cx="15" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="13" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  joystick: (
    <>
      <path d="M8 14h8v2a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3v-2Z" />
      <circle cx="12" cy="9" r="3.5" />
      <path d="M12 5.5V4" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 5h8v3a4 4 0 0 1-8 0V5Z" />
      <path d="M8 6H5a2 2 0 0 0 2 4" />
      <path d="M16 6h3a2 2 0 0 1-2 4" />
      <path d="M10 14h4v2H10zM9 19h6" />
    </>
  ),
  steam: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="9.5" cy="14.5" r="2.5" />
      <circle cx="15" cy="9" r="2" />
      <path d="M11.2 13.2 14 10.5" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
    </>
  ),
  film: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="7" cy="18" r="2.5" />
      <circle cx="17" cy="16" r="2.5" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 14v3a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2Z" />
      <path d="M20 14v3a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2Z" />
    </>
  ),
  tv: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 6V4" />
    </>
  ),
  retail: (
    <>
      <path d="M4 8h16l-1.5 11H5.5L4 8Z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </>
  ),
  'shopping-bag': (
    <>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </>
  ),
  tag: (
    <>
      <path d="M20 12.5 12.5 20a2 2 0 0 1-2.8 0L4 14.3V4h10.3L20 9.7a2 2 0 0 1 0 2.8Z" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="10" width="16" height="10" rx="1.5" />
      <path d="M12 10v10M4 14h16" />
      <path d="M12 10c-2-3-5-3-5-1s2 2 5 1c3 1 5 0 5-1s-3-2-5 1Z" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 9a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v6a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2V9Z" />
      <path d="M9 8v8" strokeDasharray="2 3" />
    </>
  ),
  coupon: (
    <>
      <path d="M4 8h16v3a2 2 0 1 0 0 2v3H4v-3a2 2 0 1 0 0-2V8Z" />
      <path d="M12 8v11" strokeDasharray="2 3" />
    </>
  ),
  food: (
    <>
      <path d="M7 4v8a2 2 0 0 0 2 2v6" />
      <path d="M5 4h4" />
      <path d="M15 4v16" />
      <path d="M13 4c2 2 4 3 4 7H13" />
    </>
  ),
  coffee: (
    <>
      <path d="M6 9h10v5a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V9Z" />
      <path d="M16 10h2a2 2 0 0 1 0 4h-2" />
      <path d="M7 20h8" />
    </>
  ),
  pizza: (
    <>
      <path d="M3 11 12 3l9 8-9 10L3 11Z" />
      <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="13" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="9" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  plane: (
    <>
      <path d="M3 12h18" />
      <path d="M12 3v18" />
      <path d="M5 8 12 12l7-4" />
      <path d="M5 16l7-4 7 4" />
    </>
  ),
  car: (
    <>
      <path d="M5 14h14l-1.5-5H6.5L5 14Z" />
      <path d="M5 14v3h2v-1h10v1h2v-3" />
      <circle cx="8" cy="17" r="1.2" />
      <circle cx="16" cy="17" r="1.2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.5 4 5.5 4 8.5s-1.5 6-4 8.5c-2.5-2.5-4-5.5-4-8.5s1.5-6 4-8.5Z" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  laptop: (
    <>
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M2 18h20" />
    </>
  ),
  chip: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5 7l2 2M17 7l2-2M5 17l2-2M17 17l2 2" />
    </>
  ),
  wifi: (
    <>
      <path d="M5 10a9.5 9.5 0 0 1 14 0" />
      <path d="M8 13a5.5 5.5 0 0 1 8 0" />
      <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  cloud: (
    <>
      <path d="M7 17h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 2A3.5 3.5 0 0 0 7 17Z" />
    </>
  ),
  shield: <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />,
  key: (
    <>
      <circle cx="8" cy="12" r="3.5" />
      <path d="M11 12h9v3M17 12v2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  wallet: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M3.5 10h17" />
      <circle cx="16.5" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="10" cy="8" rx="5" ry="2.5" />
      <path d="M5 8v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V8" />
      <ellipse cx="14" cy="12" rx="5" ry="2.5" />
      <path d="M9 12v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19h16" />
      <path d="M7 16V10M12 16V6M17 16v-4" />
    </>
  ),
  book: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Z" />
      <path d="M6 3v16" />
    </>
  ),
  graduation: (
    <>
      <path d="M2 10 12 5l10 5-10 5L2 10Z" />
      <path d="M6 12v4c2 2 4 3 6 3s4-1 6-3v-4" />
      <path d="M22 10v5" />
    </>
  ),
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10Z" />,
  star: <path d="M12 3l2.4 5.4L20 9.3l-4 4.2 1 6-5-2.8-5 2.8 1-6-4-4.2 5.6-.9L12 3Z" />,
  spark: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 11 18" />
    </>
  ),
  box: (
    <>
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
      <path d="M12 11v10M4 7l8 4 8-4" />
    </>
  ),
  truck: (
    <>
      <path d="M3 8h11v8H3z" />
      <path d="M14 11h4l3 3v2h-7v-5Z" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17" cy="18" r="1.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 19a4.5 4.5 0 0 0-5-4.4" />
    </>
  ),
  chat: (
    <>
      <path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-2h6l2 2h3v11H4V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a9 9 0 0 1 0-13Z" />
      <circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  bolt: <path d="M13 3 6 14h5l-1 7 8-12h-5l0-6Z" />,
  leaf: <path d="M5 19c8-1 12-8 13-14-6 1-12 5-13 14Zm0 0c2-4 6-7 10-8" />,
  fitness: (
    <>
      <path d="M6 9v6M18 9v6M8 12h8M4 10v4M20 10v4" />
    </>
  ),
  pet: (
    <>
      <circle cx="8" cy="9" r="2" />
      <circle cx="16" cy="9" r="2" />
      <circle cx="6" cy="14" r="2" />
      <circle cx="18" cy="14" r="2" />
      <ellipse cx="12" cy="15" rx="3.5" ry="3" />
    </>
  ),
};

export function CatalogIcon({
  name,
  size = 22,
  style,
  ...rest
}: SVGProps<SVGSVGElement> & { name: string; size?: number }) {
  const key = (CATALOG_ICON_NAMES.includes(name as CatalogIconName) ? name : 'box') as CatalogIconName;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0, ...(style as CSSProperties) }}
      {...rest}
    >
      {paths[key]}
    </svg>
  );
}

export function isCatalogIconName(value: string): value is CatalogIconName {
  return (CATALOG_ICON_NAMES as readonly string[]).includes(value);
}
