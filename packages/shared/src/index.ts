/** Shared NeoStore types & constants (Phase 0 stub). */

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAYMENT_SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PROVISIONING",
  "PROVISION_FAILED",
  "ACTIVE",
  "RENEWED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CUSTOMER_SEGMENTS = [
  "all",
  "new",
  "with_service",
  "without_service",
  "telegram_only",
] as const;

export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];

export type StoreCurrency = "USD" | "IRT";

export type FulfillmentProviderType = "manual" | "entitlement_code" | "custom_http";
