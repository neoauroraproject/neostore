import type { PaymentGatewayExtension } from '../types';

export const manualCryptoPayment: PaymentGatewayExtension = {
  type: 'payment_gateway',
  id: 'neostore.payment.manual_crypto',
  async createIntent(_ctx, input) {
    return { method: 'manual_crypto', status: 'awaiting_receipt', ...input };
  },
  async verify(_ctx, input) {
    return { ok: Boolean(input.receiptText || input.receiptImage || input.txHash), ref: 'manual_crypto' };
  },
};
