import { PrismaClient, Role, DeliveryMode } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'owner@neostore.local';
  const passwordHash = await bcrypt.hash('neostore123', 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      name: 'NeoStore Owner',
      role: Role.workspace_owner,
    },
  });

  let workspace = await prisma.workspace.findUnique({ where: { slug: 'demo' } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Demo Store',
        slug: 'demo',
        members: { create: { userId: user.id, role: Role.workspace_owner } },
        store: {
          create: {
            title: 'Demo Store',
            slug: 'demo',
            description: 'NeoStore demo workspace',
            defaultCurrency: 'USD',
            paymentConfig: {
              methods: { manual_bank: true, manual_crypto: true, cryptomus: true },
              cards: [
                {
                  id: 'card1',
                  bankName: 'Demo Bank',
                  cardNumber: '6037-9919-0000-0000',
                  cardHolder: 'Demo Store',
                  enabled: true,
                },
              ],
            },
          },
        },
      },
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
  console.log('Login:', email, 'neostore123');
  console.log('Shop slug: demo');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
