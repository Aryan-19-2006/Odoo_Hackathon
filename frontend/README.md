# Brightloop frontend

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

## Production build

```powershell
npm run build
npm run preview
```
