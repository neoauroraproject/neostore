import { Global, Module } from '@nestjs/common';
import { EventBus } from './event-bus';
import { HookBus } from './hook-bus';
import { ExtensionHost } from './extension-host';
import { OfficialApi } from './official-api';
import { ExtensionsController } from './extensions.controller';
import { PluginManagerService } from './plugin-manager.service';

@Global()
@Module({
  providers: [EventBus, HookBus, OfficialApi, ExtensionHost, PluginManagerService],
  controllers: [ExtensionsController],
  exports: [EventBus, HookBus, OfficialApi, ExtensionHost, PluginManagerService],
})
export class ExtensionsModule {}
