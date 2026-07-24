import type { ExtensionHost } from '../extension-host';
import type { ExtensionManifest } from '../types';
import { manualBankPayment } from './payment-manual-bank';
import { manualCryptoPayment } from './payment-manual-crypto';
import { cryptomusPayment } from './payment-cryptomus';
import { manualDelivery } from './delivery-manual';
import { entitlementCodeDelivery } from './delivery-entitlement-code';
import {
  digitalProductType,
  voucherProductType,
  licenseProductType,
  subscriptionProductType,
  serviceProductType,
} from './product-types';

function m(
  partial: Omit<ExtensionManifest, 'compatibility' | 'author' | 'homepage' | 'repository' | 'dependencies'> &
    Partial<Pick<ExtensionManifest, 'compatibility' | 'dependencies'>>,
): ExtensionManifest {
  return {
    author: 'NeoStore Official',
    homepage: 'https://neostore.local',
    repository: 'local://extensions/official',
    compatibility: { minCore: '0.1.0', maxCore: '0.x' },
    dependencies: [],
    ...partial,
  };
}

export function registerOfficialExtensions(host: ExtensionHost) {
  const pairs: Array<{ manifest: ExtensionManifest; ext: { type: string; id: string } }> = [
    {
      manifest: m({
        id: 'neostore.payment.manual_bank',
        name: 'Manual Bank Transfer',
        description: 'Card-to-card / bank receipt review',
        version: '0.1.0',
        type: 'payment_gateway',
        permissions: ['payment', 'settings'],
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
      }),
      ext: manualCryptoPayment,
    },
    {
      manifest: m({
        id: 'neostore.payment.cryptomus',
        name: 'Cryptomus',
        description: 'Cryptomus payment gateway',
        version: '0.1.0',
        type: 'payment_gateway',
        permissions: ['payment', 'settings', 'webhook'],
      }),
      ext: cryptomusPayment,
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

  for (const p of pairs) host.register(p.manifest, p.ext as never, true);
}
