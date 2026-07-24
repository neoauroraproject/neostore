/** @neostore/sdk — Extension SDK surface (Phase 2 expands CLI/tests). */

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
}

export const CORE_EVENTS = [
  'UserCreated',
  'CustomerRegistered',
  'OrderCreated',
  'PaymentCompleted',
  'ProductPurchased',
  'ProductUpdated',
  'WalletDeposited',
  'TicketOpened',
  'SettlementPaid',
] as const;

export const CORE_HOOKS = [
  'beforeOrderCreate',
  'afterOrderCreate',
  'beforePayment',
  'afterPayment',
  'beforeWalletDeposit',
  'afterWalletDeposit',
  'beforeLogin',
  'afterLogin',
  'beforeFulfillment',
  'afterFulfillment',
] as const;

export function defineExtension<T extends { id: string; type: string }>(ext: T): T {
  return ext;
}
