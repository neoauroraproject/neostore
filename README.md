# NeoStore

**Self-hosted Marketplace Platform** — multi-tenant workspaces, typed products, wallets, Telegram Mini App, and pluggable fulfillment.

Standalone product. Build only inside this repository.

## Docs

| Doc | Role |
|-----|------|
| [SPEC.md](./SPEC.md) | **Source of truth** — PRD + Store Core P0 build bible |
| [docs/PRD.md](./docs/PRD.md) | Original Marketplace PRD intake |

## Priority

1. **P0 — Store Core** (shop, orders, customers, portal, Telegram, payments, delivery)  
2. **P1+** — full marketplace (wallet ledger, settlements, tickets, coupons, …)

## Layout

```
NeoStore/
  SPEC.md
  apps/api | admin | storefront
  packages/shared
  install/
  docs/
```

## Install (target)

```bash
bash install/install.sh
# or
docker compose up -d
```

## License

Proprietary — NeoStudio.
