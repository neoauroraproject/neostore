import { Controller, Get, Injectable, Module, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceGuardService, CatalogModule } from '../catalog/catalog.module';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceGuardService,
  ) {}

  async series(userId: string, workspaceId: string, range = '30d', groupBy = 'day') {
    await this.access.requireMember(userId, workspaceId);
    const days = range === '7d' ? 7 : range === '90d' ? 90 : range === '365d' ? 365 : 30;
    const since = new Date(Date.now() - days * 86400000);
    const orders = await this.prisma.order.findMany({
      where: {
        workspaceId,
        createdAt: { gte: since },
        status: { in: ['Completed', 'Delivered'] },
      },
      select: { amount: true, createdAt: true, isRenewal: true },
    });
    const buckets = new Map<string, { revenue: number; orders: number; renewals: number }>();
    for (const o of orders) {
      const d = o.createdAt;
      const key =
        groupBy === 'month'
          ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
          : groupBy === 'week'
            ? `${d.getUTCFullYear()}-W${Math.ceil(d.getUTCDate() / 7)}`
            : d.toISOString().slice(0, 10);
      const b = buckets.get(key) || { revenue: 0, orders: 0, renewals: 0 };
      b.revenue += o.amount;
      b.orders += 1;
      if (o.isRenewal) b.renewals += 1;
      buckets.set(key, b);
    }
    return {
      range,
      groupBy,
      points: [...buckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v })),
    };
  }
}

@Controller('admin/workspaces/:workspaceId/analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  get(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Query('range') range?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.analytics.series(req.user.id, workspaceId, range, groupBy);
  }
}

@Module({
  imports: [CatalogModule],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
