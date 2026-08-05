import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBus } from './event-bus';
import { HookBus } from './hook-bus';
import { OfficialApi } from './official-api';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AnyExtension,
  DeliveryProviderExtension,
  ExtensionManifest,
  ExtensionMenuContribution,
  ExtensionType,
  PaymentGatewayExtension,
  Permission,
  ProductTypeExtension,
  ThemeExtension,
} from './types';
import { registerOfficialExtensions, OFFICIAL_EXTENSION_PAIRS } from './official/register';

interface Registered {
  manifest: ExtensionManifest;
  extension: AnyExtension;
  enabled: boolean;
  source: 'official' | 'installed';
}

@Injectable()
export class ExtensionHost implements OnModuleInit {
  private readonly log = new Logger(ExtensionHost.name);
  private registry = new Map<string, Registered>();
  /** workspaceId -> extensionId -> enabled override (themes/payments) */
  private workspaceEnabled = new Map<string, Map<string, boolean>>();
  private workspaceSettings = new Map<string, Map<string, Record<string, unknown>>>();

  constructor(
    private readonly events: EventBus,
    private readonly hooks: HookBus,
    private readonly api: OfficialApi,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    registerOfficialExtensions(this);
    await this.syncOfficialToDb().catch((e) => this.log.warn(`syncOfficialToDb: ${e}`));
    await this.loadWorkspaceOverrides().catch((e) => this.log.warn(`loadWorkspaceOverrides: ${e}`));
  }

  register(manifest: ExtensionManifest, extension: AnyExtension, enabled = true, source: 'official' | 'installed' = 'official') {
    if (!manifest?.id || !manifest?.type || !manifest?.version) {
      throw new Error('Invalid extension manifest');
    }
    if (extension.id !== manifest.id) {
      throw new Error(`Extension id mismatch: ${extension.id} vs ${manifest.id}`);
    }
    this.registry.set(manifest.id, { manifest, extension, enabled, source });
  }

  list(type?: ExtensionType) {
    return [...this.registry.values()]
      .filter((r) => (type ? r.manifest.type === type : true))
      .map((r) => ({
        ...r.manifest,
        enabled: r.enabled,
        status: r.enabled ? 'enabled' : 'disabled',
        source: r.source,
        contributes: r.manifest.contributes || {},
      }));
  }

  getManifest(id: string) {
    return this.registry.get(id)?.manifest || null;
  }

  enable(id: string) {
    const r = this.registry.get(id);
    if (!r) throw new Error(`Extension not found: ${id}`);
    r.enabled = true;
  }

  disable(id: string) {
    const r = this.registry.get(id);
    if (!r) throw new Error(`Extension not found: ${id}`);
    // Official core product types / delivery stay available unless explicitly disabled in DB
    r.enabled = false;
  }

  isEnabled(id: string, workspaceId?: string) {
    const r = this.registry.get(id);
    if (!r || !r.enabled) return false;
    if (!workspaceId) return true;
    const map = this.workspaceEnabled.get(workspaceId);
    if (map?.has(id)) return map.get(id)!;
    return true;
  }

  setWorkspaceEnabled(workspaceId: string, extensionId: string, enabled: boolean) {
    if (!this.workspaceEnabled.has(workspaceId)) this.workspaceEnabled.set(workspaceId, new Map());
    this.workspaceEnabled.get(workspaceId)!.set(extensionId, enabled);
  }

  setWorkspaceSettings(workspaceId: string, extensionId: string, settings: Record<string, unknown>) {
    if (!this.workspaceSettings.has(workspaceId)) this.workspaceSettings.set(workspaceId, new Map());
    this.workspaceSettings.get(workspaceId)!.set(extensionId, settings);
  }

  getWorkspaceSettings(workspaceId: string, extensionId: string) {
    return this.workspaceSettings.get(workspaceId)?.get(extensionId) || {};
  }

  getPayment(id: string, workspaceId?: string): PaymentGatewayExtension | null {
    const r = this.registry.get(id);
    if (!r || r.manifest.type !== 'payment_gateway') return null;
    if (!this.isEnabled(id, workspaceId)) return null;
    return r.extension as PaymentGatewayExtension;
  }

  listEnabledPayments(workspaceId?: string) {
    return this.list('payment_gateway').filter((p) => this.isEnabled(p.id, workspaceId));
  }

  getDelivery(id: string, workspaceId?: string): DeliveryProviderExtension | null {
    const r = this.registry.get(id);
    if (!r || r.manifest.type !== 'delivery_provider') return null;
    if (!this.isEnabled(id, workspaceId)) return null;
    return r.extension as DeliveryProviderExtension;
  }

  getProductType(productType: string): ProductTypeExtension | null {
    for (const r of this.registry.values()) {
      if (!r.enabled || r.manifest.type !== 'product_type') continue;
      const ext = r.extension as ProductTypeExtension;
      if (ext.productType === productType) return ext;
    }
    return null;
  }

  getTheme(id: string): ThemeExtension | null {
    const r = this.registry.get(id);
    if (!r?.enabled || r.manifest.type !== 'theme') return null;
    return r.extension as ThemeExtension;
  }

  /** Collect menu contributions from globally enabled extensions (filtered by workspace if provided). */
  getMenuContributions(location: string, workspaceId?: string): ExtensionMenuContribution[] {
    const out: ExtensionMenuContribution[] = [];
    for (const r of this.registry.values()) {
      if (!this.isEnabled(r.manifest.id, workspaceId)) continue;
      const menus = r.manifest.contributes?.menus || [];
      for (const m of menus) {
        if (m.location === location) out.push(m);
      }
    }
    return out.sort((a, b) => (a.order || 100) - (b.order || 100));
  }

  context(workspaceId?: string, extensionId?: string) {
    const api = this.api;
    const manifest = extensionId ? this.registry.get(extensionId)?.manifest : undefined;
    const perms = new Set(manifest?.permissions || []);
    const settings =
      workspaceId && extensionId ? this.getWorkspaceSettings(workspaceId, extensionId) : {};
    return {
      workspaceId,
      api,
      settings,
      log: (level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => {
        this.log.log(`[${level}] ${extensionId || 'ext'}: ${msg} ${meta ? JSON.stringify(meta) : ''}`);
      },
      hasPermission: (p: Permission) => {
        if (!manifest) return false;
        return perms.has(p);
      },
    };
  }

  get eventsBus() {
    return this.events;
  }

  get hooksBus() {
    return this.hooks;
  }

  private async syncOfficialToDb() {
    for (const pair of OFFICIAL_EXTENSION_PAIRS) {
      const m = pair.manifest;
      await this.prisma.installedExtension.upsert({
        where: { extensionId: m.id },
        create: {
          extensionId: m.id,
          name: m.name,
          version: m.version,
          type: m.type,
          status: 'enabled',
          manifest: m as object,
          sourceRepo: m.repository || 'local://official',
          permissions: m.permissions,
        },
        update: {
          name: m.name,
          version: m.version,
          manifest: m as object,
          permissions: m.permissions,
          status: 'enabled',
        },
      });
    }
  }

  private async loadWorkspaceOverrides() {
    const rows = await this.prisma.workspaceExtension.findMany({
      include: { extension: true },
    });
    for (const row of rows) {
      this.setWorkspaceEnabled(row.workspaceId, row.extension.extensionId, row.enabled);
      this.setWorkspaceSettings(
        row.workspaceId,
        row.extension.extensionId,
        (row.settings || {}) as Record<string, unknown>,
      );
    }
  }
}
