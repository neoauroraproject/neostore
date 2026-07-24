/** Shared NeoStore types & constants */

export const PLATFORM_ORDER_STATUSES = [
  "PendingPayment",
  "Paid",
  "Processing",
  "Completed",
  "Delivered",
  "Cancelled",
  "Refunded",
  "Disputed",
] as const;

export type PlatformOrderStatus = (typeof PLATFORM_ORDER_STATUSES)[number];

export const PRODUCT_TYPES = [
  "Digital",
  "Voucher",
  "GiftCard",
  "VPN",
  "VPS",
  "Software",
  "License",
  "Subscription",
  "Physical",
  "Service",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const DELIVERY_MODES = ["instant", "manual"] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

export const ROLES = [
  "super_admin",
  "workspace_owner",
  "workspace_admin",
  "operator",
  "customer",
] as const;

export type Role = (typeof ROLES)[number];

export const LEDGER_ENTRY_TYPES = [
  "Deposit",
  "Purchase",
  "Refund",
  "Commission",
  "Adjustment",
  "Settlement",
  "Withdrawal",
] as const;

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const CUSTOMER_SEGMENTS = [
  "all",
  "new",
  "with_service",
  "without_service",
  "telegram_only",
] as const;

export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];

export const PAYMENT_METHODS_V1 = [
  "cryptomus",
  "manual_bank",
  "manual_crypto",
] as const;

export type PaymentMethodV1 = (typeof PAYMENT_METHODS_V1)[number];

export type StoreCurrency = "USD" | "IRT";

export type FulfillmentProviderType =
  | "manual"
  | "entitlement_code"
  | "file_download"
  | "custom_http";
