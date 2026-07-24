import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
  UnauthorizedException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus } from '../extensions/event-bus';
import { hashToken, newRawToken } from '../auth/auth.module';
import { WorkspaceGuardService } from '../catalog/catalog.module';
import { CatalogModule } from '../catalog/catalog.module';
import { OrdersModule } from '../orders/orders.module';

const SESSION_DAYS = 14;

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  private async customerFromSession(raw?: string) {
    if (!raw) throw new UnauthorizedException('Missing x-customer-session');
    const tokenHash = hashToken(raw);
    const session = await this.prisma.customerSession.findUnique({
      where: { tokenHash },
      include: { customer: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid session');
    }
    await this.prisma.customerSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });
    return session.customer;
  }

  async loginWithToken(token: string) {
    const customer = await this.prisma.customer.findUnique({ where: { token } });
    if (!customer) throw new NotFoundException('Customer not found');
    const raw = newRawToken(32);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
    await this.prisma.customerSession.create({
      data: {
        customerId: customer.id,
        tokenHash: hashToken(raw),
        expiresAt,
      },
    });
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastSeenAt: new Date() },
    });
    return { sessionToken: raw, expiresAt, customer: this.publicCustomer(customer) };
  }

  async dashboard(sessionToken: string) {
    const customer = await this.customerFromSession(sessionToken);
    const meta = (customer.metadata || {}) as {
      linkedEntitlementIds?: string[];
      hiddenEntitlementIds?: string[];
    };
    const linked = new Set(meta.linkedEntitlementIds || []);
    const hidden = new Set(meta.hiddenEntitlementIds || []);

    const [orders, entitlements, notifications] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId: customer.id },
        include: { product: true, payment: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.entitlement.findMany({
        where: {
          OR: [{ customerId: customer.id }, { id: { in: [...linked] } }],
          workspaceId: customer.workspaceId,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customerNotification.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const visible = entitlements.filter((e) => !hidden.has(e.id));
    return {
      customer: this.publicCustomer(customer),
      orders,
      entitlements: visible.map((e) => ({
        ...e,
        quotaTotal: e.quotaTotal.toString(),
        quotaUsed: e.quotaUsed.toString(),
      })),
      notifications,
    };
  }

  async claim(sessionToken: string, accessLink: string) {
    const customer = await this.customerFromSession(sessionToken);
    const key = accessLink.trim();
    if (!key) throw new BadRequestException('accessLink required');
    const entitlement = await this.prisma.entitlement.findFirst({
      where: {
        workspaceId: customer.workspaceId,
        OR: [{ accessKey: key }, { id: key }],
      },
    });
    if (!entitlement) throw new NotFoundException('Entitlement not found');
    await this.prisma.entitlement.update({
      where: { id: entitlement.id },
      data: { customerId: customer.id },
    });
    const meta = (customer.metadata || {}) as { linkedEntitlementIds?: string[]; hiddenEntitlementIds?: string[] };
    const linked = new Set(meta.linkedEntitlementIds || []);
    linked.add(entitlement.id);
    const hidden = (meta.hiddenEntitlementIds || []).filter((id) => id !== entitlement.id);
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { metadata: { ...meta, linkedEntitlementIds: [...linked], hiddenEntitlementIds: hidden } },
    });
    return this.dashboard(sessionToken);
  }

  async hide(sessionToken: string, entitlementId: string) {
    const customer = await this.customerFromSession(sessionToken);
    const meta = (customer.metadata || {}) as { hiddenEntitlementIds?: string[]; linkedEntitlementIds?: string[] };
    const hidden = new Set(meta.hiddenEntitlementIds || []);
    hidden.add(entitlementId);
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { metadata: { ...meta, hiddenEntitlementIds: [...hidden] } },
    });
    return { ok: true };
  }

  async logout(sessionToken: string) {
    const tokenHash = hashToken(sessionToken);
    await this.prisma.customerSession.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async telegramSession(slug: string, initData: string) {
    // P0: trust telegramId parsed from initData-like payload `user={"id":123}` or body fields
    // Production must HMAC-validate against bot token.
    const store = await this.prisma.storeProfile.findUnique({ where: { slug } });
    if (!store) throw new NotFoundException('Store not found');
    let telegramId = '';
    let username = '';
    let name = '';
    try {
      const params = new URLSearchParams(initData);
      const userRaw = params.get('user');
      if (userRaw) {
        const user = JSON.parse(userRaw);
        telegramId = String(user.id || '');
        username = user.username || '';
        name = [user.first_name, user.last_name].filter(Boolean).join(' ');
      }
    } catch {
      /* fallthrough */
    }
    if (!telegramId && initData.includes('telegramId=')) {
      telegramId = initData.split('telegramId=')[1]?.split('&')[0] || '';
    }
    if (!telegramId) throw new BadRequestException('Invalid Telegram initData');

    let customer = await this.prisma.customer.findFirst({
      where: { workspaceId: store.workspaceId, telegramUserId: telegramId },
    });
    if (!customer) {
      const token = `NS-${newRawToken(3).slice(0, 4)}-${newRawToken(3).slice(0, 4)}-${newRawToken(3).slice(0, 4)}`.toUpperCase();
      customer = await this.prisma.customer.create({
        data: {
          workspaceId: store.workspaceId,
          token,
          name: name || username || `tg_${telegramId}`,
          telegramUserId: telegramId,
          telegramUsername: username || null,
          telegram: username ? `@${username}` : null,
        },
      });
      await this.events.emit('CustomerRegistered', {
        customerId: customer.id,
        workspaceId: store.workspaceId,
        via: 'telegram',
      });
    }
    return this.loginWithToken(customer.token);
  }

  private publicCustomer(c: {
    id: string;
    token: string;
    name: string | null;
    email: string | null;
    telegram: string | null;
    telegramUserId: string | null;
    telegramUsername: string | null;
  }) {
    return {
      id: c.id,
      token: c.token,
      name: c.name,
      email: c.email,
      telegram: c.telegram,
      telegramUserId: c.telegramUserId,
      telegramUsername: c.telegramUsername,
    };
  }
}

@Injectable()
export class CustomersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceGuardService,
  ) {}

  async list(userId: string, workspaceId: string, segment?: string, search?: string) {
    await this.access.requireMember(userId, workspaceId);
    const customers = await this.prisma.customer.findMany({
      where: { workspaceId },
      include: {
        orders: { select: { id: true, amount: true, status: true, entitlementId: true, createdAt: true } },
        entitlements: { select: { id: true, enable: true, expiresAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const now = Date.now();
    let rows = customers.map((c) => {
      const meta = (c.metadata || {}) as { linkedEntitlementIds?: string[] };
      const ids = new Set<string>();
      for (const e of c.entitlements) ids.add(e.id);
      for (const id of meta.linkedEntitlementIds || []) ids.add(id);
      for (const o of c.orders) if (o.entitlementId) ids.add(o.entitlementId);
      // only count existing entitlements
      const existing = c.entitlements.filter((e) => ids.has(e.id));
      const revenue = c.orders
        .filter((o) => o.status === 'Completed' || o.status === 'Delivered')
        .reduce((s, o) => s + o.amount, 0);
      const hasActive = existing.some(
        (e) => e.enable && (!e.expiresAt || e.expiresAt.getTime() > now),
      );
      return {
        id: c.id,
        token: c.token,
        name: c.name,
        telegram: c.telegram,
        telegramUserId: c.telegramUserId,
        telegramUsername: c.telegramUsername,
        email: c.email,
        orderCount: c.orders.length,
        serviceCount: existing.length,
        hasActiveService: hasActive,
        revenue,
        lastSeenAt: c.lastSeenAt,
        createdAt: c.createdAt,
        isNew: !c.orders.length && !!c.telegramUserId,
      };
    });
    if (segment === 'new') rows = rows.filter((r) => r.isNew);
    if (segment === 'with_service') rows = rows.filter((r) => r.hasActiveService);
    if (segment === 'without_service') rows = rows.filter((r) => !!r.telegramUserId && !r.hasActiveService);
    if (segment === 'telegram_only') rows = rows.filter((r) => !!r.telegramUserId);
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) =>
        [r.name, r.token, r.telegram, r.telegramUserId, r.telegramUsername, r.email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    return rows;
  }

  async detail(userId: string, workspaceId: string, id: string) {
    await this.access.requireMember(userId, workspaceId);
    const customer = await this.prisma.customer.findFirst({
      where: { id, workspaceId },
      include: {
        orders: {
          include: { product: true, payment: true },
          orderBy: { createdAt: 'desc' },
        },
        entitlements: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    const meta = (customer.metadata || {}) as { linkedEntitlementIds?: string[] };
    const linkedIds = meta.linkedEntitlementIds || [];
    const extra = linkedIds.length
      ? await this.prisma.entitlement.findMany({
          where: { id: { in: linkedIds }, workspaceId },
        })
      : [];
    const byId = new Map<string, (typeof customer.entitlements)[0]>();
    for (const e of [...customer.entitlements, ...extra]) byId.set(e.id, e);

    // Heal ACTIVE/Delivered orders missing entitlement via configName=label
    for (const o of customer.orders) {
      if (!['Delivered', 'Completed'].includes(o.status)) continue;
      if (o.entitlementId && byId.has(o.entitlementId)) continue;
      const match = [...byId.values()].find((e) => e.label === o.configName);
      if (match) {
        await this.prisma.order.update({ where: { id: o.id }, data: { entitlementId: match.id } });
        o.entitlementId = match.id;
      } else {
        const byLabel = await this.prisma.entitlement.findFirst({
          where: { workspaceId, label: o.configName },
        });
        if (byLabel) {
          byId.set(byLabel.id, byLabel);
          await this.prisma.order.update({ where: { id: o.id }, data: { entitlementId: byLabel.id } });
        }
      }
    }

    const services = [...byId.values()].map((e) => ({
      ...e,
      quotaTotal: e.quotaTotal.toString(),
      quotaUsed: e.quotaUsed.toString(),
      status: !e.enable
        ? 'disabled'
        : e.expiresAt && e.expiresAt.getTime() <= Date.now()
          ? 'expired'
          : 'active',
    }));

    return { ...customer, services };
  }
}

@Controller('customer')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Post('session')
  login(@Body() body: { token?: string; customerToken?: string }) {
    const token = body.token || body.customerToken;
    if (!token) throw new BadRequestException('token required');
    return this.portal.loginWithToken(token);
  }

  @Get('session')
  dashboard(@Headers('x-customer-session') session: string) {
    return this.portal.dashboard(session);
  }

  @Post('logout')
  logout(@Headers('x-customer-session') session: string) {
    return this.portal.logout(session);
  }

  @Post('entitlements/claim')
  claim(@Headers('x-customer-session') session: string, @Body() body: { accessLink: string }) {
    return this.portal.claim(session, body.accessLink);
  }

  @Post('entitlements/:id/hide')
  hide(@Headers('x-customer-session') session: string, @Param('id') id: string) {
    return this.portal.hide(session, id);
  }
}

@Controller('telegram')
export class TelegramPublicController {
  constructor(private readonly portal: PortalService) {}

  @Post('session')
  session(@Body() body: { slug: string; initData: string }) {
    return this.portal.telegramSession(body.slug, body.initData);
  }
}

@Controller('admin/workspaces/:workspaceId/customers')
@UseGuards(AuthGuard('jwt'))
export class CustomersAdminController {
  constructor(private readonly customers: CustomersAdminService) {}

  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Query('segment') segment?: string,
    @Query('search') search?: string,
  ) {
    return this.customers.list(req.user.id, workspaceId, segment, search);
  }

  @Get(':id')
  detail(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.customers.detail(req.user.id, workspaceId, id);
  }
}

@Module({
  imports: [CatalogModule, OrdersModule],
  providers: [PortalService, CustomersAdminService],
  controllers: [PortalController, TelegramPublicController, CustomersAdminController],
  exports: [PortalService, CustomersAdminService],
})
export class PortalModule {}
