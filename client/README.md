# Brightloop client

## Requirements

- Node.js 20.19+ or 22.12+
- The backend API, when using data-backed screens

## Local development

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Vite serves the frontend on its local development port and proxies `/api` requests to `http://localhost:3000` by default. Set `VITE_API_PROXY_TARGET` in `.env` if the backend listens elsewhere. Set `VITE_API_BASE_URL` when the API is hosted at a different base URL.

The starter dashboard intentionally displays no sample business metrics. API requests use the configured base URL and surface server/network errors; they do not fall back to mock data.

## Shared interface

Reusable controls live in `src/components/`: `ui/` contains buttons, fields, selectors, date ranges, cards, badges, search, breadcrumbs, menus, and summary cards; `table/` contains the data table and pagination; `dialog/` contains modal and confirmation dialogs; and `feedback/` contains loading, empty, and error states.

`AppLayout` accepts an optional `user` object (`name`, `email`, `role`, and `permissions`), `navigation` groups, notifications, profile actions, and logout callbacks. Navigation items may declare exact-match `roles` and a `permission`; restricted items are hidden unless the supplied user has the matching role and permission. The shell does not infer a role or grant authorization. Pass these values from the approved authentication context when it is available, and continue enforcing access in the backend.

## Role dashboards

The role dashboards are at `/admin/dashboard`, `/staff/dashboard`, and `/customer/dashboard`. The router expects the authenticated profile (`role`, and where applicable `permissions`) plus Member 1's Firebase `getIdToken` callback as props. Protected dashboard API requests send that ID token as a Bearer token. Customer subscription requests deliberately omit `customerId`; the backend must scope those requests to the authenticated customer.

Dashboard data currently uses the documented paginated `GET /subscriptions`, `/products`, `/plans`, and `/quotations` endpoints. Subscription status counts come from filtered subscription list responses. The repository does not yet contain customer/staff directory, analytics, invoice, or payment APIs. Corresponding metrics and charts are explicitly marked unavailable rather than filled with fixtures; collected revenue is never inferred from subscriptions or draft invoices. Modules without a confirmed API contract remain unavailable as detailed below.

## Business management modules

The Products, Product Variants, Plans, Quotation Templates, and Quotations pages use the routes, fields, pagination, filters, and permissions documented in `../docs/api-contracts.md`. Protected requests require the router's `getIdToken` callback and include the Firebase ID token as a Bearer token. Lists are paginated by the API; search and supported filters are server-side, while column sorting is limited to the currently loaded page because the API has no sorting parameter.

Product variants are edited through their parent product because there is no standalone variant resource. Product and plan deletion archive records; template deletion deactivates them. Quotations can be edited while open and unexpired and confirmed through the confirmation endpoint; no quotation delete action is exposed. Quotation prices are always server-calculated, and creating a quotation also creates its linked subscription.

User, Staff, and Customer management remain unavailable: this checkout has no corresponding backend routes or database schemas. Invoice, Payment, Discount, Tax, and Analytics modules likewise remain unconnected until their API contracts are supplied. No mock records or successful fixture responses are used.

## Production build

```powershell
npm run build
npm run preview
```
