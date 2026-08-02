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

CI builds on every push to `master` **and** on version tags (`v*`).

### Pin a release

```bash
# In /opt/neostore/.env
NEOSTORE_VERSION=v0.3.0
docker compose pull && docker compose up -d
```

Tagged images also publish `0.3.0` and `0.3` (semver without the `v` prefix).

### Cut a new GitHub Release

1. Write notes at `docs/releases/vX.Y.Z.md`
2. Commit on `master`, then tag and push:

```bash
git tag -a vX.Y.Z -m "NeoStore vX.Y.Z"
git push origin master
git push origin vX.Y.Z
```

That triggers:
- **Build and publish images** → GHCR tags `vX.Y.Z`, `X.Y.Z`, `X.Y`, `latest`
- **GitHub Release from tag** → public release using `docs/releases/vX.Y.Z.md`

You can also re-publish notes for an existing tag via Actions → *GitHub Release from tag* → Run workflow.

## Docs

| Doc | Role |
|-----|------|
| [SPEC.md](./SPEC.md) | Product + Store Core P0 |
| [docs/ARCHITECTURE-PHASE1-UI.md](./docs/ARCHITECTURE-PHASE1-UI.md) | Surfaces, roles, Design System, Front Store |
| [docs/releases/v0.3.0.md](./docs/releases/v0.3.0.md) | v0.3.0 release notes |
| [docs/ARCHITECTURE-PHASE2-SELLER.md](./docs/ARCHITECTURE-PHASE2-SELLER.md) | Seller Panel + Checkout |
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
