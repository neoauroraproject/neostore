import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExtensionHost } from './extension-host';
import { PluginManagerService } from './plugin-manager.service';
import type { ExtensionType } from './types';
import { WorkspaceGuardService } from '../catalog/catalog.module';

@Controller('admin/extensions')
@UseGuards(AuthGuard('jwt'))
export class ExtensionsController {
  constructor(
    private readonly host: ExtensionHost,
    private readonly plugins: PluginManagerService,
  ) {}

  @Get()
  async list(@Query('type') type?: ExtensionType) {
    const installed = await this.plugins.listInstalled();
    return {
      runtime: this.host.list(type),
      installed,
      available: this.plugins.listAvailable(),
    };
  }

  @Post(':id/enable')
  enable(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.plugins.setGlobalEnabled(id, true, req.user.id);
  }

  @Post(':id/disable')
  disable(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.plugins.setGlobalEnabled(id, false, req.user.id);
  }

  @Post('install/git')
  installGit(@Req() req: { user: { id: string } }, @Body() body: { repository: string }) {
    return this.plugins.installFromGit(body.repository, req.user.id);
  }

  @Post('install/manifest')
  installManifest(
    @Req() req: { user: { id: string } },
    @Body() body: { manifest: unknown; sourceRepo?: string },
  ) {
    return this.plugins.installFromManifest(body, req.user.id);
  }

  @Delete(':id')
  uninstall(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Query('purge') purge?: string,
  ) {
    return this.plugins.uninstall(id, { purgeData: purge === '1' || purge === 'true' }, req.user.id);
  }
}

@Controller('admin/workspaces/:workspaceId/extensions')
@UseGuards(AuthGuard('jwt'))
export class WorkspaceExtensionsController {
  constructor(
    private readonly plugins: PluginManagerService,
    private readonly host: ExtensionHost,
    private readonly access: WorkspaceGuardService,
  ) {}

  @Get()
  async list(@Req() req: { user: { id: string } }, @Param('workspaceId') workspaceId: string) {
    await this.access.requireMember(req.user.id, workspaceId);
    const runtime = this.host.list();
    const withState = await Promise.all(
      runtime.map(async (e) => {
        const settings = await this.plugins.getWorkspaceSettings(workspaceId, e.id);
        return {
          ...e,
          workspaceEnabled: this.host.isEnabled(e.id, workspaceId),
          settings: settings,
          menus: (e.contributes?.menus || []).map((m) => ({
            ...m,
            href: m.href.replace(':workspaceId', workspaceId).replace(':id', workspaceId),
          })),
        };
      }),
    );
    return {
      extensions: withState,
      menus: {
        seller: await this.plugins.menusForWorkspace(workspaceId, 'admin.seller'),
      },
    };
  }

  @Post(':extensionId/enable')
  async enable(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('extensionId') extensionId: string,
  ) {
    await this.access.requireMember(req.user.id, workspaceId);
    return this.plugins.setWorkspaceEnabled(workspaceId, extensionId, true, req.user.id);
  }

  @Post(':extensionId/disable')
  async disable(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('extensionId') extensionId: string,
  ) {
    await this.access.requireMember(req.user.id, workspaceId);
    return this.plugins.setWorkspaceEnabled(workspaceId, extensionId, false, req.user.id);
  }

  @Patch(':extensionId/settings')
  async settings(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('extensionId') extensionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    await this.access.requireMember(req.user.id, workspaceId);
    return this.plugins.updateWorkspaceSettings(workspaceId, extensionId, body, req.user.id);
  }
}
