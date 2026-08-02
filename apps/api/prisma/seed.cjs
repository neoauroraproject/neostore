#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function slugify(input) {
  return String(input || 'store')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'store';
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'owner@neostore.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'neostore123';
  const adminName = process.env.ADMIN_NAME || 'NeoStore Owner';
  const storeName = process.env.STORE_NAME || 'My Store';
  const rawSlug = (process.env.STORE_SLUG || '').trim();
  const storeSlug = slugify(rawSlug || storeName || 'store');

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
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { name: storeName },
    });
    await prisma.storeProfile
      .update({
        where: { workspaceId: workspace.id },
        data: { title: storeName, slug: storeSlug },
      })
      .catch(async () => {
        await prisma.storeProfile.create({
          data: {
            workspaceId: workspace.id,
            title: storeName,
            slug: storeSlug,
            description: storeName,
            paymentConfig: {
              methods: { manual_bank: true, manual_crypto: true, cryptomus: false },
              cards: [],
            },
          },
        });
      });
  }

  // Fulfillment blueprint is infrastructure (not catalog demo data)
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

  // Remove known installer demo leftovers (safe exact match only)
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
