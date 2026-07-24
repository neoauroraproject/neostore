import type { PaymentGatewayExtension } from '../types';

/** Official Cryptomus extension — verify via providerRef/webhook payload in P0. */
export const cryptomusPayment: PaymentGatewayExtension = {
  type: 'payment_gateway',
  id: 'neostore.payment.cryptomus',
  async createIntent(ctx, input) {
    ctx.log('info', 'cryptomus.createIntent', input);
    return {
      method: 'cryptomus',
      status: 'pending',
      checkoutUrl: `https://pay.cryptomus.com/pay/demo-${Date.now()}`,
      ...input,
    };
  },
  async verify(_ctx, input) {
    const status = String(input.status || '');
    return { ok: status === 'paid' || status === 'paid_over', ref: String(input.uuid || input.order_id || '') };
  },
};
