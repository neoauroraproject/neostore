#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> NeoStore install"
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for the default install path."
  exit 1
fi

cp -n .env.example .env 2>/dev/null || true
docker compose up -d postgres redis
echo "Waiting for Postgres..."
sleep 5

cd apps/api
npm install
npx prisma generate --schema=prisma/schema.prisma
npx prisma db push --schema=prisma/schema.prisma
npx ts-node prisma/seed.ts || true
cd "$ROOT"

echo "==> Starting API (docker compose)"
docker compose up -d api || echo "Build API image when ready: docker compose build api && docker compose up -d"

echo "NeoStore install finished."
echo "API: http://localhost:4100/api/docs"
echo "Demo login after seed: owner@neostore.local / neostore123"
