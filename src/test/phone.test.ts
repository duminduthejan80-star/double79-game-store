import { describe, expect, it } from "vitest";
import { normalizeMobilePhone } from "../lib/phone";

describe("required mobile phone format", () => {
  it("accepts a 10-digit local mobile number", () => {
    expect(normalizeMobilePhone("0704962595")).toBe("+94704962595");
  });
  it("rejects numbers shorter or longer than 10 local digits", () => {
    expect(normalizeMobilePhone("070496259")).toBeNull();
    expect(normalizeMobilePhone("07049625955")).toBeNull();
  });
  it("rejects letters rather than silently deleting them", () => {
    expect(normalizeMobilePhone("0704962595abc")).toBeNull();
  });
  it("rejects empty and non-mobile numbers", () => {
    expect(normalizeMobilePhone("")).toBeNull();
    expect(normalizeMobilePhone("0112345678")).toBeNull();
  });
  it("accepts formatted local and country-code equivalents", () => {
    expect(normalizeMobilePhone("070 496 2595")).toBe("+94704962595");
    expect(normalizeMobilePhone("+94 70 496 2595")).toBe("+94704962595");
  });
});