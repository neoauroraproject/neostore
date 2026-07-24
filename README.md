# NeoStore

**Self-hosted Marketplace Platform** — multi-tenant workspaces, typed products, wallets, Telegram, Extension Host.

## One-line install (Ubuntu)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/neoauroraproject/neostore/master/install/neostore.sh)
```

Images are **pre-built on GitHub Actions** and pulled from GHCR (`latest`) — install/update does **not** compile on your server.

**One-time:** make these packages **Public** (GitHub → Packages → each image → Package settings → Change visibility):

- [neostore-api](https://github.com/users/neoauroraproject/packages/container/neostore-api/settings)
- [neostore-storefront](https://github.com/users/neoauroraproject/packages/container/neostore-storefront/settings)
- [neostore-admin](https://github.com/users/neoauroraproject/packages/container/neostore-admin/settings)

| # | Action |
|---|--------|
| 1 | **Install** — domain, HTTPS, admin, store name |
| 2 | **Update** — `git pull` + `docker pull` (fast) |
| 3 | **Uninstall** |
| 4 | **Status** |
| 5 | **Restart** |
| 6 | **Logs** |
| 7 | **Change domain** |
| 0 | Exit |

Paths: `/opt/neostore` · Caddy on **80/443**

- Shop: `https://YOUR_DOMAIN/`
- Admin: `https://YOUR_DOMAIN/admin`
- API docs: `https://YOUR_DOMAIN/api/docs`

```bash
sudo bash /opt/neostore/install/neostore.sh
```

## Images

| Image | Registry |
|-------|----------|
| API | `ghcr.io/neoauroraproject/neostore-api:latest` |
| Storefront | `ghcr.io/neoauroraproject/neostore-storefront:latest` |
| Admin | `ghcr.io/neoauroraproject/neostore-admin:latest` |

CI: [Actions](https://github.com/neoauroraproject/neostore/actions) builds on every push to `master`.

## Docs

| Doc | Role |
|-----|------|
| [SPEC.md](./SPEC.md) | Product + Store Core P0 |
| [docs/PRD.md](./docs/PRD.md) | Marketplace PRD |
| [docs/EXTENSIONS.md](./docs/EXTENSIONS.md) | Extension SDK / Host |

## Local development

```bash
# Infra only, or full stack with local builds:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

npm install
cd apps/api && npx prisma db push && node prisma/seed.cjs
npx nest build && node dist/main.js
```

## License

Proprietary — NeoStudio.
