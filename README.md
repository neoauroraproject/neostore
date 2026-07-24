# NeoStore

**Self-hosted Marketplace Platform** — multi-tenant workspaces, typed products, wallets, Telegram, Extension Host.

## One-line install (Ubuntu)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/neoauroraproject/neostore/master/install/neostore.sh)
```

Opens a menu:

| # | Action |
|---|--------|
| 1 | **Install** — asks domain, HTTPS, admin email/password, store name |
| 2 | **Update** |
| 3 | **Uninstall** |
| 4 | **Status** |
| 5 | **Restart** |
| 6 | **Logs** |
| 7 | **Change domain** |
| 0 | Exit |

Install path: `/opt/neostore` · reverse proxy: **Caddy** (ports 80/443)

Re-open menu later:

```bash
sudo bash /opt/neostore/install/neostore.sh
```

## Docs

| Doc | Role |
|-----|------|
| [SPEC.md](./SPEC.md) | Product + Store Core P0 |
| [docs/PRD.md](./docs/PRD.md) | Marketplace PRD |
| [docs/EXTENSIONS.md](./docs/EXTENSIONS.md) | Extension SDK / Host |

## Local development

```bash
docker compose up -d postgres redis
cp .env.example .env && cp .env.example apps/api/.env
# For local API outside Docker, point DATABASE_URL at published ports if you expose them
npm install
cd apps/api && npx prisma db push && node prisma/seed.cjs
npx nest build && node dist/main.js
```

## License

Proprietary — NeoStudio.
