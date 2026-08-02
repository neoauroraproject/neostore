import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformOrderStatus, PaymentStatus, Prisma, DeliveryMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExtensionHost } from '../extensions/extension-host';
import { EventBus } from '../extensions/event-bus';
import { HookBus } from '../extensions/hook-bus';
import { WorkspaceGuardService } from '../catalog/catalog.module';
import { newRawToken } from '../auth/auth.module';
import { WalletService } from '../wallet/wallet.module';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly host: ExtensionHost,
    private readonly events: EventBus,
    private readonly hooks: HookBus,
    private readonly access: WorkspaceGuardService,
    private readonly wallet: WalletService,
  ) {}

  private async nextTracking(storeId: string) {
    const store = await this.prisma.storeProfile.update({
      where: { id: storeId },
      data: { nextOrderNumber: { increment: 1 } },
    });
    return String(store.nextOrderNumber - 1);
  }

  private async ensureCustomer(workspaceId: string, input: {
    customerToken?: string;
    name?: string;
    email?: string;
    telegram?: string;
  }) {
    if (input.customerToken) {
      const existing = await this.prisma.customer.findUnique({ where: { token: input.customerToken } });
      if (existing && existing.workspaceId === workspaceId) {
        return existing;
      }
    }
    const token = `NS-${newRawToken(3).slice(0, 4)}-${newRawToken(3).slice(0, 4)}-${newRawToken(3).slice(0, 4)}`.toUpperCase();
    return this.prisma.customer.create({
      data: {
        workspaceId,
        token,
        name: input.name,
        email: input.email,
        telegram: input.telegram,
      },
    });
  }

  async checkout(slug: string, body: Record<string, unknown>) {
    const store = await this.prisma.storeProfile.findUnique({ where: { slug } });
    if (!store?.enabled) throw new NotFoundException('Store not found');
    const product = await this.prisma.product.findFirst({
      where: { id: String(body.productId), workspaceId: store.workspaceId, visible: true },
      include: { blueprint: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (product.deliveryMode === DeliveryMode.instant) {
      const cfg = (product.blueprint.providerConfig || {}) as { poolId?: string };
      if (product.blueprint.providerType === 'neostore.delivery.entitlement_code' && cfg.poolId) {
        const remaining = await this.prisma.inventoryItem.count({
          where: { poolId: cfg.poolId, used: false },
        });
        if (remaining <= 0) throw new BadRequestException('Out of stock');
      } else if (!product.stockUnlimited && product.stockCount <= 0) {
        throw new BadRequestException('Out of stock');
      }
    }

    const currency = String(body.currency || store.defaultCurrency || 'USD');
    const amount = currency === 'IRT' ? Number(product.priceToman || product.priceUsd) : Number(product.priceUsd);

    const prepared = await this.hooks.run('beforeOrderCreate', {
      workspaceId: store.workspaceId,
      productId: product.id,
      amount,
      currency,
    });

    const customer = await this.ensureCustomer(store.workspaceId, {
      customerToken: body.customerToken as string | undefined,
      name: body.name as string | undefined,
      email: body.email as string | undefined,
      telegram: body.telegram as string | undefined,
    });

    const method = String(body.paymentMethod || 'manual_bank');
    const gatewayId =
      method === 'cryptomus'
        ? 'neostore.payment.cryptomus'
        : method === 'manual_crypto'
          ? 'neostore.payment.manual_crypto'
          : 'neostore.payment.manual_bank';
    const gateway = this.host.getPayment(gatewayId);
    if (!gateway) throw new BadRequestException('Payment gateway extension not enabled');

    const hasReceipt = Boolean(body.receiptText || body.receiptImage);
    const isManual = method === 'manual_bank' || method === 'manual_crypto';
    if (body.isRenewal && isManual && !hasReceipt) {
      throw new BadRequestException('Renewals require a receipt for manual payments');
    }

    let status: PlatformOrderStatus = PlatformOrderStatus.PendingPayment;
    let payStatus: PaymentStatus = PaymentStatus.PENDING;
    let autoDeliverAt: Date | null = null;
    let pendingReview = false;

    if (isManual && hasReceipt) {
      status = PlatformOrderStatus.PendingPayment;
      payStatus = PaymentStatus.SUBMITTED;
      if (store.autoDeliverEnabled) {
        pendingReview = true;
        autoDeliverAt = new Date(Date.now() + store.autoDeliverDelayMinutes * 60_000);
      }
    }

    const trackingCode = await this.nextTracking(store.id);
    const order = await this.prisma.order.create({
      data: {
        workspaceId: store.workspaceId,
        storeId: store.id,
        productId: product.id,
        customerId: customer.id,
        trackingCode,
        configName: String(body.configName || customer.name || 'order'),
        amount: Number(prepared.amount || amount),
        currency,
        status,
        isRenewal: Boolean(body.isRenewal),
        renewEntitlementId: (body.renewEntitlementId as string) || null,
        autoDeliverAt,
        pendingReview,
        notes: (body.notes as string) || null,
        payment: {
          create: {
            method,
            status: payStatus,
            amount: Number(prepared.amount || amount),
            currency,
            receiptText: (body.receiptText as string) || null,
            receiptImage: (body.receiptImage as string) || null,
          },
        },
        timeline: {
          create: {
            status: 'CREATED',
            message: 'Order created',
            actor: 'customer',
          },
        },
      },
      include: { payment: true, customer: true },
    });

    const intent = await gateway.createIntent?.(this.host.context(store.workspaceId), {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      trackingCode,
    });

    if (method === 'cryptomus') {
      // awaiting webhook
    } else if (isManual && hasReceipt) {
      // awaiting admin / auto-deliver
    }

    await this.events.emit('OrderCreated', { orderId: order.id, workspaceId: store.workspaceId });
    await this.hooks.run('afterOrderCreate', { orderId: order.id });

    return {
      order: {
        id: order.id,
        trackingCode: order.trackingCode,
        status: order.status,
        amount: order.amount,
        currency: order.currency,
        customerToken: customer.token,
      },
      paymentIntent: intent || null,
    };
  }

  async track(code: string) {
    const order = await this.prisma.order.findUnique({
      where: { trackingCode: code },
      include: {
        payment: true,
        timeline: { orderBy: { createdAt: 'asc' } },
        product: true,
        customer: { select: { token: true, name: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    let entitlement = null;
    if (order.entitlementId) {
      entitlement = await this.prisma.entitlement.findUnique({ where: { id: order.entitlementId } });
    }
    return {
      ...order,
      product: { ...order.product, quotaUnits: order.product.quotaUnits.toString() },
      entitlement: entitlement
        ? {
            ...entitlement,
            quotaTotal: entitlement.quotaTotal.toString(),
            quotaUsed: entitlement.quotaUsed.toString(),
          }
        : null,
    };
  }

  async list(userId: string, workspaceId: string, status?: string) {
    await this.access.requireMember(userId, workspaceId);
    return this.prisma.order.findMany({
      where: {
        workspaceId,
        ...(status ? { status: status as PlatformOrderStatus } : {}),
      },
      include: { payment: true, customer: true, product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(userId: string, workspaceId: string, id: string) {
    if (userId !== 'system' && userId !== 'telegram') {
      await this.access.requireMember(userId, workspaceId);
    }
    const order = await this.prisma.order.findFirst({
      where: { id, workspaceId },
      include: {
        payment: true,
        customer: true,
        product: { include: { blueprint: true } },
        timeline: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async approve(userId: string, workspaceId: string, id: string) {
    if (userId !== 'system' && userId !== 'telegram') {
      await this.access.requireMember(userId, workspaceId);
    }
    const order = await this.get(userId, workspaceId, id);

    if (order.autoDelivered && order.pendingReview) {
      await this.prisma.order.update({
        where: { id },
        data: { pendingReview: false },
      });
      await this.prisma.orderTimelineEvent.create({
        data: { orderId: id, status: 'CONFIRMED', message: 'Admin confirmed auto-delivered order', actor: 'admin' },
      });
      return this.get(userId, workspaceId, id);
    }

    await this.hooks.run('beforePayment', { orderId: id });
    if (order.payment) {
      await this.prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: PaymentStatus.APPROVED, reviewedAt: new Date(), reviewedBy: userId },
      });
    }
    await this.prisma.order.update({
      where: { id },
      data: { status: PlatformOrderStatus.Paid },
    });
    await this.prisma.orderTimelineEvent.create({
      data: { orderId: id, status: 'Paid', message: 'Payment approved', actor: 'admin' },
    });
    await this.events.emit('PaymentCompleted', { orderId: id, workspaceId });
    await this.hooks.run('afterPayment', { orderId: id });

    const product = order.product;
    if (product.deliveryMode === DeliveryMode.manual) {
      const store = await this.prisma.storeProfile.findUnique({ where: { workspaceId } });
      const minutes =
        product.deliverWithinMinutes ?? store?.manualDeliverSlaMinutes ?? 60;
      const deliverByAt = new Date(Date.now() + Math.max(1, minutes) * 60_000);
      await this.prisma.order.update({
        where: { id },
        data: { status: PlatformOrderStatus.Processing, deliverByAt },
      });
      await this.prisma.orderTimelineEvent.create({
        data: {
          orderId: id,
          status: 'Processing',
          message: `Awaiting seller delivery (SLA ${minutes}m)`,
          actor: 'system',
        },
      });
      return this.get(userId, workspaceId, id);
    }

    return this.fulfill(userId, workspaceId, id);
  }

  async reject(userId: string, workspaceId: string, id: string, reason?: string) {
    if (userId !== 'system' && userId !== 'telegram') {
      await this.access.requireMember(userId, workspaceId);
    }
    const order = await this.get(userId, workspaceId, id);
    if (order.autoDelivered && order.entitlementId) {
      await this.prisma.entitlement.delete({ where: { id: order.entitlementId } }).catch(() => null);
    }
    await this.prisma.order.update({
      where: { id },
      data: {
        status: PlatformOrderStatus.Cancelled,
        rejectReason: reason || 'Rejected',
        pendingReview: false,
        entitlementId: null,
      },
    });
    if (order.payment) {
      await this.prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: PaymentStatus.REJECTED, rejectReason: reason || 'Rejected', reviewedBy: userId, reviewedAt: new Date() },
      });
    }
    await this.prisma.orderTimelineEvent.create({
      data: { orderId: id, status: 'Cancelled', message: reason || 'Rejected', actor: 'admin' },
    });
    return this.get(userId, workspaceId, id);
  }

  async fulfill(userId: string, workspaceId: string, id: string) {
    if (userId !== 'system' && userId !== 'telegram') {
      await this.access.requireMember(userId, workspaceId);
    }
    const order = await this.prisma.order.findFirst({
      where: { id, workspaceId },
      include: { product: { include: { blueprint: true } }, customer: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.order.update({
      where: { id },
      data: { status: PlatformOrderStatus.Processing, provisionError: null },
    });
    await this.prisma.orderTimelineEvent.create({
      data: { orderId: id, status: 'Processing', message: 'Fulfillment started', actor: 'system' },
    });

    const providerType = order.product.blueprint.providerType;
    const delivery = this.host.getDelivery(providerType);
    if (!delivery) throw new BadRequestException(`Delivery extension not found: ${providerType}`);

    const providerConfig = {
      ...((order.product.blueprint.providerConfig || {}) as Record<string, unknown>),
    };

    // Reserve inventory code for entitlement_code provider
    if (providerType === 'neostore.delivery.entitlement_code' && providerConfig.poolId) {
      const item = await this.prisma.inventoryItem.findFirst({
        where: { poolId: String(providerConfig.poolId), used: false },
        orderBy: { createdAt: 'asc' },
      });
      if (!item) {
        await this.prisma.order.update({
          where: { id },
          data: { provisionError: 'Inventory empty', status: PlatformOrderStatus.Processing },
        });
        throw new BadRequestException('Inventory pool empty');
      }
      await this.prisma.inventoryItem.update({
        where: { id: item.id },
        data: { used: true, usedAt: new Date(), orderId: id },
      });
      providerConfig.reservedCode = item.code;
      const remaining = await this.prisma.inventoryItem.count({
        where: { poolId: String(providerConfig.poolId), used: false },
      });
      await this.prisma.product.update({
        where: { id: order.productId },
        data: { stockCount: remaining, stockUnlimited: false },
      });
    }

    await this.hooks.run('beforeFulfillment', { orderId: id });
    try {
      const result = await delivery.fulfillNew(this.host.context(workspaceId), {
        workspaceId,
        orderId: id,
        productId: order.productId,
        customerId: order.customerId,
        label: order.configName,
        quotaUnits: order.product.quotaUnits,
        durationDays: order.product.durationDays,
        providerConfig,
      });

      const expiresAt =
        order.product.durationDays > 0
          ? new Date(Date.now() + order.product.durationDays * 86400000)
          : null;

      const entitlement = await this.prisma.entitlement.create({
        data: {
          id: result.entitlementId,
          workspaceId,
          customerId: order.customerId,
          productId: order.productId,
          orderId: id,
          blueprintId: order.product.blueprintId,
          label: order.configName,
          accessKey: result.access?.accessKey || null,
          accessUrl: result.access?.accessUrl || null,
          quotaTotal: BigInt(Number(order.product.quotaUnits || 0)),
          expiresAt,
          payload: (result.access?.payload || {}) as Prisma.InputJsonValue,
          enable: providerType !== 'neostore.delivery.manual',
        },
      });

      const meta = (order.customer.metadata || {}) as { linkedEntitlementIds?: string[] };
      const linked = Array.isArray(meta.linkedEntitlementIds) ? meta.linkedEntitlementIds : [];
      if (!linked.includes(entitlement.id)) {
        await this.prisma.customer.update({
          where: { id: order.customerId },
          data: {
            metadata: { ...meta, linkedEntitlementIds: [...linked, entitlement.id] },
          },
        });
      }

      const finalStatus = order.isRenewal ? PlatformOrderStatus.Completed : PlatformOrderStatus.Delivered;
      await this.prisma.order.update({
        where: { id },
        data: {
          status: finalStatus,
          entitlementId: entitlement.id,
          provisionError: null,
          deliverByAt: null,
        },
      });
      await this.prisma.orderTimelineEvent.create({
        data: { orderId: id, status: finalStatus, message: 'Fulfillment complete', actor: 'system' },
      });
      await this.events.emit('ProductPurchased', { orderId: id, entitlementId: entitlement.id, workspaceId });
      await this.hooks.run('afterFulfillment', { orderId: id, entitlementId: entitlement.id });
      return this.get(userId, workspaceId, id);
    } catch (err: any) {
      await this.prisma.order.update({
        where: { id },
        data: { provisionError: String(err?.message || err), status: PlatformOrderStatus.Processing },
      });
      await this.prisma.orderTimelineEvent.create({
        data: {
          orderId: id,
          status: 'PROVISION_FAILED',
          message: String(err?.message || err),
          actor: 'system',
        },
      });
      throw err;
    }
  }

  async cryptomusWebhook(body: Record<string, unknown>) {
    const orderId = String(body.order_id || body.orderId || '');
    if (!orderId) throw new BadRequestException('order_id required');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    const gateway = this.host.getPayment('neostore.payment.cryptomus');
    const verified = await gateway?.verify?.(this.host.context(order.workspaceId), body);
    if (!verified?.ok) return { ok: false };
    if (order.payment) {
      await this.prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: PaymentStatus.APPROVED, providerRef: verified.ref || null, reviewedAt: new Date() },
      });
    }
    return this.approve('system', order.workspaceId, orderId);
  }

  async processAutoDeliverDue() {
    const due = await this.prisma.order.findMany({
      where: {
        autoDeliverAt: { lte: new Date() },
        autoDelivered: false,
        pendingReview: true,
        status: PlatformOrderStatus.PendingPayment,
      },
      take: 20,
    });
    const results = [];
    for (const order of due) {
      try {
        await this.prisma.payment.updateMany({
          where: { orderId: order.id },
          data: { status: PaymentStatus.APPROVED, reviewedAt: new Date(), reviewedBy: 'system:auto-deliver' },
        });
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: PlatformOrderStatus.Paid, autoDelivered: true },
        });
        await this.fulfill('system', order.workspaceId, order.id);
        results.push({ id: order.id, ok: true });
      } catch (e: any) {
        results.push({ id: order.id, ok: false, error: String(e?.message || e) });
      }
    }
    return results;
  }

  /** Refund overdue manual deliveries to customer wallet balance. */
  async processSlaRefundDue() {
    const due = await this.prisma.order.findMany({
      where: {
        deliverByAt: { lte: new Date() },
        status: PlatformOrderStatus.Processing,
        entitlementId: null,
      },
      take: 50,
    });
    const results = [];
    for (const order of due) {
      try {
        await this.wallet.refund(order.customerId, order.amount, order.currency, {
          refType: 'order',
          refId: order.id,
          meta: { reason: 'sla_timeout', trackingCode: order.trackingCode },
        });
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: PlatformOrderStatus.Refunded,
            rejectReason: 'Auto-refund: delivery SLA exceeded',
            deliverByAt: null,
          },
        });
        await this.prisma.orderTimelineEvent.create({
          data: {
            orderId: order.id,
            status: 'Refunded',
            message: 'Auto-refunded to customer wallet (delivery SLA exceeded)',
            actor: 'system:sla-refund',
          },
        });
        results.push({ id: order.id, ok: true });
      } catch (e: any) {
        results.push({ id: order.id, ok: false, error: String(e?.message || e) });
      }
    }
    return results;
  }
}

@Injectable()
export class OrdersCronService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly orders: OrdersService) {}

  onModuleInit() {
    if (process.env.CRON_DISABLED === '1') return;
    const ms = Number(process.env.CRON_INTERVAL_MS || 60_000);
    this.timer = setInterval(() => {
      void this.orders.processAutoDeliverDue().catch(() => null);
      void this.orders.processSlaRefundDue().catch(() => null);
    }, Math.max(15_000, ms));
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

@Controller('public/:slug/order')
export class CheckoutController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  checkout(@Param('slug') slug: string, @Body() body: Record<string, unknown>) {
    return this.orders.checkout(slug, body);
  }
}

@Controller('track')
export class TrackController {
  constructor(private readonly orders: OrdersService) {}

  @Get(':code')
  track(@Param('code') code: string) {
    return this.orders.track(code);
  }
}

@Controller('webhooks/cryptomus')
export class CryptomusWebhookController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  hook(@Body() body: Record<string, unknown>) {
    return this.orders.cryptomusWebhook(body);
  }
}

@Controller('admin/workspaces/:workspaceId/orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersAdminController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Query('status') status?: string,
  ) {
    return this.orders.list(req.user.id, workspaceId, status);
  }

  @Get(':id')
  get(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.orders.get(req.user.id, workspaceId, id);
  }

  @Post(':id/approve')
  approve(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.orders.approve(req.user.id, workspaceId, id);
  }

  @Post(':id/reject')
  reject(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.orders.reject(req.user.id, workspaceId, id, body?.reason);
  }

  @Post(':id/fulfill')
  fulfill(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.orders.fulfill(req.user.id, workspaceId, id);
  }

  @Post('cron/auto-deliver')
  autoDeliver() {
    return this.orders.processAutoDeliverDue();
  }

  @Post('cron/sla-refund')
  slaRefund() {
    return this.orders.processSlaRefundDue();
  }

  /** Combined tick for operators / external cron. */
  @Post('cron/tick')
  async tick() {
    const [autoDeliver, slaRefund] = await Promise.all([
      this.orders.processAutoDeliverDue(),
      this.orders.processSlaRefundDue(),
    ]);
    return { autoDeliver, slaRefund };
  }
}

import { CatalogModule } from '../catalog/catalog.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [CatalogModule, WalletModule],
  providers: [OrdersService, OrdersCronService],
  controllers: [
    CheckoutController,
    TrackController,
    CryptomusWebhookController,
    OrdersAdminController,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
