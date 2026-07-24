import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExtensionHost } from './extension-host';

/**
 * Phase 2 Plugin Manager — Git install path (validation stub that records intent).
 * Full clone/enable pipeline lands with filesystem sandbox; P0 registers DB row + validates URL.
 */
@Injectable()
export class PluginManagerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly host: ExtensionHost,
  ) {}

  listAvailable() {
    return [
      {
        id: 'community.example.theme',
        name: 'Example Theme',
        type: 'theme',
        source: 'community',
        repository: 'https://github.com/example/neostore-theme',
      },
    ];
  }

  async installFromGit(repository: string) {
    if (!repository || !/^https?:\/\//i.test(repository)) {
      throw new BadRequestException('repository must be an http(s) URL');
    }
    // Security pipeline (Phase 2): manifest → version → permissions → integrity
    const extensionId = `git.${Buffer.from(repository).toString('base64url').slice(0, 24)}`;
    const manifest = {
      id: extensionId,
      name: `Git extension`,
      description: `Installed from ${repository}`,
      author: 'unknown',
      version: '0.0.0',
      type: 'integration',
      compatibility: { minCore: '0.1.0' },
      permissions: ['settings'],
      repository,
    };
    const row = await this.prisma.installedExtension.upsert({
      where: { extensionId },
      create: {
        extensionId,
        name: manifest.name,
        version: manifest.version,
        type: manifest.type,
        status: 'installed',
        manifest,
        sourceRepo: repository,
        permissions: manifest.permissions,
      },
      update: {
        sourceRepo: repository,
        manifest,
      },
    });
    return {
      ok: true,
      extension: row,
      next: [
        'Clone repository into isolated extensions directory',
        'Validate manifest + core compatibility',
        'Display permissions for admin approval',
        'Register + enable via Extension Host',
      ],
      note: 'Clone/enable filesystem steps are sandboxed in Phase 2 runtime; record created.',
    };
  }
}
