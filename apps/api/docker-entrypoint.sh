#!/bin/sh
set -e
echo "==> NeoStore API entrypoint"
npx prisma generate --schema=prisma/schema.prisma >/dev/null 2>&1 || true
# Unique indexes (e.g. Customer email/googleSub) trigger Prisma "data loss" warnings;
# accept so API can boot after schema upgrades. NULLs remain allowed under unique.
npx prisma db push --schema=prisma/schema.prisma --skip-generate --accept-data-loss
if [ -f prisma/seed.cjs ]; then
  echo "==> Seeding admin / store"
  node prisma/seed.cjs || echo "Seed warning (non-fatal)"
fi
exec node dist/main.js
