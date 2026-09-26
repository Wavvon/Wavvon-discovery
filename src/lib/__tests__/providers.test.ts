import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { listProviders, validateProvider } from "../providers";

/* The provider list is a hand-edited file, which is the whole point — and also
 * the risk. These guard the shape rather than the contents. */

describe("providers.json", () => {
  const raw: unknown = JSON.parse(readFileSync("src/data/providers.json", "utf8"));

  it("is a list", () => {
    expect(Array.isArray(raw)).toBe(true);
  });

  it("has no malformed entry", () => {
    const problems = (raw as unknown[])
      .map((entry, i) => validateProvider(entry, i))
      .filter((p): p is string => p !== null);
    expect(problems).toEqual([]);
  });

  it("lists each site once", () => {
    const urls = listProviders().map((p) => p.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("validateProvider", () => {
  const ok = { name: "Freehold", url: "https://free.example", description: "Hosting." };

  it("accepts a well-formed entry", () => {
    expect(validateProvider(ok, 0)).toBeNull();
  });

  it("insists on https", () => {
    // These are outbound links to businesses asking for money; http is not it.
    expect(validateProvider({ ...ok, url: "http://free.example" }, 0)).toMatch(/https/);
    expect(validateProvider({ ...ok, url: "free.example" }, 0)).toMatch(/https/);
  });

  it("insists on a name and a description", () => {
    expect(validateProvider({ ...ok, name: "  " }, 0)).toMatch(/no name/);
    expect(validateProvider({ ...ok, description: "" }, 0)).toMatch(/description/);
  });

  it("rejects a non-object row", () => {
    expect(validateProvider("https://free.example", 3)).toMatch(/entry 3/);
  });
});

describe("listProviders", () => {
  it("drops a malformed row instead of failing the page", () => {
    // The file is edited by hand; one typo should not blank the page.
    expect(() => listProviders()).not.toThrow();
  });

  it("filters to free tiers", () => {
    expect(listProviders({ freeTier: true }).every((p) => p.freeTier)).toBe(true);
  });
});
