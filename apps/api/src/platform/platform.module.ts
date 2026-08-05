import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Patch,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { MailerModule, MailerService, type SmtpConfig } from '../mailer/mailer.module';

export type PlatformValue = {
  cryptoAssets?: Array<{
    id: string;
    symbol: string;
    network: string;
    label: string;
    enabled?: boolean;
    rateToUsd?: number;
  }>;
  fxBase?: 'USD' | 'USDT';
  googleOAuth?: {
    clientId?: string;
    clientSecret?: string;
    enabledForCustomers?: boolean;
    enabledForSellers?: boolean;
  };
  smtp?: SmtpConfig;
};

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async requireSuper(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u || u.role !== 'super_admin') throw new ForbiddenException('Super admin only');
    return u;
  }

  async get(): Promise<PlatformValue> {
    const row = await this.prisma.platformSettings.findUnique({ where: { id: 'default' } });
    const value = (row?.value || {}) as PlatformValue;
    if (!value.cryptoAssets?.length) {
      value.cryptoAssets = [
        { id: 'USDT_TRC20', symbol: 'USDT', network: 'TRC20', label: 'USDT (TRC20)', enabled: true, rateToUsd: 1 },
        { id: 'USDT_BEP20', symbol: 'USDT', network: 'BEP20', label: 'USDT (BEP20)', enabled: true, rateToUsd: 1 },
        { id: 'USDC_POLYGON', symbol: 'USDC', network: 'Polygon', label: 'USDC (Polygon)', enabled: true, rateToUsd: 1 },
      ];
    }
    if (!value.fxBase) value.fxBase = 'USD';
    return value;
  }

  async patch(userId: string, patch: PlatformValue) {
    await this.requireSuper(userId);
    const current = await this.get();
    const next: PlatformValue = {
      ...current,
      ...patch,
      smtp: { ...(current.smtp || {}), ...(patch.smtp || {}) },
      googleOAuth: { ...(current.googleOAuth || {}), ...(patch.googleOAuth || {}) },
    };
    // never echo empty secret overwriting with blank unless explicitly sent as null clear
    if (patch.smtp && patch.smtp.password === '') {
      next.smtp!.password = current.smtp?.password;
    }
    if (patch.googleOAuth && patch.googleOAuth.clientSecret === '') {
      next.googleOAuth!.clientSecret = current.googleOAuth?.clientSecret;
    }
    await this.prisma.platformSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', value: next as object },
      update: { value: next as object },
    });
    return this.publicView(next);
  }

  publicView(value: PlatformValue) {
    return {
      ...value,
      smtp: value.smtp
        ? {
            ...value.smtp,
            password: value.smtp.password ? '••••••••' : '',
          }
        : {},
      googleOAuth: value.googleOAuth
        ? {
            ...value.googleOAuth,
            clientSecret: value.googleOAuth.clientSecret ? '••••••••' : '',
          }
        : {},
    };
  }
}

@Controller('admin/platform')
@UseGuards(AuthGuard('jwt'))
export class PlatformController {
  constructor(
    private readonly platform: PlatformService,
    private readonly mailer: MailerService,
  ) {}

  @Get('settings')
  async get(@Req() req: { user: { id: string } }) {
    await this.platform.requireSuper(req.user.id);
    return this.platform.publicView(await this.platform.get());
  }

  @Patch('settings')
  patch(@Req() req: { user: { id: string } }, @Body() body: PlatformValue) {
    return this.platform.patch(req.user.id, body);
  }

  @Post('smtp/test')
  async testSmtp(@Req() req: { user: { id: string } }, @Body() body: { to: string }) {
    await this.platform.requireSuper(req.user.id);
    return this.mailer.sendTest(body.to);
  }
}

@Module({
  imports: [MailerModule],
  providers: [PlatformService],
  controllers: [PlatformController],
  exports: [PlatformService],
})
export class PlatformModule {}
