import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus } from './event-bus';
import { HookBus } from './hook-bus';
import { OfficialApi } from './official-api';
import type {
  AnyExtension,
  DeliveryProviderExtension,
  ExtensionManifest,
  ExtensionType,
  PaymentGatewayExtension,
  ProductTypeExtension,
} from './types';
import { registerOfficialExtensions } from './official/register';

interface Registered {
  manifest: ExtensionManifest;
  extension: AnyExtension;
  enabled: boolean;
}

@Injectable()
export class ExtensionHost implements OnModuleInit {
  private registry = new Map<string, Registered>();

  constructor(
    private readonly events: EventBus,
    private readonly hooks: HookBus,
    private readonly api: OfficialApi,
  ) {}

  onModuleInit() {
    registerOfficialExtensions(this);
  }

  register(manifest: ExtensionManifest, extension: AnyExtension, enabled = true) {
    if (!manifest?.id || !manifest?.type || !manifest?.version) {
      throw new Error('Invalid extension manifest');
    }
    if (extension.id !== manifest.id) {
      throw new Error(`Extension id mismatch: ${extension.id} vs ${manifest.id}`);
    }
    this.registry.set(manifest.id, { manifest, extension, enabled });
  }

  list(type?: ExtensionType) {
    return [...this.registry.values()]
      .filter((r) => (type ? r.manifest.type === type : true))
      .map((r) => ({
        ...r.manifest,
        enabled: r.enabled,
        status: r.enabled ? 'enabled' : 'disabled',
      }));
  }

  enable(id: string) {
    const r = this.registry.get(id);
    if (!r) throw new Error(`Extension not found: ${id}`);
    r.enabled = true;
  }

  disable(id: string) {
    const r = this.registry.get(id);
    if (!r) throw new Error(`Extension not found: ${id}`);
    r.enabled = false;
  }

  getPayment(id: string): PaymentGatewayExtension | null {
    const r = this.registry.get(id);
    if (!r?.enabled || r.manifest.type !== 'payment_gateway') return null;
    return r.extension as PaymentGatewayExtension;
  }

  getDelivery(id: string): DeliveryProviderExtension | null {
    const r = this.registry.get(id);
    if (!r?.enabled || r.manifest.type !== 'delivery_provider') return null;
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

  context(workspaceId?: string) {
    const api = this.api;
    return {
      workspaceId,
      api,
      log: (level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => {
        api.logger[level === 'error' ? 'info' : 'info'](msg, meta);
      },
      hasPermission: () => true,
    };
  }

  get eventsBus() {
    return this.events;
  }

  get hooksBus() {
    return this.hooks;
  }
}
