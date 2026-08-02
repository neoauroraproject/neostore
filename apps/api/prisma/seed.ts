import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'owner@neostore.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'neostore123';
  const adminName = process.env.ADMIN_NAME || 'NeoStore Owner';
  const storeName = process.env.STORE_NAME || 'My Store';
  const rawSlug = (process.env.STORE_SLUG || '').trim();
  const storeSlug =
    (rawSlug || storeName || 'store')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'store';

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      name: adminName,
      role: Role.workspace_owner,
    },
    create: {
      email,
      passwordHash,
      name: adminName,
      role: Role.workspace_owner,
    },
  });

  let workspace = await prisma.workspace.findUnique({ where: { slug: storeSlug } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: storeName,
        slug: storeSlug,
        members: { create: { userId: user.id, role: Role.workspace_owner } },
        store: {
          create: {
            title: storeName,
            slug: storeSlug,
            description: storeName,
            defaultCurrency: 'USD',
            paymentConfig: {
              methods: { manual_bank: true, manual_crypto: true, cryptomus: false },
              cards: [],
            },
          },
        },
      },
    });
  } else {
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      update: { role: Role.workspace_owner },
      create: { workspaceId: workspace.id, userId: user.id, role: Role.workspace_owner },
    });
  }

  const blueprint = await prisma.fulfillmentBlueprint.findFirst({
    where: { workspaceId: workspace.id, providerType: 'neostore.delivery.manual' },
  });
  if (!blueprint) {
    await prisma.fulfillmentBlueprint.create({
      data: {
        workspaceId: workspace.id,
        name: 'Manual Delivery',
        providerType: 'neostore.delivery.manual',
        providerConfig: {},
      },
    });
  }

  await prisma.product.deleteMany({
    where: {
      workspaceId: workspace.id,
      name: 'Starter License',
      description: 'Demo license product',
    },
  });

  console.log('Seed OK — no demo catalog');
  console.log('Login email:', email);
  console.log('Login name:', adminName);
  console.log('Shop slug:', storeSlug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
