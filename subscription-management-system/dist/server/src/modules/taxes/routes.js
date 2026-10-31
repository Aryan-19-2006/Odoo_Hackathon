import { randomUUID } from "node:crypto";
import { database } from "../../database.js";
import { HttpError, isRecord } from "../../http.js";
export function handleTaxRoutes(method, pathname, body) {
    if (pathname !== "/api/taxes")
        return undefined;
    if (method === "GET") {
        const taxes = database
            .prepare("SELECT id, name, rate_bps, created_at FROM taxes ORDER BY created_at DESC")
            .all();
        return { status: 200, body: { data: taxes } };
    }
    if (method !== "POST")
        return undefined;
    if (!isRecord(body))
        throw new HttpError(400, "Request body must be a JSON object");
    const { name, rateBps } = body;
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 120) {
        throw new HttpError(400, "name must contain 2 to 120 characters");
    }
    if (!Number.isSafeInteger(rateBps) || rateBps < 0 || rateBps > 10000) {
        throw new HttpError(400, "rateBps must be an integer between 0 and 10000");
    }
    const tax = {
        id: randomUUID(),
        name: name.trim(),
        rate_bps: rateBps,
        created_at: new Date().toISOString(),
    };
    database
        .prepare("INSERT INTO taxes (id, name, rate_bps, created_at) VALUES (?, ?, ?, ?)")
        .run(tax.id, tax.name, tax.rate_bps, tax.created_at);
    return { status: 201, body: { data: tax } };
}
