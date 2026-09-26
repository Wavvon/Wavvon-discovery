import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { initDb } from "../db";
import {
  clientFacetCounts,
  clientsByAuthor,
  countClients,
  getClient,
  listClients,
  registerClient,
} from "../clients-db";
import type { ClientDoc } from "../types";

function doc(overrides: Partial<ClientDoc> = {}): ClientDoc {
  return {
    format: "wavvon.client",
    version: 1,
    name: "Ripple",
    tagline: "Keyboard-first",
    description: "Body text.",
    author_pubkey: "ed25519:aaaa",
    maintainer: "@ripple-dev",
    platforms: ["windows", "linux"],
    languages: ["en", "fr"],
    features: {
      voice: { support: "full" },
      apps: { support: "partial", note: "commands only" },
      games: { support: "none" },
    },
    ...overrides,
  };
}

function register(overrides: Partial<ClientDoc> = {}, id = overrides.name ?? "id-ripple") {
  const d = doc(overrides);
  registerClient({ id, doc: d, payload: JSON.stringify(d) });
  return id;
}

beforeEach(() => {
  initDb(new Database(":memory:"));
});

describe("client listings", () => {
  it("round-trips a listing through the payload column", () => {
    register();
    const stored = getClient("id-ripple");
    expect(stored?.name).toBe("Ripple");
    expect(stored?.doc.features.apps.note).toBe("commands only");
    expect(stored?.platforms).toEqual(["windows", "linux"]);
  });

  it("indexes only the features a client actually implements", () => {
    register();
    // `games` is declared as "none" — information for the detail page, but it
    // must never make the client match a "supports games" filter.
    expect(listClients({ feature: "voice" })).toHaveLength(1);
    expect(listClients({ feature: "apps" })).toHaveLength(1);
    expect(listClients({ feature: "games" })).toHaveLength(0);
  });

  it("treats several selected values as AND, not OR", () => {
    register({ name: "Ripple", platforms: ["windows", "linux"] }, "a");
    register({ name: "Quarry", platforms: ["ios"], languages: ["en"] }, "b");

    expect(listClients({ platform: ["windows", "linux"] })).toHaveLength(1);
    // Nothing runs on both Windows and iOS, so the answer is none — not both.
    expect(listClients({ platform: ["windows", "ios"] })).toHaveLength(0);
  });

  it("filters by author-declared language", () => {
    register({ name: "Ripple", languages: ["en", "fr"] }, "a");
    register({ name: "Quarry", languages: ["en"] }, "b");

    expect(listClients({ language: "fr" }).map((c) => c.name)).toEqual(["Ripple"]);
    expect(listClients({ language: "en" })).toHaveLength(2);
  });

  it("counts open facets from the data rather than a fixed list", () => {
    register({ name: "Ripple", languages: ["en", "fr"] }, "a");
    register({ name: "Quarry", languages: ["en", "ja"] }, "b");

    expect(clientFacetCounts("languages")).toEqual([
      { value: "en", count: 2 },
      { value: "fr", count: 1 },
      { value: "ja", count: 1 },
    ]);
  });

  it("refuses to let a publisher award itself the official badge", () => {
    // The route strips it, but the column must not carry it through either.
    const d = doc({ official: true });
    registerClient({ id: "x", doc: { ...d, official: false }, payload: JSON.stringify(d) });
    expect(getClient("x")?.official).toBe(false);
  });

  it("re-publishing the same id updates rather than duplicates", () => {
    register({ name: "Ripple" }, "same");
    register({ name: "Ripple 2" }, "same");
    expect(countClients()).toBe(1);
    expect(getClient("same")?.name).toBe("Ripple 2");
  });

  it("groups a key's other clients and leaves the current one out", () => {
    register({ name: "Ripple" }, "a");
    register({ name: "Ripple CLI" }, "b");
    register({ name: "Other", author_pubkey: "ed25519:bbbb" }, "c");

    expect(clientsByAuthor("ed25519:aaaa", "a").map((c) => c.name)).toEqual(["Ripple CLI"]);
  });

  it("survives a payload that is not valid JSON", () => {
    const d = doc();
    registerClient({ id: "broken", doc: d, payload: "{not json" });
    expect(getClient("broken")).toBeNull();
  });
});
