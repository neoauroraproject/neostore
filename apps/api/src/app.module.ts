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
  ],
})
export class AppModule {}
