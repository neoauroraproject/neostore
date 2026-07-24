#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "==> NeoStore update"
git pull --ff-only || true
docker compose pull || true
cd apps/api
npm install
npx prisma generate --schema=prisma/schema.prisma
npx prisma db push --schema=prisma/schema.prisma
cd "$ROOT"
docker compose up -d --build
echo "Update complete."
