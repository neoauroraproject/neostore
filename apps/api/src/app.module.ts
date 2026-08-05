import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.service';
import { ExtensionsModule } from './extensions/extensions.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { PortalModule } from './portal/portal.module';
import { WalletModule } from './wallet/wallet.module';
import { TelegramModule } from './telegram/telegram.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MediaModule } from './media/media.module';
import { InventoryModule } from './inventory/inventory.module';
import { PlatformModule } from './platform/platform.module';
import { MailerModule } from './mailer/mailer.module';
import { TicketsModule } from './tickets/tickets.module';
import { GoogleOAuthModule } from './oauth/google-oauth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ExtensionsModule,
    AuthModule,
    CatalogModule,
    OrdersModule,
    PortalModule,
    WalletModule,
    TelegramModule,
    AnalyticsModule,
    MediaModule,
    InventoryModule,
    PlatformModule,
    MailerModule,
    TicketsModule,
    GoogleOAuthModule,
  ],
})
export class AppModule {}
