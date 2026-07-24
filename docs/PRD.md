# Marketplace Platform — PRD v1.0 (source intake)

This file archives the original Marketplace Platform PRD.
The **binding** engineering document is [`../SPEC.md`](../SPEC.md), which merges this PRD with **Store Core P0 priority**.

---

## Project Vision

هدف، ساخت یک Marketplace Platform مدرن، ماژولار و Self-Hosted است که روی Ubuntu نصب شود و مانند یک پنل تولیدی تنها با چند دستور اجرا گردد.

این سیستم نباید صرفاً یک فروشگاه اینترنتی باشد، بلکه باید هسته‌ای باشد که بتوان با آن انواع کسب‌وکارهای دیجیتال و فیزیکی را راه‌اندازی کرد.

نمونه کاربردها: Gift Card · VPN · VPS · Software · Digital Products · License · Service · Physical Products

---

## Installation

Self Hosted · Ubuntu 22.04+ / 24.04+  
`bash install.sh` یا `docker compose up -d`  
Auto: Database · Redis · Backend · Frontend · Reverse Proxy · Queue Worker

---

## Architecture

NestJS · Next.js App Router · PostgreSQL · Redis · S3/Local · WebSocket · BullMQ  
Auth: JWT · Telegram Login · Telegram Mini App · Email Login

---

## Core Philosophy

Multi-Tenant · هر فروشنده = Workspace  
Workspace: محصولات · سفارش‌ها · اعضا · کیف پول · تنظیمات · ربات تلگرام · گزارش‌ها

---

## Roles

Super Admin · Workspace Owner · Workspace Admin · Operator · Customer

---

## Product Types

Digital · Voucher · Gift Card · VPN · VPS · Software · License · Subscription · Physical · Service  
هر Type فیلدهای اختصاصی دارد.

## Delivery

Instant Delivery · Manual Delivery

---

## Wallet & Ledger

Ledger-first · Deposit · Purchase · Refund · Commission · Adjustment · Settlement · Withdrawal  
موجودی فقط از Ledger محاسبه می‌شود.

---

## Payments

v1: Cryptomus · Manual Transfer · Manual Crypto  
Later: Stripe · PayPal · Thawani · NOWPayments · CoinPayments · BTCPay · Custom

## Settlement

v1: وجوه به Super Admin / پلتفرم؛ درآمد/کمیسیون/قابل‌تسویه per workspace؛ تسویه دستی

---

## Telegram

Mini App native-feel · per-workspace bots · notifications matrix

## Email · Notifications · Coupons · Reviews · Tickets · Reports · Settings · Security · APIs · UI/UX · Roadmap

(See full SPEC.md sections 7–10.)

---

## Development Principles

Production Ready · Modular · Plugin Based · Scalable · Secure by Default · Docker Native · Self Hosted · API First · High Performance · Extensible · Clean Code · Docs · Automated Testing · Zero Mock Data in Production
