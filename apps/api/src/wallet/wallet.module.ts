import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LedgerEntryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceGuardService, CatalogModule } from '../catalog/catalog.module';
import { EventBus } from '../extensions/event-bus';
import { HookBus } from '../extensions/hook-bus';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceGuardService,
    private readonly events: EventBus,
    private readonly hooks: HookBus,
  ) {}

  private async getOrCreateCustomerAccount(customerId: string, currency = 'USD') {
    let account = await this.prisma.ledgerAccount.findFirst({
      where: { customerId, kind: 'customer_wallet', currency },
    });
    if (!account) {
      const customer = await this.prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
      account = await this.prisma.ledgerAccount.create({
        data: {
          workspaceId: customer.workspaceId,
          customerId,
          kind: 'customer_wallet',
          currency,
        },
      });
    }
    return account;
  }

  async balance(customerId: string, currency = 'USD') {
    const account = await this.getOrCreateCustomerAccount(customerId, currency);
    const agg = await this.prisma.ledgerEntry.aggregate({
      where: { accountId: account.id },
      _sum: { amount: true },
    });
    return { accountId: account.id, currency, balance: agg._sum.amount || 0 };
  }

  async deposit(customerId: string, amount: number, currency = 'USD', meta?: object) {
    if (amount <= 0) throw new BadRequestException('amount must be positive');
    await this.hooks.run('beforeWalletDeposit', { customerId, amount, currency });
    const account = await this.getOrCreateCustomerAccount(customerId, currency);
    const entry = await this.prisma.ledgerEntry.create({
      data: {
        accountId: account.id,
        type: LedgerEntryType.Deposit,
        amount,
        currency,
        meta: meta || {},
      },
    });
    await this.events.emit('WalletDeposited', { customerId, amount, currency, entryId: entry.id });
    await this.hooks.run('afterWalletDeposit', { customerId, amount, currency });
    return this.balance(customerId, currency);
  }

  async purchase(customerId: string, amount: number, currency = 'USD', ref?: { refType: string; refId: string }) {
    if (amount <= 0) throw new BadRequestException('amount must be positive');
    const bal = await this.balance(customerId, currency);
    if (bal.balance < amount) throw new BadRequestException('Insufficient wallet balance');
    const account = await this.getOrCreateCustomerAccount(customerId, currency);
    await this.prisma.ledgerEntry.create({
      data: {
        accountId: account.id,
        type: LedgerEntryType.Purchase,
        amount: -Math.abs(amount),
        currency,
        refType: ref?.refType,
        refId: ref?.refId,
      },
    });
    return this.balance(customerId, currency);
  }

  async ledger(customerId: string) {
    const account = await this.getOrCreateCustomerAccount(customerId);
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const bal = await this.balance(customerId);
    return { ...bal, entries };
  }

  async workspaceSettlementPreview(userId: string, workspaceId: string) {
    await this.access.requireMember(userId, workspaceId);
    const revenue = await this.prisma.order.aggregate({
      where: { workspaceId, status: { in: ['Completed', 'Delivered'] } },
      _sum: { amount: true },
    });
    const gross = revenue._sum.amount || 0;
    const commissionRate = 0.1;
    const commission = gross * commissionRate;
    return {
      gross,
      commission,
      settleable: gross - commission,
      commissionRate,
      note: 'P1 manual settlement — platform collects; settleable is informational',
    };
  }
}

@Controller('admin/workspaces/:workspaceId/wallet')
@UseGuards(AuthGuard('jwt'))
export class WalletAdminController {
  constructor(private readonly wallet: WalletService) {}

  @Get('settlement-preview')
  preview(@Req() req: { user: { id: string } }, @Param('workspaceId') workspaceId: string) {
    return this.wallet.workspaceSettlementPreview(req.user.id, workspaceId);
  }
}

@Module({
  imports: [CatalogModule],
  providers: [WalletService],
  controllers: [WalletAdminController],
  exports: [WalletService],
})
export class WalletModule {}
