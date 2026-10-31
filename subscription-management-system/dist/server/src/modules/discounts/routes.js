import { randomUUID } from "node:crypto";
import { database } from "../../database.js";
import { HttpError, isRecord } from "../../http.js";
export function handleDiscountRoutes(method, pathname, body) {
    if (pathname !== "/api/discounts")
        return undefined;
    if (method === "GET") {
        const discounts = database
            .prepare("SELECT id, name, type, value, created_at FROM discounts ORDER BY created_at DESC")
            .all();
        return { status: 200, body: { data: discounts } };
    }
    if (method !== "POST")
        return undefined;
    if (!isRecord(body))
        throw new HttpError(400, "Request body must be a JSON object");
    const { name, type, value } = body;
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 120) {
        throw new HttpError(400, "name must contain 2 to 120 characters");
    }
    if (type !== "percentage" && type !== "fixed") {
        throw new HttpError(400, "type must be 'percentage' or 'fixed'");
    }
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new HttpError(400, "value must be a positive integer");
    }
    if (type === "percentage" && value > 100) {
        throw new HttpError(400, "percentage discount value cannot exceed 100");
    }
    const discount = {
        id: randomUUID(),
        name: name.trim(),
        type,
        value: value,
        created_at: new Date().toISOString(),
    };
    database
        .prepare("INSERT INTO discounts (id, name, type, value, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(discount.id, discount.name, discount.type, discount.value, discount.created_at);
    return { status: 201, body: { data: discount } };
}
