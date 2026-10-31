import express from "express";
import { HttpError } from "./http.js";
import { handleBillingRoutes } from "./modules/billing/routes.js";
import { handleDiscountRoutes } from "./modules/discounts/routes.js";
import { handleInvoiceRoutes } from "./modules/invoices/routes.js";
import { handlePaymentRoutes } from "./modules/payments/routes.js";
import { handleTaxRoutes } from "./modules/taxes/routes.js";
import "./database.js";
const app = express();
const port = Number(process.env.PORT ?? 3000);
app.use(express.json({ limit: "64kb" }));
app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "subscription-management-api" });
});
app.use((request, response, next) => {
    try {
        const pathname = new URL(request.originalUrl, "http://localhost").pathname;
        const result = handleBillingRoutes(request.method, pathname) ??
            handleInvoiceRoutes(request.method, pathname, request.body) ??
            handlePaymentRoutes(request.method, pathname) ??
            handleDiscountRoutes(request.method, pathname, request.body) ??
            handleTaxRoutes(request.method, pathname, request.body);
        if (!result) {
            next();
            return;
        }
        response.status(result.status).json(result.body);
    }
    catch (error) {
        next(error);
    }
});
app.use((_request, response) => {
    response.status(404).json({ error: "Not found" });
});
app.use((error, _request, response, _next) => {
    const parserStatus = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
        ? error.status
        : undefined;
    const status = error instanceof HttpError ? error.status : parserStatus ?? 500;
    const message = error instanceof Error ? error.message : "Internal server error";
    if (status === 500)
        console.error(error);
    response.status(status).json({ error: message });
});
app.listen(port, () => {
    console.log(`Subscription management API listening on http://localhost:${port}`);
});
