export type ExtensionType =
  | 'payment_gateway'
  | 'product_type'
  | 'delivery_provider'
  | 'email_provider'
  | 'notification_provider'
  | 'auth_provider'
  | 'theme'
  | 'widget'
  | 'report'
  | 'importer'
  | 'exporter'
  | 'integration'
  | 'automation'
  | 'ai_provider'
  | 'analytics'
  | 'shipping_provider';

export type Permission =
  | 'payment'
  | 'notification'
  | 'settings'
  | 'products'
  | 'orders'
  | 'reports'
  | 'storage'
  | 'webhook'
  | 'users';

export type MenuLocation = 'admin.platform' | 'admin.seller' | 'storefront.account';

export interface ExtensionMenuContribution {
  location: MenuLocation;
  label: string;
  href: string;
  icon?: string;
  order?: number;
}

export interface ExtensionSettingField {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'secret' | 'json';
  label?: string;
  required?: boolean;
}

export interface ExtensionContributes {
  menus?: ExtensionMenuContribution[];
  settings?: ExtensionSettingField[];
  webhooks?: string[];
  theme?: {
    sections?: string[];
    tokens?: Record<string, string>;
    layouts?: string[];
  };
}

export interface ExtensionManifest {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  type: ExtensionType;
  compatibility: { minCore: string; maxCore?: string };
  permissions: Permission[];
  dependencies?: string[];
  homepage?: string;
  repository?: string;
  entry?: string;
  main?: string;
  contributes?: ExtensionContributes;
  official?: boolean;
}

export interface ExtensionContext {
  workspaceId?: string;
  api: OfficialApiSurface;
  log: (level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void;
  hasPermission: (p: Permission) => boolean;
  settings: Record<string, unknown>;
}

export interface OfficialApiSurface {
  products: { list(workspaceId: string): Promise<unknown[]> };
  orders: { get(workspaceId: string, orderId: string): Promise<unknown | null> };
  settings: {
    get(workspaceId: string, key: string): Promise<unknown>;
    set(workspaceId: string, key: string, value: unknown): Promise<void>;
  };
  notifications: {
    notify(input: {
      workspaceId: string;
      customerId?: string;
      title: string;
      message: string;
      type: string;
    }): Promise<void>;
  };
  storage: { put(path: string, data: Buffer | string): Promise<string> };
  logger: { info(msg: string, meta?: Record<string, unknown>): void };
}

export interface PaymentGatewayExtension {
  type: 'payment_gateway';
  id: string;
  createIntent?(ctx: ExtensionContext, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  verify?(ctx: ExtensionContext, input: Record<string, unknown>): Promise<{ ok: boolean; ref?: string }>;
}

export interface DeliveryProviderExtension {
  type: 'delivery_provider';
  id: string;
  fulfillNew(ctx: ExtensionContext, input: FulfillInput): Promise<{ entitlementId: string; access?: AccessInfo }>;
  fulfillRenewal?(ctx: ExtensionContext, input: RenewInput): Promise<{ entitlementId: string }>;
  reverseNew?(ctx: ExtensionContext, input: { entitlementId: string }): Promise<void>;
  resolveAccessLink?(ctx: ExtensionContext, link: string): Promise<{ entitlementId: string } | null>;
}

export interface ProductTypeExtension {
  type: 'product_type';
  id: string;
  productType: string;
  validateFields?(fields: Record<string, unknown>): { ok: boolean; errors?: string[] };
}

export interface ThemeExtension {
  type: 'theme';
  id: string;
  defaultSections?: Record<string, unknown>;
}

export interface AccessInfo {
  accessKey?: string;
  accessUrl?: string;
  payload?: Record<string, unknown>;
}

export interface FulfillInput {
  workspaceId: string;
  orderId: string;
  productId: string;
  customerId: string;
  label: string;
  quotaUnits: bigint | number;
  durationDays: number;
  providerConfig: Record<string, unknown>;
}

export interface RenewInput extends FulfillInput {
  entitlementId: string;
}

export type AnyExtension =
  | PaymentGatewayExtension
  | DeliveryProviderExtension
  | ProductTypeExtension
  | ThemeExtension
  | { type: ExtensionType; id: string; [k: string]: unknown };

export type CoreEventName =
  | 'UserCreated'
  | 'CustomerRegistered'
  | 'OrderCreated'
  | 'PaymentCompleted'
  | 'ProductPurchased'
  | 'ProductUpdated'
  | 'WalletDeposited'
  | 'WalletRefunded'
  | 'ExtensionInstalled'
  | 'ExtensionEnabled'
  | 'ExtensionDisabled'
  | 'ExtensionUninstalled';

export type CoreHookName =
  | 'beforeLogin'
  | 'afterLogin'
  | 'beforeOrderCreate'
  | 'afterOrderCreate'
  | 'beforePayment'
  | 'afterPayment'
  | 'beforeFulfillment'
  | 'afterFulfillment'
  | 'beforeWalletDeposit'
  | 'afterWalletDeposit';

/** Backwards-compatible name used by the hook dispatcher. */
export type HookName = CoreHookName;
