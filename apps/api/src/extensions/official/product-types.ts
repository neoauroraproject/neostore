import type { ProductTypeExtension } from '../types';

function typeExt(id: string, productType: string): ProductTypeExtension {
  return {
    type: 'product_type',
    id,
    productType,
    validateFields: () => ({ ok: true }),
  };
}

export const digitalProductType = typeExt('neostore.product.digital', 'Digital');
export const voucherProductType = typeExt('neostore.product.voucher', 'Voucher');
export const licenseProductType = typeExt('neostore.product.license', 'License');
export const subscriptionProductType = typeExt('neostore.product.subscription', 'Subscription');
export const serviceProductType = typeExt('neostore.product.service', 'Service');
