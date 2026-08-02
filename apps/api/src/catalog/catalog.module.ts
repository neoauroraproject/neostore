import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DeliveryMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExtensionHost } from '../extensions/extension-host';
import { EventBus } from '../extensions/event-bus';

@Injectable()
export class WorkspaceGuardService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMember(userId: string, workspaceId: string) {
    const m = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!m) throw new NotFoundException('Workspace not found');
    return m;
  }
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly host: ExtensionHost,
    private readonly events: EventBus,
    private readonly access: WorkspaceGuardService,
  ) {}

  async dashboard(userId: string, workspaceId: string) {
    await this.access.requireMember(userId, workspaceId);
    const [products, orders, customers, revenue] = await Promise.all([
      this.prisma.product.count({ where: { workspaceId } }),
      this.prisma.order.count({ where: { workspaceId } }),
      this.prisma.customer.count({ where: { workspaceId } }),
      this.prisma.order.aggregate({
        where: {
          workspaceId,
          status: { in: ['Completed', 'Delivered'] },
        },
        _sum: { amount: true },
      }),
    ]);
    const store = await this.prisma.storeProfile.findUnique({ where: { workspaceId } });
    return {
      products,
      orders,
      customers,
      revenue: revenue._sum.amount || 0,
      slug: store?.slug,
    };
  }

  async getProfile(userId: string, workspaceId: string) {
    await this.access.requireMember(userId, workspaceId);
    return this.prisma.storeProfile.findUniqueOrThrow({ where: { workspaceId } });
  }

  async updateProfile(userId: string, workspaceId: string, data: Record<string, unknown>) {
    await this.access.requireMember(userId, workspaceId);
    return this.prisma.storeProfile.update({
      where: { workspaceId },
      data: {
        title: data.title as string | undefined,
        description: data.description as string | undefined,
        enabled: data.enabled as boolean | undefined,
        defaultCurrency: data.defaultCurrency as string | undefined,
        paymentConfig: data.paymentConfig as object | undefined,
        autoDeliverEnabled: data.autoDeliverEnabled as boolean | undefined,
        autoDeliverDelayMinutes: data.autoDeliverDelayMinutes as number | undefined,
        telegramBotEnabled: data.telegramBotEnabled as boolean | undefined,
        telegramWelcomeText: data.telegramWelcomeText as string | undefined,
        telegramAdminChatId: data.telegramAdminChatId as string | undefined,
      },
    });
  }

  async listCategories(userId: string, workspaceId: string) {
    await this.access.requireMember(userId, workspaceId);
    return this.prisma.category.findMany({
      where: { workspaceId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(userId: string, workspaceId: string, body: { name: string; description?: string }) {
    await this.access.requireMember(userId, workspaceId);
    if (!body.name?.trim()) throw new BadRequestException('name required');
    return this.prisma.category.create({
      data: { workspaceId, name: body.name.trim(), description: body.description },
    });
  }

  async updateCategory(userId: string, workspaceId: string, id: string, body: Record<string, unknown>) {
    await this.access.requireMember(userId, workspaceId);
    return this.prisma.category.update({
      where: { id },
      data: {
        name: body.name as string | undefined,
        description: body.description as string | undefined,
        sortOrder: body.sortOrder as number | undefined,
        visible: body.visible as boolean | undefined,
        enabled: body.enabled as boolean | undefined,
      },
    });
  }

  async deleteCategory(userId: string, workspaceId: string, id: string) {
    await this.access.requireMember(userId, workspaceId);
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }

  async listBlueprints(userId: string, workspaceId: string) {
    await this.access.requireMember(userId, workspaceId);
    return this.prisma.fulfillmentBlueprint.findMany({ where: { workspaceId } });
  }

  async createBlueprint(
    userId: string,
    workspaceId: string,
    body: { name: string; providerType: string; providerConfig?: object },
  ) {
    await this.access.requireMember(userId, workspaceId);
    const delivery = this.host.getDelivery(body.providerType);
    if (!delivery && !body.providerType.startsWith('neostore.delivery.')) {
      // allow known ids
      const known = this.host.list('delivery_provider').some((e) => e.id === body.providerType);
      if (!known) throw new BadRequestException('Unknown delivery provider extension');
    }
    return this.prisma.fulfillmentBlueprint.create({
      data: {
        workspaceId,
        name: body.name,
        providerType: body.providerType,
        providerConfig: body.providerConfig || {},
      },
    });
  }

  async listProducts(userId: string, workspaceId: string) {
    await this.access.requireMember(userId, workspaceId);
    return this.prisma.product.findMany({
      where: { workspaceId },
      include: { category: true, blueprint: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createProduct(userId: string, workspaceId: string, body: Record<string, unknown>) {
    await this.access.requireMember(userId, workspaceId);
    const type = String(body.type || 'Digital');
    const typeExt = this.host.getProductType(type);
    if (!typeExt) throw new BadRequestException(`Unsupported product type: ${type}`);
    const validation =
      typeExt.validateFields?.((body.typeFields as Record<string, unknown>) || {}) || { ok: true };
    if (!validation.ok) throw new BadRequestException(validation.errors?.join(', ') || 'Invalid fields');

    const product = await this.prisma.product.create({
      data: {
        workspaceId,
        categoryId: String(body.categoryId),
        blueprintId: String(body.blueprintId),
        name: String(body.name),
        description: (body.description as string) || null,
        type,
        deliveryMode: (body.deliveryMode as DeliveryMode) || DeliveryMode.instant,
        priceUsd: Number(body.priceUsd || 0),
        priceToman: body.priceToman != null ? Number(body.priceToman) : null,
        quotaUnits: BigInt(Number(body.quotaUnits || 0)),
        durationDays: Number(body.durationDays || 30),
        badge: (body.badge as string) || null,
        featured: Boolean(body.featured),
        visible: body.visible !== false,
        renewable: body.renewable !== false,
        stockUnlimited: body.stockUnlimited !== false,
        stockCount: Number(body.stockCount || 0),
        typeFields: (body.typeFields as object) || {},
      },
    });
    await this.events.emit('ProductUpdated', { productId: product.id, workspaceId, action: 'create' });
    return product;
  }

  async updateProduct(userId: string, workspaceId: string, id: string, body: Record<string, unknown>) {
    await this.access.requireMember(userId, workspaceId);
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: body.name as string | undefined,
        description: body.description as string | undefined,
        priceUsd: body.priceUsd != null ? Number(body.priceUsd) : undefined,
        priceToman: body.priceToman != null ? Number(body.priceToman) : undefined,
        visible: body.visible as boolean | undefined,
        featured: body.featured as boolean | undefined,
        status: body.status as string | undefined,
        stockCount: body.stockCount != null ? Number(body.stockCount) : undefined,
        stockUnlimited: body.stockUnlimited as boolean | undefined,
      },
    });
    await this.events.emit('ProductUpdated', { productId: id, workspaceId, action: 'update' });
    return product;
  }

  async deleteProduct(userId: string, workspaceId: string, id: string) {
    await this.access.requireMember(userId, workspaceId);
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }

  async publicCatalog(slug: string) {
    const store = await this.prisma.storeProfile.findUnique({
      where: { slug },
    });
    if (!store?.enabled) throw new NotFoundException('Store not found');
    return this.catalogPayload(store);
  }

  /** Primary shop for domain root when STORE_SLUG is empty. */
  async publicPrimaryCatalog() {
    const store = await this.prisma.storeProfile.findFirst({
      where: { enabled: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!store) throw new NotFoundException('Store not found');
    return this.catalogPayload(store);
  }

  private async catalogPayload(store: {
    workspaceId: string;
    title: string;
    slug: string;
    description: string | null;
    defaultCurrency: string;
    paymentConfig: unknown;
  }) {
    const [categories, products] = await Promise.all([
      this.prisma.category.findMany({
        where: { workspaceId: store.workspaceId, visible: true, enabled: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.product.findMany({
        where: { workspaceId: store.workspaceId, visible: true, status: 'active' },
        include: { category: true },
        orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
      }),
    ]);
    return {
      store: {
        title: store.title,
        slug: store.slug,
        description: store.description,
        defaultCurrency: store.defaultCurrency,
        paymentConfig: store.paymentConfig,
      },
      categories,
      products: products.map((p) => ({
        ...p,
        quotaUnits: p.quotaUnits.toString(),
      })),
      productTypes: this.host.list('product_type'),
      paymentGateways: this.host.list('payment_gateway'),
    };
  }
}

@Controller('admin/workspaces/:workspaceId')
@UseGuards(AuthGuard('jwt'))
export class CatalogAdminController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('dashboard')
  dashboard(@Req() req: { user: { id: string } }, @Param('workspaceId') workspaceId: string) {
    return this.catalog.dashboard(req.user.id, workspaceId);
  }

  @Get('profile')
  profile(@Req() req: { user: { id: string } }, @Param('workspaceId') workspaceId: string) {
    return this.catalog.getProfile(req.user.id, workspaceId);
  }

  @Patch('profile')
  updateProfile(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.catalog.updateProfile(req.user.id, workspaceId, body);
  }

  @Get('categories')
  categories(@Req() req: { user: { id: string } }, @Param('workspaceId') workspaceId: string) {
    return this.catalog.listCategories(req.user.id, workspaceId);
  }

  @Post('categories')
  createCategory(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Body() body: { name: string; description?: string },
  ) {
    return this.catalog.createCategory(req.user.id, workspaceId, body);
  }

  @Patch('categories/:id')
  updateCategory(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.catalog.updateCategory(req.user.id, workspaceId, id, body);
  }

  @Delete('categories/:id')
  deleteCategory(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.catalog.deleteCategory(req.user.id, workspaceId, id);
  }

  @Get('blueprints')
  blueprints(@Req() req: { user: { id: string } }, @Param('workspaceId') workspaceId: string) {
    return this.catalog.listBlueprints(req.user.id, workspaceId);
  }

  @Post('blueprints')
  createBlueprint(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Body() body: { name: string; providerType: string; providerConfig?: object },
  ) {
    return this.catalog.createBlueprint(req.user.id, workspaceId, body);
  }

  @Get('products')
  products(@Req() req: { user: { id: string } }, @Param('workspaceId') workspaceId: string) {
    return this.catalog.listProducts(req.user.id, workspaceId);
  }

  @Post('products')
  createProduct(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.catalog.createProduct(req.user.id, workspaceId, body);
  }

  @Patch('products/:id')
  updateProduct(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.catalog.updateProduct(req.user.id, workspaceId, id, body);
  }

  @Delete('products/:id')
  deleteProduct(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.catalog.deleteProduct(req.user.id, workspaceId, id);
  }
}

@Controller('public')
export class CatalogPublicController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  getPrimaryCatalog() {
    return this.catalog.publicPrimaryCatalog();
  }

  @Get(':slug')
  getPublicCatalog(@Param('slug') slug: string) {
    return this.catalog.publicCatalog(slug);
  }
}

@Module({
  providers: [CatalogService, WorkspaceGuardService],
  controllers: [CatalogAdminController, CatalogPublicController],
  exports: [CatalogService, WorkspaceGuardService],
})
export class CatalogModule {}
