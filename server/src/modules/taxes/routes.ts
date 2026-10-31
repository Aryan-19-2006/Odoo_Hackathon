import { randomUUID } from "node:crypto";
import { database } from "../../database.js";
import { HttpError, type HttpResult, isRecord } from "../../http.js";

interface TaxRow {
  id: string;
  name: string;
  rate_bps: number;
  created_at: string;
}

export function handleTaxRoutes(
  method: string,
  pathname: string,
  body: unknown,
): HttpResult | undefined {
  if (pathname !== "/api/taxes") return undefined;

  if (method === "GET") {
    const taxes = database
      .prepare("SELECT id, name, rate_bps, created_at FROM taxes ORDER BY created_at DESC")
      .all() as unknown as TaxRow[];
    return { status: 200, body: { data: taxes } };
  }

  if (method !== "POST") return undefined;
  if (!isRecord(body)) throw new HttpError(400, "Request body must be a JSON object");

  const { name, rateBps } = body;
  if (typeof name !== "string" || name.trim().length < 2 || name.length > 120) {
    throw new HttpError(400, "name must contain 2 to 120 characters");
  }
  if (!Number.isSafeInteger(rateBps) || (rateBps as number) < 0 || (rateBps as number) > 10000) {
    throw new HttpError(400, "rateBps must be an integer between 0 and 10000");
  }

  const tax: TaxRow = {
    id: randomUUID(),
    name: name.trim(),
    rate_bps: rateBps as number,
    created_at: new Date().toISOString(),
  };
  database
    .prepare("INSERT INTO taxes (id, name, rate_bps, created_at) VALUES (?, ?, ?, ?)")
    .run(tax.id, tax.name, tax.rate_bps, tax.created_at);

  return { status: 201, body: { data: tax } };
}