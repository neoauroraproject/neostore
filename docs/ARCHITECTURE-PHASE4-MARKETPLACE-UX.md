# Phase 4 — Marketplace UX

**Status:** Binding  
**Depends on:** Plugin Host ([ARCHITECTURE-PHASE4-PLUGIN-HOST.md](./ARCHITECTURE-PHASE4-PLUGIN-HOST.md))

## Surfaces

- Public auth: `/login`, `/register` (Customer | Seller tabs)
- Theme v1 `neostore.theme.marketplace` with expandable header search
- Product multi-asset pricing via platform `cryptoAssets`
- Customer portal: dashboard / transactions / financial / tickets
- Checkout: balance + gateway plugins; manual SLA wait copy
- Seller: delivery schedule, extension settings, tickets, telegram link
- Super Admin: extensions, SMTP, Google OAuth, tickets

## Theme

Active theme: `StoreProfile.themeId` + `themeConfig` / `homepageConfig` (topMenu, hero, trust, featured).

## Crypto

Platform settings define assets (USDT TRC20/BEP20, USDC…). Products declare `acceptedAssets` + `priceBase`.

## Ops

Installer Update runs `docker image prune -f` after pull/up.
