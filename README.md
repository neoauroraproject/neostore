# NeoStore

**Self-hosted Marketplace Platform** — multi-tenant workspaces, typed products, wallets, Telegram, and pluggable fulfillment via Extension Host.

Standalone product. Build only inside this repository.

## Docs

| Doc | Role |
|-----|------|
| [SPEC.md](./SPEC.md) | **Source of truth** — Marketplace + Store Core P0 |
| [docs/PRD.md](./docs/PRD.md) | Marketplace PRD intake |
| [docs/EXTENSIONS.md](./docs/EXTENSIONS.md) | Extension SDK / Host / Plugin Manager |

## Status (P0 shipped)

- Extension Host + Event/Hook buses + 10 official extensions  
- Auth, workspace, catalog (admin + public)  
- Checkout, track, approve/reject/fulfill, Cryptomus webhook stub  
- Customer portal sessions + admin customers  
- Telegram settings + webhook stubs  
- P1 wallet ledger settlement preview  
- Phase 2 Plugin Manager Git-install stub (`POST /api/admin/extensions/install/git`)  
- Swagger: `http://localhost:4100/api/docs`

## Local development

```bash
# Infra (host ports avoid clashes with other stacks)
docker compose up -d postgres redis
# Postgres → localhost:55432  Redis → localhost:6380

cp .env.example .env
cp .env.example apps/api/.env

npm install
cd apps/api
npx prisma db push
npx ts-node prisma/seed.ts
npx nest build && node dist/main.js
```

Demo login: `owner@neostore.local` / `neostore123` · shop slug: `demo`

```bash
# Optional UIs
npm run dev --workspace=@neostore/admin      # :4101
npm run dev --workspace=@neostore/storefront # :4102
```

## Layout

```
NeoStore/
  SPEC.md
  apps/api | admin | storefront
  packages/shared | sdk
  extensions/official/
  install/
  docs/
```

## License

Proprietary — NeoStudio.
