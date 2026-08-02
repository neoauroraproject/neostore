import { PrismaClient, Role, DeliveryMode } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'owner@neostore.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'neostore123';
  const adminName = process.env.ADMIN_NAME || 'NeoStore Owner';
  const storeName = process.env.STORE_NAME || 'Demo Store';
  const rawSlug = (process.env.STORE_SLUG || '').trim();
  const storeSlug =
    (rawSlug || storeName || 'demo')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'demo';

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
            description: `${storeName} powered by NeoStore`,
            defaultCurrency: 'USD',
            paymentConfig: {
              methods: { manual_bank: true, manual_crypto: true, cryptomus: true },
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

  const category =
    (await prisma.category.findFirst({ where: { workspaceId: workspace.id, name: 'Digital' } })) ||
    (await prisma.category.create({
      data: { workspaceId: workspace.id, name: 'Digital', description: 'Digital goods' },
    }));

  const blueprint =
    (await prisma.fulfillmentBlueprint.findFirst({
      where: { workspaceId: workspace.id, providerType: 'neostore.delivery.manual' },
    })) ||
    (await prisma.fulfillmentBlueprint.create({
      data: {
        workspaceId: workspace.id,
        name: 'Manual Delivery',
        providerType: 'neostore.delivery.manual',
        providerConfig: {},
      },
    }));

  const existingProduct = await prisma.product.findFirst({
    where: { workspaceId: workspace.id, name: 'Starter License' },
  });
  if (!existingProduct) {
    await prisma.product.create({
      data: {
        workspaceId: workspace.id,
        categoryId: category.id,
        blueprintId: blueprint.id,
        name: 'Starter License',
        description: 'Demo license product',
        type: 'License',
        deliveryMode: DeliveryMode.manual,
        priceUsd: 9.99,
        priceToman: 500000,
        durationDays: 30,
        visible: true,
        renewable: true,
      },
    });
  }

  console.log('Seed OK');
  console.log('Login:', email);
  console.log('Shop slug:', storeSlug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
