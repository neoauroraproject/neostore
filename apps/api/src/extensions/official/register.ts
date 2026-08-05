import type { ExtensionHost } from '../extension-host';
import type { ExtensionManifest, AnyExtension } from '../types';
import { manualBankPayment } from './payment-manual-bank';
import { manualCryptoPayment } from './payment-manual-crypto';
import { cryptomusPayment } from './payment-cryptomus';
import { nowpaymentsPayment } from './payment-nowpayments';
import { manualDelivery } from './delivery-manual';
import { entitlementCodeDelivery } from './delivery-entitlement-code';
import { marketplaceTheme } from './theme-marketplace';
import {
  digitalProductType,
  voucherProductType,
  licenseProductType,
  subscriptionProductType,
  serviceProductType,
} from './product-types';

function m(
  partial: Omit<ExtensionManifest, 'compatibility' | 'author' | 'homepage' | 'repository' | 'dependencies'> &
    Partial<Pick<ExtensionManifest, 'compatibility' | 'dependencies' | 'contributes'>>,
): ExtensionManifest {
  return {
    author: 'NeoStore Official',
    homepage: 'https://neostore.local',
    repository: 'local://extensions/official',
    compatibility: { minCore: '0.1.0', maxCore: '0.x' },
    dependencies: [],
    official: true,
    ...partial,
  };
}

export const OFFICIAL_EXTENSION_PAIRS: Array<{ manifest: ExtensionManifest; ext: AnyExtension }> = [
  {
    manifest: m({
      id: 'neostore.payment.manual_bank',
      name: 'Manual Bank Transfer',
      description: 'Card-to-card / bank receipt review',
      version: '0.1.0',
      type: 'payment_gateway',
      permissions: ['payment', 'settings'],
      contributes: {
        settings: [
          { key: 'instructions', type: 'string', label: 'Bank instructions' },
          { key: 'accountName', type: 'string', label: 'Account name' },
        ],
      },
    }),
    ext: manualBankPayment,
  },
  {
    manifest: m({
      id: 'neostore.payment.manual_crypto',
      name: 'Manual Crypto Transfer',
      description: 'Manual crypto payment with receipt',
      version: '0.1.0',
      type: 'payment_gateway',
      permissions: ['payment', 'settings'],
      contributes: {
        settings: [{ key: 'walletAddress', type: 'string', label: 'Wallet address' }],
      },
    }),
    ext: manualCryptoPayment,
  },
  {
    manifest: m({
      id: 'neostore.payment.cryptomus',
      name: 'Cryptomus',
      description: 'Cryptomus payment gateway plugin',
      version: '0.4.0',
      type: 'payment_gateway',
      permissions: ['payment', 'settings', 'webhook'],
      contributes: {
        menus: [
          {
            location: 'admin.seller',
            label: 'Cryptomus',
            href: '/w/:workspaceId/extensions/neostore.payment.cryptomus',
            order: 50,
          },
        ],
        settings: [
          { key: 'merchantId', type: 'string', label: 'Merchant ID', required: true },
          { key: 'apiKey', type: 'secret', label: 'API Key', required: true },
          { key: 'enabled', type: 'boolean', label: 'Enabled' },
        ],
        webhooks: ['/api/webhooks/cryptomus'],
      },
    }),
    ext: cryptomusPayment,
  },
  {
    manifest: m({
      id: 'neostore.payment.nowpayments',
      name: 'NOWPayments',
      description: 'NOWPayments crypto gateway plugin',
      version: '0.4.0',
      type: 'payment_gateway',
      permissions: ['payment', 'settings', 'webhook'],
      contributes: {
        menus: [
          {
            location: 'admin.seller',
            label: 'NOWPayments',
            href: '/w/:workspaceId/extensions/neostore.payment.nowpayments',
            order: 51,
          },
        ],
        settings: [
          { key: 'apiKey', type: 'secret', label: 'API Key', required: true },
          { key: 'ipnSecret', type: 'secret', label: 'IPN Secret' },
          { key: 'enabled', type: 'boolean', label: 'Enabled' },
        ],
        webhooks: ['/api/webhooks/nowpayments'],
      },
    }),
    ext: nowpaymentsPayment,
  },
  {
    manifest: m({
      id: 'neostore.delivery.manual',
      name: 'Manual Delivery',
      description: 'Queue for operator fulfillment',
      version: '0.1.0',
      type: 'delivery_provider',
      permissions: ['orders', 'products'],
    }),
    ext: manualDelivery,
  },
  {
    manifest: m({
      id: 'neostore.delivery.entitlement_code',
      name: 'Entitlement Code Pool',
      description: 'Pop codes from inventory pool',
      version: '0.1.0',
      type: 'delivery_provider',
      permissions: ['orders', 'products'],
    }),
    ext: entitlementCodeDelivery,
  },
  {
    manifest: m({
      id: 'neostore.theme.marketplace',
      name: 'Marketplace Theme',
      description: 'BSV-inspired marketplace storefront theme v1',
      version: '0.4.0',
      type: 'theme',
      permissions: ['settings'],
      contributes: {
        theme: {
          sections: ['hero', 'slider', 'category_chips', 'promoted_grid', 'trust_strip', 'footer'],
          layouts: ['home', 'product', 'portal'],
        },
        settings: [{ key: 'variant', type: 'string', label: 'Variant (light|crypto-dark)' }],
      },
    }),
    ext: marketplaceTheme,
  },
  {
    manifest: m({
      id: 'neostore.product.digital',
      name: 'Digital',
      description: 'Digital product type',
      version: '0.1.0',
      type: 'product_type',
      permissions: ['products'],
    }),
    ext: digitalProductType,
  },
  {
    manifest: m({
      id: 'neostore.product.voucher',
      name: 'Voucher',
      description: 'Voucher / gift card type',
      version: '0.1.0',
      type: 'product_type',
      permissions: ['products'],
    }),
    ext: voucherProductType,
  },
  {
    manifest: m({
      id: 'neostore.product.license',
      name: 'License',
      description: 'License product type',
      version: '0.1.0',
      type: 'product_type',
      permissions: ['products'],
    }),
    ext: licenseProductType,
  },
  {
    manifest: m({
      id: 'neostore.product.subscription',
      name: 'Subscription',
      description: 'Subscription product type',
      version: '0.1.0',
      type: 'product_type',
      permissions: ['products'],
    }),
    ext: subscriptionProductType,
  },
  {
    manifest: m({
      id: 'neostore.product.service',
      name: 'Service',
      description: 'Service product type',
      version: '0.1.0',
      type: 'product_type',
      permissions: ['products'],
    }),
    ext: serviceProductType,
  },
];

export function registerOfficialExtensions(host: ExtensionHost) {
  for (const p of OFFICIAL_EXTENSION_PAIRS) host.register(p.manifest, p.ext, true, 'official');
}
