import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceGuardService, CatalogModule } from '../catalog/catalog.module';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceGuardService,
  ) {}

  async listPools(userId: string, workspaceId: string) {
    await this.access.requireMember(userId, workspaceId);
    const pools = await this.prisma.inventoryPool.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { items: true } },
        items: { where: { used: false }, select: { id: true }, take: 1 },
      },
    });
    const withRemaining = await Promise.all(
      pools.map(async (p) => {
        const remaining = await this.prisma.inventoryItem.count({
          where: { poolId: p.id, used: false },
        });
        const used = await this.prisma.inventoryItem.count({
          where: { poolId: p.id, used: true },
        });
        return {
          id: p.id,
          name: p.name,
          createdAt: p.createdAt,
          total: remaining + used,
          remaining,
          used,
        };
      }),
    );
    return withRemaining;
  }

  async createPool(userId: string, workspaceId: string, body: { name: string }) {
    await this.access.requireMember(userId, workspaceId);
    if (!body.name?.trim()) throw new BadRequestException('name required');
    return this.prisma.inventoryPool.create({
      data: { workspaceId, name: body.name.trim() },
    });
  }

  async getPool(userId: string, workspaceId: string, poolId: string) {
    await this.access.requireMember(userId, workspaceId);
    const pool = await this.prisma.inventoryPool.findFirst({
      where: { id: poolId, workspaceId },
    });
    if (!pool) throw new NotFoundException('Pool not found');
    const remaining = await this.prisma.inventoryItem.count({
      where: { poolId, used: false },
    });
    const used = await this.prisma.inventoryItem.count({
      where: { poolId, used: true },
    });
    const recent = await this.prisma.inventoryItem.findMany({
      where: { poolId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, code: true, used: true, usedAt: true, createdAt: true },
    });
    return { ...pool, remaining, used, total: remaining + used, items: recent };
  }

  async addCodes(userId: string, workspaceId: string, poolId: string, codes: string[]) {
    await this.access.requireMember(userId, workspaceId);
    const pool = await this.prisma.inventoryPool.findFirst({
      where: { id: poolId, workspaceId },
    });
    if (!pool) throw new NotFoundException('Pool not found');
    const cleaned = [
      ...new Set(
        codes
          .flatMap((c) => String(c).split(/[\r\n]+/))
          .map((c) => c.trim())
          .filter(Boolean),
      ),
    ];
    if (!cleaned.length) throw new BadRequestException('No codes provided');

    let added = 0;
    let skipped = 0;
    for (const code of cleaned) {
      try {
        await this.prisma.inventoryItem.create({ data: { poolId, code } });
        added += 1;
      } catch {
        skipped += 1;
      }
    }
    await this.syncProductsForPool(workspaceId, poolId);
    return { added, skipped, remaining: await this.remaining(poolId) };
  }

  async remaining(poolId: string) {
    return this.prisma.inventoryItem.count({ where: { poolId, used: false } });
  }

  /** Sync stockCount on products bound to this pool via blueprint.providerConfig.poolId */
  async syncProductsForPool(workspaceId: string, poolId: string) {
    const remaining = await this.remaining(poolId);
    const blueprints = await this.prisma.fulfillmentBlueprint.findMany({
      where: { workspaceId, providerType: 'neostore.delivery.entitlement_code' },
    });
    const bound = blueprints.filter((b) => {
      const cfg = (b.providerConfig || {}) as { poolId?: string };
      return cfg.poolId === poolId;
    });
    for (const bp of bound) {
      await this.prisma.product.updateMany({
        where: { workspaceId, blueprintId: bp.id },
        data: { stockCount: remaining, stockUnlimited: false },
      });
    }
    return remaining;
  }

  async syncProductStock(workspaceId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, workspaceId },
      include: { blueprint: true },
    });
    if (!product) return null;
    const cfg = (product.blueprint.providerConfig || {}) as { poolId?: string };
    if (product.blueprint.providerType !== 'neostore.delivery.entitlement_code' || !cfg.poolId) {
      return null;
    }
    const remaining = await this.remaining(cfg.poolId);
    return this.prisma.product.update({
      where: { id: productId },
      data: { stockCount: remaining, stockUnlimited: false },
    });
  }
}

@Controller('admin/workspaces/:workspaceId/inventory')
@UseGuards(AuthGuard('jwt'))
export class InventoryAdminController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('pools')
  list(@Req() req: { user: { id: string } }, @Param('workspaceId') workspaceId: string) {
    return this.inventory.listPools(req.user.id, workspaceId);
  }

  @Post('pools')
  create(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Body() body: { name: string },
  ) {
    return this.inventory.createPool(req.user.id, workspaceId, body);
  }

  @Get('pools/:poolId')
  get(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('poolId') poolId: string,
  ) {
    return this.inventory.getPool(req.user.id, workspaceId, poolId);
  }

  @Post('pools/:poolId/codes')
  addCodes(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('poolId') poolId: string,
    @Body() body: { codes?: string[] | string },
  ) {
    const raw = body.codes;
    const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
    return this.inventory.addCodes(req.user.id, workspaceId, poolId, list);
  }
}

@Module({
  imports: [CatalogModule],
  providers: [InventoryService],
  controllers: [InventoryAdminController],
  exports: [InventoryService],
})
export class InventoryModule {}
