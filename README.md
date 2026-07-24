# NeoStore

Standalone digital storefront platform: catalog, checkout, customer portal, Telegram Mini App, and pluggable fulfillment.

This is an independent product — not part of any other panel.

## Workspace layout

```
NeoStore/
  SPEC.md                 # Full product rebuild specification
  apps/
    api/                  # Backend API (NestJS)
    admin/                # Admin dashboard
    storefront/           # Public shop + portal + track + TMA
  packages/
    shared/               # Shared types & constants
  install/                # Install / update scripts
  docs/                   # Extra docs
```

## Status

Bootstrap in progress. See [SPEC.md](./SPEC.md) for the complete product definition.

## Quick start (soon)

```bash
npm install
npm run dev
```

## License

Proprietary — NeoStudio / HMRay.
