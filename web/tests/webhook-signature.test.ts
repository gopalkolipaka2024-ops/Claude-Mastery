import { describe, expect, it } from "vitest";
import { sign, verifySignature } from "@/lib/api";

const body = JSON.stringify({ items: [{ sku: "a", priceCents: 100 }] });
const now = Date.parse("2026-11-10T12:00:00Z");
const ts = String(now / 1000);

describe("webhook signature", () => {
  it("accepts a correct, fresh signature", () => {
    expect(verifySignature("s3cret", body, ts, sign("s3cret", body, ts), now)).toBeNull();
  });
  it("rejects a wrong secret, a changed body, a stale timestamp and missing headers", () => {
    expect(verifySignature("s3cret", body, ts, sign("other", body, ts), now)).toMatch(/does not match/);
    expect(verifySignature("s3cret", body + " ", ts, sign("s3cret", body, ts), now)).toMatch(/does not match/);
    const old = String(now / 1000 - 600);
    expect(verifySignature("s3cret", body, old, sign("s3cret", body, old), now)).toMatch(/5 minute/);
    expect(verifySignature("s3cret", body, null, null, now)).toMatch(/missing/);
  });
});
