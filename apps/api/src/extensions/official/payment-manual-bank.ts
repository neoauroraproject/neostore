import type { PaymentGatewayExtension } from '../types';

export const manualBankPayment: PaymentGatewayExtension = {
  type: 'payment_gateway',
  id: 'neostore.payment.manual_bank',
  async createIntent(_ctx, input) {
    return { method: 'manual_bank', status: 'awaiting_receipt', ...input };
  },
  async verify(_ctx, input) {
    return { ok: Boolean(input.receiptText || input.receiptImage), ref: 'manual_bank' };
  },
};
