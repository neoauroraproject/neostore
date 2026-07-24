import { randomUUID } from 'crypto';
import type { DeliveryProviderExtension } from '../types';

export const manualDelivery: DeliveryProviderExtension = {
  type: 'delivery_provider',
  id: 'neostore.delivery.manual',
  async fulfillNew(ctx, input) {
    const entitlementId = randomUUID();
    await ctx.api.notifications.notify({
      workspaceId: input.workspaceId,
      customerId: input.customerId,
      type: 'fulfillment_queued',
      title: 'Order queued for delivery',
      message: `Your order is being prepared: ${input.label}`,
    });
    return {
      entitlementId,
      access: { payload: { status: 'pending_delivery', label: input.label } },
    };
  },
};
