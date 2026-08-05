import type { PaymentGatewayExtension } from '../types';

/** NOWPayments gateway — settings from WorkspaceExtension (apiKey, ipnSecret). */
export const nowpaymentsPayment: PaymentGatewayExtension = {
  type: 'payment_gateway',
  id: 'neostore.payment.nowpayments',
  async createIntent(ctx, input) {
    if (!ctx.hasPermission('payment')) throw new Error('Missing payment permission');
    const apiKey = String(ctx.settings.apiKey || '');
    const enabled = ctx.settings.enabled !== false;
    if (!enabled || !apiKey) {
      return {
        method: 'nowpayments',
        status: 'misconfigured',
        message: 'NOWPayments API key not configured',
        ...input,
      };
    }
    ctx.log('info', 'nowpayments.createIntent', { orderId: input.orderId });
    // Production: call NOWPayments API. Stub returns a pay URL shape.
    return {
      method: 'nowpayments',
      status: 'pending',
      checkoutUrl: `https://nowpayments.io/payment/?iid=demo-${input.orderId || Date.now()}`,
      ...input,
    };
  },
  async verify(ctx, input) {
    if (!ctx.hasPermission('payment')) return { ok: false };
    const status = String(input.payment_status || input.status || '').toLowerCase();
    return {
      ok: status === 'finished' || status === 'confirmed' || status === 'paid',
      ref: String(input.payment_id || input.order_id || ''),
    };
  },
};
