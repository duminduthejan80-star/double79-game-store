import { describe, it, expect } from "vitest";
import { calculateProStatus } from "@/lib/proStatus";

describe("Pro expiry rules", () => {
  it("keeps lifetime Pro active without a day countdown", () => {
    expect(calculateProStatus("infinity", Date.UTC(2100, 0, 1))).toEqual({ isPro: true, isLifetime: true, expiresAt: "infinity", daysLeft: 0 });
  });
  it("expires dated access at its exact deadline", () => {
    const expiry = "2026-12-01T00:00:00Z";
    expect(calculateProStatus(expiry, Date.parse(expiry)).isPro).toBe(false);
    expect(calculateProStatus(expiry, Date.parse(expiry) - 86400000).daysLeft).toBe(1);
  });
});