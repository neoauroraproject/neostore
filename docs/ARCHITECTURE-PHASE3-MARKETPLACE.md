# Phase 3 — BSV-style Marketplace (Catalog Media + Delivery Modes)

**Status:** Binding  
**Reference IA:** [buysellvouchers.com](https://www.buysellvouchers.com/) (structure, not clone)  
**Depends on:** Phase 1 UI + Phase 2 Seller Panel

## Decisions

| Topic | Choice |
|-------|--------|
| Homepage CMS | `StoreProfile.homepageConfig` JSON — Seller Settings; Super Admin uses same for workspace |
| Icons | Built-in SVG catalog pack in `@neostore/ui` — Category.icon stores key |
| Product media | `Product.imageUrl` + local upload under STORAGE_LOCAL_PATH |
| Instant delivery | InventoryPool codes + `neostore.delivery.entitlement_code` |
| Delayed delivery | manual mode + `deliverByAt` SLA → Ledger Refund + order Refunded |
| Storage | Local only this slice |

## HomepageConfig shape

```ts
{
  hero: { headline, subhead, ctaLabel, ctaHref },
  trustBullets: string[],
  showCategoryRow: boolean,
  featuredMode: 'featured' | 'all' | 'manualIds',
  featuredProductIds?: string[],
  showSearch: boolean
}
```

## Delivery flows

```
Instant: Paid → fulfill → reserve InventoryItem → Entitlement(accessKey=code)
Manual:  Paid → Processing + deliverByAt → seller fulfill OR cron Refund
```

## APIs (new)

- `POST /admin/workspaces/:id/media` multipart
- `GET /media/*` static (Nest)
- `GET/POST /admin/workspaces/:id/inventory/pools`
- `POST .../pools/:poolId/codes` `{ codes: string[] }`
- `GET .../pools/:poolId` with remaining count
- `POST .../orders/cron/sla-refund`

## Security

Mime allowlist jpeg/png/webp, max 5MB, workspace-scoped paths, JWT on admin writes.
