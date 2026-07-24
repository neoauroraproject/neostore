#!/bin/sh
set -e
echo "==> NeoStore API entrypoint"
npx prisma generate --schema=prisma/schema.prisma >/dev/null 2>&1 || true
npx prisma db push --schema=prisma/schema.prisma --skip-generate
if [ -f prisma/seed.cjs ]; then
  echo "==> Seeding admin / store"
  node prisma/seed.cjs || echo "Seed warning (non-fatal)"
fi
exec node dist/main.js
