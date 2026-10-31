# Odoo_Hackathon — Brightloop Subscription Management System

This repository contains backend modules for product and variant management, subscription plans, quotations, and subscription lifecycle/billing-schedule management. Authentication, customer/user management, invoices, payments, and analytics remain owned by their respective modules.

## Backend setup

Requirements: Node.js 20+ and a MongoDB Atlas URI (or another MongoDB replica set; multi-document transactions are used for coordinated catalog and subscription writes).

```powershell
cd server
npm install
Copy-Item ..\.env.example ..\.env
```

Fill in the values in the root `.env` file. The server loads it at startup; environment variables supplied by the shell or process manager take precedence.

By default, the server uses the repository's Firebase Authentication middleware, which requires `FIREBASE_PROJECT_ID` and Google Application Default Credentials (for example, `GOOGLE_APPLICATION_CREDENTIALS`). To integrate Member 1's middleware instead, set `MEMBER1_AUTH_MODULE` to the absolute path of a CommonJS module exporting an Express `authenticate` middleware. It must attach `req.user` with a stable `id` (or `_id`/`uid`), `role`, a `permissions` array, and `customerId` for customer accounts.

Start and test:

```powershell
npm start
npm test
```

Mongoose creates indexes from the model definitions on connection. Product and plan deletion endpoints archive records to preserve references and billing snapshots. Subscription line items preserve purchased names, quantities, historical unit prices, and tax information.

Permission names and request/response contracts are listed in [docs/api-contracts.md](./docs/api-contracts.md).

## Backend module layout

- `server/src/modules/products/` — Product/variant models, routes, validation, and catalog operations.
- `server/src/modules/plans/` — Plan models, routes, and availability rules.
- `server/src/modules/quotations/` — Quotation/template models and workflow routes.
- `server/src/modules/subscriptions/` — Subscription models, lifecycle, history, and billing schedule.
- `server/src/routes/index.js` — Domain router composition.
