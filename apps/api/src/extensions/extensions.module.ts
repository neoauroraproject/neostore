import { Global, Module } from '@nestjs/common';
import { EventBus } from './event-bus';
import { HookBus } from './hook-bus';
import { ExtensionHost } from './extension-host';
import { OfficialApi } from './official-api';
import { ExtensionsController, WorkspaceExtensionsController } from './extensions.controller';
import { PluginManagerService } from './plugin-manager.service';
import { CatalogModule } from '../catalog/catalog.module';

@Global()
@Module({
  imports: [CatalogModule],
  providers: [EventBus, HookBus, OfficialApi, ExtensionHost, PluginManagerService],
  controllers: [ExtensionsController, WorkspaceExtensionsController],
  exports: [EventBus, HookBus, OfficialApi, ExtensionHost, PluginManagerService],
})
export class ExtensionsModule {}
