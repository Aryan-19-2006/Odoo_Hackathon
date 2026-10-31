# API contracts: Products, Plans, Quotations, and Subscriptions

Base path: `/api`. Every endpoint is protected by Member 1's Firebase authentication middleware. That middleware must set `req.user.id` (or `_id`/`uid`), `req.user.role`, and a `req.user.permissions` array. Customer accounts also need `req.user.customerId`. Admins are granted permissions for these modules; staff must be granted the permission named below. Customers can list products/plans and read only their own quotations and subscriptions. Self-service actions require the corresponding `*:own` permission.

All list endpoints accept `page` (1-based), `limit` (1–100), and supported search/status filters. Responses have the shape `{ results, pagination: { page, limit, total, pages } }`.

## Permission names

| Capability | Permission |
|---|---|
| Product read / create/update/archive | `products:read` / `products:manage` |
| Plan read / create/update/archive | `plans:read` / `plans:manage` |
| Template read / manage | `quotations:read` / `quotations:manage` |
| Quotation read / manage / confirm | `quotations:read` / `quotations:manage` / `quotations:confirm` |
| Subscription read / create / update | `subscriptions:read` / `subscriptions:create` / `subscriptions:update` |
| Lifecycle action | `subscriptions:activate`, `subscriptions:pause`, `subscriptions:resume`, `subscriptions:renew`, `subscriptions:close` |
| Member 3 due-subscription retrieval / schedule advancement | `subscriptions:billing:read` / `subscriptions:billing:write` |

Customer self-service additionally accepts `quotations:manage:own`, `quotations:confirm:own`, `subscriptions:create:own`, `subscriptions:update:own`, and `subscriptions:<action>:own`. Ownership is still checked against the authenticated `customerId` on every request.

## Products and plans

Products support `name`, `type`, `salesPrice`, `costPrice`, `description`, `status`, and an optional `variants` array on create/patch. Variant prices are additive: `unitPrice = product.salesPrice + variant.priceDelta`. Variant `id` values in a patch must belong to that product. Variants omitted from a supplied `variants` array are deactivated; existing product/variant records are archived or deactivated rather than physically removed so historical references remain meaningful.

Plans use `frequency: daily | weekly | monthly | yearly`, `minQuantity`, `productIds`, optional availability dates, auto-close settings, early-close/pause/renewal flags, and `status`. A subscription/quotation can only use an active plan during its availability period, active products included in that plan, active variants belonging to their product, and a total quantity at least equal to `minQuantity`.

## Quotation workflow

Quotation templates have CRUD endpoints under `/api/quotation-templates`. `POST /api/quotations` accepts `customerId` plus either `templateId` or `planId` and `items`; line items accept `productId`, optional `variantId`, `quantity`, optional `taxId`, and `taxRate`. Submitted prices are not trusted: the server snapshots current product and variant prices and calculates line totals.

Creating a quotation also creates a linked subscription in `quotation` status. `POST /api/quotations/:id/confirm` confirms both records, provided the quotation has not expired. A direct draft subscription can enter the same lifecycle with `POST /api/subscriptions/:id/quotation`, then quotation confirmation. `PATCH /api/quotations/:id` can edit an unexpired quotation.

## Subscription lifecycle and billing boundary

`POST /api/subscriptions` creates a `draft`; `PATCH` edits only drafts. Available lifecycle actions are `quotation` (via the endpoint above), confirm quotation, activate, pause, resume, renew, and close. A pause shifts the next billing and expiry dates by the pause duration. Expired active/confirmed subscriptions are marked expired when read or included in a current due-billing/list query; expired subscriptions are not returned as billable. Plan flags gate pause, early close, renewal, and automatic close. Every transition is written to subscription history at `/api/subscriptions/:id/history`.

Subscription items are separate `SubscriptionItem` documents and retain product/variant names, quantity, unit price, tax reference/rate, and totals as historical snapshots. `DELETE` on product and plan resources archives them, preserving billing history.

### Member 3 billing interface

`GET /api/subscriptions/due-for-billing?asOf=<ISO-date>&frequency=monthly&page=1&limit=20` returns active subscriptions whose `nextBillingDate <= asOf` and which have not expired. The optional frequency filter uses the subscription's saved billing-frequency snapshot, falling back to the current plan frequency only for older subscriptions without a snapshot. Each result includes `subscriptionId`, `customerId`, `planId`, `frequency`, start/expiry dates, `nextBillingDate`, status, total, and `billableLineItems` with quantity, `historicalUnitPrice`, and tax references.

The subscriptions module owns all billing-period calculations in `billingDates.js`. Each new subscription snapshots its plan's billing frequency so later plan edits do not silently change existing billing schedules. The billing module must use the exposed due date and frequency and must not calculate a competing schedule. After successfully creating its invoice, it calls `POST /api/subscriptions/:id/record-billing` with a stable `idempotencyKey` and optional `externalInvoiceId`/`billedAt`. The endpoint records the billed period, advances `nextBillingDate` by the subscription's saved frequency, and is idempotent for a repeated key. This endpoint advances schedule state only; it does not create invoices or process payments.

Monthly and yearly increments clamp to the last valid day of the destination month while preserving the original billing anchor (for example, Jan 31 → Feb 28/29 → Mar 31). Dates are handled in UTC.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/products` | List / create products |
| GET/PATCH/DELETE | `/api/products/:id` | Read / update / archive a product |
| GET/POST | `/api/plans` | List / create plans |
| GET/PATCH/DELETE | `/api/plans/:id` | Read / update / archive a plan |
| GET/POST | `/api/quotation-templates` | List / create templates |
| GET/PATCH/DELETE | `/api/quotation-templates/:id` | Read / update / deactivate a template |
| GET/POST | `/api/quotations` | List / create quotations |
| GET/PATCH | `/api/quotations/:id` | Read / update a quotation |
| POST | `/api/quotations/:id/confirm` | Confirm a quotation |
| GET/POST | `/api/subscriptions` | List / create subscriptions |
| GET/PATCH | `/api/subscriptions/:id` | Read / update a draft |
| POST | `/api/subscriptions/:id/quotation` | Convert a draft to a quotation |
| POST | `/api/subscriptions/:id/{activate,pause,resume,renew,close}` | Lifecycle actions |
| GET | `/api/subscriptions/:id/history` | Read lifecycle history |
| GET | `/api/subscriptions/due-for-billing` | Member 3 due-subscription feed |
| POST | `/api/subscriptions/:id/record-billing` | Idempotently advance the billing schedule |
