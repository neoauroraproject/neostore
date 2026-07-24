import { randomUUID } from 'crypto';
import type { DeliveryProviderExtension } from '../types';

export const entitlementCodeDelivery: DeliveryProviderExtension = {
  type: 'delivery_provider',
  id: 'neostore.delivery.entitlement_code',
  async fulfillNew(ctx, input) {
    // Core OrderService should pass pre-reserved code via providerConfig.reservedCode
    // when using inventory pools — extensions must not touch DB.
    const code =
      String(input.providerConfig.reservedCode || '') ||
      `CODE-${randomUUID().slice(0, 8).toUpperCase()}`;
    ctx.log('info', 'entitlement_code.issued', { orderId: input.orderId });
    return {
      entitlementId: randomUUID(),
      access: { accessKey: code, payload: { code } },
    };
  },
  async resolveAccessLink(_ctx, link) {
    const code = link.trim();
    if (!code) return null;
    // Resolution of access keys is done by Core via Official inventory/entitlement APIs later.
    return { entitlementId: code };
  },
};
