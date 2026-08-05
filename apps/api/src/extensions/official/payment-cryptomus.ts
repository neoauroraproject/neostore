import type { PaymentGatewayExtension } from '../types';

/** Cryptomus — reads merchantId/apiKey from workspace extension settings when present. */
export const cryptomusPayment: PaymentGatewayExtension = {
  type: 'payment_gateway',
  id: 'neostore.payment.cryptomus',
  async createIntent(ctx, input) {
    if (!ctx.hasPermission('payment')) throw new Error('Missing payment permission');
    const merchantId = String(ctx.settings.merchantId || '');
    const apiKey = String(ctx.settings.apiKey || '');
    const enabled = ctx.settings.enabled !== false;
    ctx.log('info', 'cryptomus.createIntent', { orderId: input.orderId, configured: Boolean(merchantId && apiKey) });
    if (!enabled || !merchantId || !apiKey) {
      return {
        method: 'cryptomus',
        status: 'misconfigured',
        message: 'Cryptomus merchantId/apiKey not configured — set in Extensions',
        checkoutUrl: null,
        ...input,
      };
    }
    return {
      method: 'cryptomus',
      status: 'pending',
      checkoutUrl: `https://pay.cryptomus.com/pay/${merchantId}-${input.orderId || Date.now()}`,
      merchantId,
      ...input,
    };
  },
  async verify(ctx, input) {
    if (!ctx.hasPermission('payment')) return { ok: false };
    const status = String(input.status || '');
    return { ok: status === 'paid' || status === 'paid_over', ref: String(input.uuid || input.order_id || '') };
  },
};
