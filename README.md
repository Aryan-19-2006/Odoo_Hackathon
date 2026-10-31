# Brightloop Subscription Management System

This repository currently contains backend modules for product and variant management, subscription plans, quotations, and subscription lifecycle/billing-schedule management. Authentication, customer/user management, invoices, payments, and analytics remain owned by the other team members.

## Backend setup

Requirements: Node.js 18+ and a MongoDB Atlas URI (or another MongoDB replica set; multi-document transactions are used for coordinated catalog and subscription writes).

```powershell
cd server
npm install
```

Configure these environment variables before starting the API:

```text
MONGODB_URI=<MongoDB connection string>
MEMBER1_AUTH_MODULE=<absolute path to Member 1's CommonJS module>
PORT=3000
```

The root `.env.example` lists the same variable names; the process manager or shell must supply them to Node.

The Member 1 module must export an Express `authenticate` middleware. It must attach `req.user` with a stable `id` (or `_id`/`uid`), `role`, a `permissions` array, and `customerId` for customer accounts. This implementation intentionally does not create or verify Firebase credentials itself. Permission names and request/response contracts are listed in [docs/api-contracts.md](./docs/api-contracts.md).

Start and test:

```powershell
npm start
npm test
```

Mongoose creates indexes from the model definitions on connection. Product and plan deletion endpoints archive records to preserve references and billing snapshots. Subscription line items preserve the purchased names, quantities, historical unit prices, and tax information.

## Backend module layout

- `server/src/modules/products/` — Product/variant models, routes, validation, and catalog operations.
- `server/src/modules/plans/` — Plan models, routes, and availability rules.
- `server/src/modules/quotations/` — Quotation/template models and workflow routes.
- `server/src/modules/subscriptions/` — Subscription models, lifecycle, history, and billing schedule.
- `server/src/routes/index.js` — domain router composition.
- `docs/api-contracts.md` — route permissions and billing integration contract.
