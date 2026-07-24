# NeoStore

**Self-hosted Marketplace Platform** — multi-tenant workspaces, typed products, wallets, Telegram Mini App, and pluggable fulfillment.

Standalone product. Build only inside this repository.

## Docs

| Doc | Role |
|-----|------|
| [SPEC.md](./SPEC.md) | **Source of truth** — Marketplace + Store Core P0 |
| [docs/PRD.md](./docs/PRD.md) | Marketplace PRD intake |
| [docs/EXTENSIONS.md](./docs/EXTENSIONS.md) | **Extension SDK / Plugin Host** (v2 Plugin Manager; Host from day one) |

## Priority

1. **P0 — Store Core** on Extension Host (official first-party extensions)  
2. **P1** — wallet ledger, settlements  
3. **Phase 2** — public SDK + Git Plugin Manager + community extensions  
4. **Later** — official Extension Marketplace

## Layout

```
NeoStore/
  SPEC.md
  apps/api | admin | storefront
  packages/shared | sdk   # sdk package lands with Phase 2; Host stubs in P0
  extensions/official/    # first-party extensions (payments, delivery, types)
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
