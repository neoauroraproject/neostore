import { Body, Controller, Injectable, Module, Param, Post, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceGuardService, CatalogModule } from '../catalog/catalog.module';
import { OrdersService, OrdersModule } from '../orders/orders.module';

@Injectable()
export class TelegramBotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceGuardService,
    private readonly orders: OrdersService,
  ) {}

  async saveSettings(
    userId: string,
    workspaceId: string,
    body: { enabled?: boolean; botToken?: string; welcomeText?: string; adminChatId?: string },
  ) {
    await this.access.requireMember(userId, workspaceId);
    const secret = body.botToken ? Buffer.from(body.botToken).toString('base64url').slice(0, 24) : undefined;
    return this.prisma.storeProfile.update({
      where: { workspaceId },
      data: {
        telegramBotEnabled: body.enabled,
        telegramBotTokenEnc: body.botToken ? `enc:${body.botToken.slice(0, 4)}…` : undefined,
        telegramWelcomeText: body.welcomeText,
        telegramAdminChatId: body.adminChatId,
        ...(secret ? { telegramWebhookSecret: secret } : {}),
      },
    });
  }

  async webhook(slug: string, secret: string, update: Record<string, unknown>) {
    const store = await this.prisma.storeProfile.findUnique({ where: { slug } });
    if (!store || store.telegramWebhookSecret !== secret) {
      throw new BadRequestException('Invalid webhook');
    }
    const message = update.message as { text?: string; chat?: { id: number } } | undefined;
    const callback = update.callback_query as
      | { data?: string; message?: { chat?: { id: number } } }
      | undefined;
    const text = message?.text || '';
    const chatId = String(message?.chat?.id || callback?.message?.chat?.id || '');

    if (text.startsWith('/admin') || text.startsWith('/setadmin')) {
      await this.prisma.storeProfile.update({
        where: { id: store.id },
        data: { telegramAdminChatId: chatId },
      });
      return { ok: true, reply: 'Admin chat bound' };
    }

    if (callback?.data?.startsWith('approve:')) {
      const orderId = callback.data.slice('approve:'.length);
      await this.orders.approve('telegram', store.workspaceId, orderId);
      return { ok: true, reply: `Approved ${orderId}` };
    }
    if (callback?.data?.startsWith('reject:')) {
      const orderId = callback.data.slice('reject:'.length);
      await this.orders.reject('telegram', store.workspaceId, orderId, 'Rejected via Telegram');
      return { ok: true, reply: `Rejected ${orderId}` };
    }

    if (text.startsWith('/start')) {
      return {
        ok: true,
        reply: store.telegramWelcomeText || `Welcome to ${store.title}`,
        miniAppHint: `/shop/${store.slug}?tg=1`,
      };
    }

    return { ok: true };
  }

  async broadcast(
    userId: string,
    workspaceId: string,
    body: { text: string; audience: 'all' | 'with_service' | 'without_service' },
  ) {
    await this.access.requireMember(userId, workspaceId);
    const customers = await this.prisma.customer.findMany({
      where: { workspaceId, telegramUserId: { not: null } },
      include: { entitlements: true },
    });
    const now = Date.now();
    let recipients = customers;
    if (body.audience === 'with_service') {
      recipients = customers.filter((c) =>
        c.entitlements.some((e) => e.enable && (!e.expiresAt || e.expiresAt.getTime() > now)),
      );
    }
    if (body.audience === 'without_service') {
      recipients = customers.filter(
        (c) => !c.entitlements.some((e) => e.enable && (!e.expiresAt || e.expiresAt.getTime() > now)),
      );
    }
    return {
      ok: true,
      audience: body.audience,
      recipientCount: recipients.length,
      preview: body.text.slice(0, 200),
      note: 'P0 records broadcast intent; actual Telegram send uses bot token at runtime',
    };
  }
}

@Controller('admin/workspaces/:workspaceId/telegram')
@UseGuards(AuthGuard('jwt'))
export class TelegramAdminController {
  constructor(private readonly tg: TelegramBotService) {}

  @Post()
  save(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Body() body: { enabled?: boolean; botToken?: string; welcomeText?: string; adminChatId?: string },
  ) {
    return this.tg.saveSettings(req.user.id, workspaceId, body);
  }

  @Post('broadcast')
  broadcast(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Body() body: { text: string; audience: 'all' | 'with_service' | 'without_service' },
  ) {
    return this.tg.broadcast(req.user.id, workspaceId, body);
  }
}

@Controller('store/telegram/webhook')
export class TelegramWebhookController {
  constructor(private readonly tg: TelegramBotService) {}

  @Post(':slug/:secret')
  hook(
    @Param('slug') slug: string,
    @Param('secret') secret: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.tg.webhook(slug, secret, body);
  }
}

@Module({
  imports: [CatalogModule, OrdersModule],
  providers: [TelegramBotService],
  controllers: [TelegramAdminController, TelegramWebhookController],
  exports: [TelegramBotService],
})
export class TelegramModule {}
