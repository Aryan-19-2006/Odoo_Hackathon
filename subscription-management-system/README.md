# Subscription Management System

TypeScript API and background worker for invoice calculation and queued payment processing. The local development setup uses Node.js 24's built-in SQLite module and stores data in `data/billing.sqlite`.

## Run locally

Use Node.js 24 or newer. From this directory:

```powershell
npm install
npm run dev
```

In a second terminal, start the payment worker:

```powershell
npm run worker
```

The API listens on `http://localhost:3000` by default. Set `PORT` to change the API port, `DATABASE_PATH` to change the SQLite file, and `WORKER_POLL_INTERVAL_MS` to change the worker poll interval.

## API

- `GET /health`
- `GET /api/discounts`, `POST /api/discounts`
- `GET /api/taxes`, `POST /api/taxes`
- `GET /api/invoices`, `GET /api/invoices/:id`, `POST /api/invoices`
- `GET /api/payments`, `POST /api/invoices/:id/payments`
- `GET /api/billing/summary`

Invoice line amounts are integer minor units (for USD, cents). Discount percentages are whole-number percentages. Tax rates use basis points, where `825` means `8.25%`. Payments are queued and processed by a local simulated processor; no card data is accepted or stored.

Example invoice request:

```json
{
  "customerName": "Example Customer",
  "currency": "USD",
  "lines": [{ "description": "Monthly plan", "quantity": 1, "unitAmountMinor": 1200 }]
}
```

Add optional `discountId` and `taxId` values returned by their respective create endpoints to apply them.

## Validate

```powershell
npm run typecheck
npm test
npm run build
```

This is a local development baseline. Before production use, add authentication and authorization, a real payment-provider adapter with webhook verification, operational observability, and deployment-specific database migration and backup procedures.