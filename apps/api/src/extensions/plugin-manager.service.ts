import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, createHmac, randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { ExtensionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExtensionHost } from './extension-host';
import { EventBus } from './event-bus';
import type { ExtensionManifest, ExtensionType } from './types';

const CORE_VERSION = '0.4.0';
const ALLOWED_TYPES = new Set<string>([
  'payment_gateway',
  'product_type',
  'delivery_provider',
  'email_provider',
  'notification_provider',
  'auth_provider',
  'theme',
  'widget',
  'report',
  'importer',
  'exporter',
  'integration',
  'automation',
  'ai_provider',
  'analytics',
  'shipping_provider',
]);

function extensionsRoot() {
  const base = process.env.EXTENSIONS_PATH || join(process.env.STORAGE_LOCAL_PATH || join(process.cwd(), 'data'), 'extensions');
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return resolve(base);
}

function safeId(id: string) {
  if (!/^[a-z0-9][a-z0-9._-]{1,120}$/i.test(id)) {
    throw new BadRequestException('Invalid extension id');
  }
  return id;
}

@Injectable()
export class PluginManagerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly host: ExtensionHost,
    private readonly events: EventBus,
  ) {}

  listAvailable() {
    return this.host.list().map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      version: e.version,
      official: Boolean(e.official),
      enabled: e.enabled,
      contributes: e.contributes,
    }));
  }

  async listInstalled() {
    return this.prisma.installedExtension.findMany({ orderBy: { name: 'asc' } });
  }

  async audit(action: string, extensionId: string, actor?: string, meta?: object) {
    await this.prisma.extensionAuditLog.create({
      data: {
        action,
        extensionId,
        actor: actor || 'system',
        meta: meta || {},
      },
    });
  }

  validateManifest(raw: unknown): ExtensionManifest {
    const m = raw as ExtensionManifest;
    if (!m?.id || !m?.name || !m?.version || !m?.type) {
      throw new BadRequestException('Manifest missing id/name/version/type');
    }
    safeId(m.id);
    if (!ALLOWED_TYPES.has(m.type)) throw new BadRequestException(`Type not allowed: ${m.type}`);
    if (!Array.isArray(m.permissions)) throw new BadRequestException('permissions required');
    const min = m.compatibility?.minCore || '0.1.0';
    if (this.cmpVersion(CORE_VERSION, min) < 0) {
      throw new BadRequestException(`Requires NeoStore >= ${min}`);
    }
    return {
      author: m.author || 'unknown',
      description: m.description || '',
      homepage: m.homepage,
      repository: m.repository,
      compatibility: m.compatibility || { minCore: '0.1.0' },
      dependencies: m.dependencies || [],
      contributes: m.contributes || {},
      permissions: m.permissions,
      id: m.id,
      name: m.name,
      version: m.version,
      type: m.type as ExtensionType,
      main: m.main,
      entry: m.entry,
      official: Boolean(m.official),
    };
  }

  private cmpVersion(a: string, b: string) {
    const pa = a.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
    const pb = b.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) < (pb[i] || 0)) return -1;
      if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    }
    return 0;
  }

  /** Install from pasted manifest JSON (local/dev path). Keeps data on reinstall. */
  async installFromManifest(body: { manifest: unknown; sourceRepo?: string }, actor?: string) {
    const manifest = this.validateManifest(body.manifest);
    const dir = join(extensionsRoot(), safeId(manifest.id));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'neostore.extension.json'), JSON.stringify(manifest, null, 2), 'utf8');

    const row = await this.prisma.installedExtension.upsert({
      where: { extensionId: manifest.id },
      create: {
        extensionId: manifest.id,
        name: manifest.name,
        version: manifest.version,
        type: manifest.type,
        status: ExtensionStatus.installed,
        manifest: manifest as object,
        sourceRepo: body.sourceRepo || `local://${manifest.id}`,
        permissions: manifest.permissions,
      },
      update: {
        name: manifest.name,
        version: manifest.version,
        type: manifest.type,
        manifest: manifest as object,
        sourceRepo: body.sourceRepo || undefined,
        permissions: manifest.permissions,
      },
    });

    // Themes/payments without runtime JS stay as metadata; official ones already in Host
    if (!this.host.getManifest(manifest.id)) {
      this.host.register(manifest, { type: manifest.type, id: manifest.id }, false, 'installed');
    }

    await this.audit('install', manifest.id, actor, { version: manifest.version });
    await this.events.emit('ExtensionInstalled', { extensionId: manifest.id });
    return { ok: true, extension: row };
  }

  async installFromGit(repository: string, actor?: string) {
    if (!repository || !/^https:\/\//i.test(repository)) {
      throw new BadRequestException('repository must be an https URL');
    }
    const extensionId = `git.${createHash('sha256').update(repository).digest('hex').slice(0, 16)}`;
    const manifest = this.validateManifest({
      id: extensionId,
      name: `Git: ${repository.replace(/^https:\/\//, '').slice(0, 48)}`,
      description: `Pending clone from ${repository}`,
      version: '0.0.0-pending',
      type: 'integration',
      permissions: ['settings'],
      compatibility: { minCore: '0.1.0' },
      repository,
      contributes: {},
    });
    const row = await this.prisma.installedExtension.upsert({
      where: { extensionId },
      create: {
        extensionId,
        name: manifest.name,
        version: manifest.version,
        type: manifest.type,
        status: ExtensionStatus.installed,
        manifest: manifest as object,
        sourceRepo: repository,
        permissions: manifest.permissions,
      },
      update: { sourceRepo: repository, manifest: manifest as object },
    });
    await this.audit('install_git_pending', extensionId, actor, { repository });
    return {
      ok: true,
      extension: row,
      note: 'Recorded. Full git clone + integrity check runs in isolated worker; enable after review.',
    };
  }

  async setGlobalEnabled(extensionId: string, enabled: boolean, actor?: string) {
    const row = await this.prisma.installedExtension.findUnique({ where: { extensionId } });
    if (!row) throw new NotFoundException('Extension not installed');
    if (enabled) this.host.enable(extensionId);
    else this.host.disable(extensionId);
    await this.prisma.installedExtension.update({
      where: { extensionId },
      data: { status: enabled ? ExtensionStatus.enabled : ExtensionStatus.disabled },
    });
    await this.audit(enabled ? 'enable' : 'disable', extensionId, actor);
    await this.events.emit(enabled ? 'ExtensionEnabled' : 'ExtensionDisabled', { extensionId });
    return { ok: true, enabled };
  }

  async setWorkspaceEnabled(workspaceId: string, extensionId: string, enabled: boolean, actor?: string) {
    const installed = await this.prisma.installedExtension.findUnique({ where: { extensionId } });
    if (!installed) throw new NotFoundException('Extension not installed');

    if (installed.type === 'theme' && enabled) {
      // Only one active theme per workspace
      const themes = await this.prisma.installedExtension.findMany({ where: { type: 'theme' } });
      for (const t of themes) {
        if (t.extensionId === extensionId) continue;
        await this.prisma.workspaceExtension.upsert({
          where: {
            workspaceId_installedExtensionId: {
              workspaceId,
              installedExtensionId: t.id,
            },
          },
          create: {
            workspaceId,
            installedExtensionId: t.id,
            enabled: false,
            settings: {},
          },
          update: { enabled: false },
        });
        this.host.setWorkspaceEnabled(workspaceId, t.extensionId, false);
      }
      await this.prisma.storeProfile.updateMany({
        where: { workspaceId },
        data: { themeId: extensionId },
      });
    }

    const we = await this.prisma.workspaceExtension.upsert({
      where: {
        workspaceId_installedExtensionId: {
          workspaceId,
          installedExtensionId: installed.id,
        },
      },
      create: {
        workspaceId,
        installedExtensionId: installed.id,
        enabled,
        settings: {},
      },
      update: { enabled },
    });
    this.host.setWorkspaceEnabled(workspaceId, extensionId, enabled);
    await this.audit(enabled ? 'workspace_enable' : 'workspace_disable', extensionId, actor, {
      workspaceId,
    });
    return we;
  }

  async updateWorkspaceSettings(
    workspaceId: string,
    extensionId: string,
    settings: Record<string, unknown>,
    actor?: string,
  ) {
    const installed = await this.prisma.installedExtension.findUnique({ where: { extensionId } });
    if (!installed) throw new NotFoundException('Extension not installed');
    const manifest = (installed.manifest || {}) as unknown as ExtensionManifest;
    const fields = manifest.contributes?.settings || [];
    const next: Record<string, unknown> = { ...(await this.getWorkspaceSettings(workspaceId, extensionId)) };
    for (const f of fields) {
      if (settings[f.key] === undefined) continue;
      if (f.type === 'secret' && settings[f.key]) {
        next[f.key] = this.encryptSecret(String(settings[f.key]));
        next[`${f.key}Set`] = true;
      } else {
        next[f.key] = settings[f.key];
      }
    }
    // allow passthrough keys for flexibility
    for (const [k, v] of Object.entries(settings)) {
      if (fields.some((f) => f.key === k)) continue;
      next[k] = v;
    }
    const we = await this.prisma.workspaceExtension.upsert({
      where: {
        workspaceId_installedExtensionId: {
          workspaceId,
          installedExtensionId: installed.id,
        },
      },
      create: {
        workspaceId,
        installedExtensionId: installed.id,
        enabled: true,
        settings: next as Prisma.InputJsonValue,
      },
      update: { settings: next as Prisma.InputJsonValue },
    });
    const runtimeSettings = this.decryptSettingsForRuntime(next, fields);
    this.host.setWorkspaceSettings(workspaceId, extensionId, runtimeSettings);
    this.host.setWorkspaceEnabled(workspaceId, extensionId, we.enabled);
    await this.audit('settings_update', extensionId, actor, { workspaceId });
    return { ok: true, settings: this.redactSecrets(next, fields) };
  }

  async getWorkspaceSettings(workspaceId: string, extensionId: string) {
    const installed = await this.prisma.installedExtension.findUnique({ where: { extensionId } });
    if (!installed) return {};
    const we = await this.prisma.workspaceExtension.findUnique({
      where: {
        workspaceId_installedExtensionId: {
          workspaceId,
          installedExtensionId: installed.id,
        },
      },
    });
    return (we?.settings || {}) as Record<string, unknown>;
  }

  /** Deactivate keeps settings. Uninstall optionally purges. */
  async uninstall(extensionId: string, opts: { purgeData?: boolean }, actor?: string) {
    const installed = await this.prisma.installedExtension.findUnique({
      where: { extensionId },
      include: { workspaces: true },
    });
    if (!installed) throw new NotFoundException('Not found');
    if (installed.sourceRepo?.startsWith('local://official') || (installed.manifest as any)?.official) {
      throw new BadRequestException('Cannot uninstall official bundled extensions');
    }
    if (installed.workspaces.some((w) => w.enabled)) {
      throw new BadRequestException('Deactivate on all workspaces before uninstall');
    }
    if (opts.purgeData) {
      await this.prisma.workspaceExtension.deleteMany({ where: { installedExtensionId: installed.id } });
    }
    await this.prisma.installedExtension.delete({ where: { id: installed.id } });
    try {
      this.host.disable(extensionId);
    } catch {
      /* not in memory */
    }
    const dir = join(extensionsRoot(), extensionId);
    if (existsSync(dir) && dir.startsWith(extensionsRoot())) {
      rmSync(dir, { recursive: true, force: true });
    }
    await this.audit('uninstall', extensionId, actor, { purgeData: Boolean(opts.purgeData) });
    await this.events.emit('ExtensionUninstalled', { extensionId, purgeData: opts.purgeData });
    return { ok: true };
  }

  async menusForWorkspace(workspaceId: string, location: string) {
    return this.host.getMenuContributions(location, workspaceId);
  }

  private encryptSecret(value: string) {
    const key = process.env.JWT_SECRET || 'neostore-dev-secret';
    const iv = randomBytes(8).toString('hex');
    const mac = createHmac('sha256', key).update(iv + value).digest('hex').slice(0, 32);
    return `enc:${iv}:${mac}:${Buffer.from(value, 'utf8').toString('base64url')}`;
  }

  private tryDecryptSecret(value: string) {
    if (!value?.startsWith('enc:')) return value;
    const key = process.env.JWT_SECRET || 'neostore-dev-secret';
    const parts = value.split(':');
    if (parts.length < 4) return '';
    const iv = parts[1];
    const mac = parts[2];
    const raw = Buffer.from(parts.slice(3).join(':'), 'base64url').toString('utf8');
    const expect = createHmac('sha256', key).update(iv + raw).digest('hex').slice(0, 32);
    if (mac !== expect) return '';
    return raw;
  }

  private decryptSettingsForRuntime(
    settings: Record<string, unknown>,
    fields: { key: string; type: string }[],
  ) {
    const out = { ...settings };
    for (const f of fields) {
      if (f.type === 'secret' && typeof out[f.key] === 'string') {
        out[f.key] = this.tryDecryptSecret(String(out[f.key]));
      }
    }
    return out;
  }

  private redactSecrets(settings: Record<string, unknown>, fields: { key: string; type: string }[]) {
    const out = { ...settings };
    for (const f of fields) {
      if (f.type === 'secret' && out[f.key]) {
        out[f.key] = '••••••••';
      }
    }
    return out;
  }

  readLocalManifest(extensionId: string) {
    const p = join(extensionsRoot(), safeId(extensionId), 'neostore.extension.json');
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, 'utf8'));
  }
}
