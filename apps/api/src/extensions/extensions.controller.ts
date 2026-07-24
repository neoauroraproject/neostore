import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExtensionHost } from './extension-host';
import { PluginManagerService } from './plugin-manager.service';
import type { ExtensionType } from './types';

@Controller('admin/extensions')
@UseGuards(AuthGuard('jwt'))
export class ExtensionsController {
  constructor(
    private readonly host: ExtensionHost,
    private readonly plugins: PluginManagerService,
  ) {}

  @Get()
  list(@Query('type') type?: ExtensionType) {
    return {
      installed: this.host.list(type),
      available: this.plugins.listAvailable(),
    };
  }

  @Post(':id/enable')
  enable(@Param('id') id: string) {
    this.host.enable(id);
    return { ok: true };
  }

  @Post(':id/disable')
  disable(@Param('id') id: string) {
    this.host.disable(id);
    return { ok: true };
  }

  @Post('install/git')
  installGit(@Body() body: { repository: string }) {
    return this.plugins.installFromGit(body.repository);
  }
}
