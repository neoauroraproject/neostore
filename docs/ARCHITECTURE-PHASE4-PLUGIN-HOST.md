# Phase 4 — Plugin & Theme Host

**Status:** Binding  
**Parent:** [EXTENSIONS.md](./EXTENSIONS.md)  
**UX parent:** Marketplace Phase 4 plan

## Goal

WordPress-like **install → activate → configure → deactivate (keep data) → uninstall** for themes, payment gateways, and future extension types — without allowing plugins to edit Core or touch Prisma directly.

## Lifecycle

| Action | Persistence |
|--------|-------------|
| Install | `InstalledExtension` + files under `STORAGE_LOCAL_PATH/extensions/{id}/` |
| Activate (workspace) | `WorkspaceExtension.enabled=true`; themes: only one active + `StoreProfile.themeId` |
| Configure | `WorkspaceExtension.settings` (secrets HMAC-wrapped) |
| Deactivate | `enabled=false`; **settings retained** |
| Uninstall | Requires all workspaces deactivated; `purge=1` deletes settings rows |

Official bundled extensions (`official: true`) cannot be uninstalled.

Example package: [`examples/extensions/hello-menu`](../examples/extensions/hello-menu).

## Contributions

Manifest `contributes`:

- `menus[]` → `admin.platform` / `admin.seller` / `storefront.account`
- `settings[]` → settings form fields
- `webhooks[]` → allowed webhook paths when enabled
- `theme` → sections/tokens for theme type

APIs:

- `GET/POST /api/admin/extensions…`
- `GET/POST/PATCH /api/admin/workspaces/:id/extensions…`

## Security (v1)

- Type allowlist + semver compatibility gate
- `hasPermission` enforced from manifest permissions
- Secrets encrypted at rest in settings
- Path-safe install directory; https-only git URL record
- `ExtensionAuditLog` for install/enable/disable/uninstall/settings
- No arbitrary eval of remote code in v1 (official in-process; third-party pending clone worker)
- Process sandbox = roadmap

## Data retention

Historical `Payment.method` / blueprint `providerType` keep extension ids after disable so orders remain readable. New intents only for enabled plugins.

## First-party plugins

- Themes: `neostore.theme.marketplace`
- Payments: manual_bank, manual_crypto, cryptomus, **nowpayments**
