import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { initDb, listHubs, upsertHub } from "../db";

function makeDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  return db;
}

function seedHub(
  db: Database.Database,
  overrides: {
    hub_pubkey?: string;
    hub_url?: string;
    name?: string;
    tags?: string[];
    language?: string;
    bio?: string;
    listed_at?: string;
  } = {},
) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO hubs (hub_pubkey, hub_url, name, description, icon, invite_only,
      min_security_level, invite_code, bio, tags, language, listed_at, last_verified_at)
    VALUES (?, ?, ?, NULL, NULL, 0, 0, NULL, ?, ?, ?, ?, ?)
  `).run(
    overrides.hub_pubkey ?? "pk_" + Math.random().toString(36).slice(2),
    overrides.hub_url ?? "https://hub.example",
    overrides.name ?? "Test Hub",
    overrides.bio ?? "",
    JSON.stringify(overrides.tags ?? []),
    overrides.language ?? "en",
    overrides.listed_at ?? now,
    now,
  );
}

let db: Database.Database;

beforeEach(() => {
  db = makeDb();
  initDb(db);
});

afterEach(() => {
  db.close();
});

describe("listHubs — no filter", () => {
  it("returns empty result when there are no hubs", () => {
    const result = listHubs();
    expect(result.hubs).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("returns all hubs with correct shape", () => {
    seedHub(db, { hub_pubkey: "pk1", name: "Hub A", tags: ["gaming"] });
    seedHub(db, { hub_pubkey: "pk2", name: "Hub B", tags: [] });

    const result = listHubs();
    expect(result.total).toBe(2);
    expect(result.hubs).toHaveLength(2);

    const hub = result.hubs.find((h) => h.hub_pubkey === "pk1")!;
    expect(hub.name).toBe("Hub A");
    expect(hub.tags).toEqual(["gaming"]);
    expect(hub.invite_only).toBe(false);
  });
});

describe("listHubs — tag filter", () => {
  beforeEach(() => {
    seedHub(db, { hub_pubkey: "pk_gaming1", tags: ["gaming", "pvp"] });
    seedHub(db, { hub_pubkey: "pk_gaming2", tags: ["gaming"] });
    seedHub(db, { hub_pubkey: "pk_social", tags: ["social"] });
    seedHub(db, { hub_pubkey: "pk_notag", tags: [] });
  });

  it("returns only hubs that have the requested tag", () => {
    const result = listHubs({ tag: "gaming" });
    expect(result.total).toBe(2);
    expect(result.hubs.map((h) => h.hub_pubkey).sort()).toEqual(["pk_gaming1", "pk_gaming2"]);
  });

  it("total matches filtered count, not overall count", () => {
    const result = listHubs({ tag: "social" });
    expect(result.total).toBe(1);
    expect(result.hubs[0].hub_pubkey).toBe("pk_social");
  });

  it("returns empty when no hubs match the tag", () => {
    const result = listHubs({ tag: "nonexistent" });
    expect(result.total).toBe(0);
    expect(result.hubs).toHaveLength(0);
  });

  it("multiple tags — AND semantics: only hubs with all tags match", () => {
    const result = listHubs({ tag: ["gaming", "pvp"] });
    expect(result.total).toBe(1);
    expect(result.hubs[0].hub_pubkey).toBe("pk_gaming1");
  });

  it("multiple tags — no result when no hub has all of them", () => {
    const result = listHubs({ tag: ["gaming", "social"] });
    expect(result.total).toBe(0);
  });
});

describe("listHubs — pagination with tag filter", () => {
  beforeEach(() => {
    const now = new Date();
    for (let i = 0; i < 25; i++) {
      const ts = new Date(now.getTime() - i * 1000).toISOString();
      seedHub(db, {
        hub_pubkey: `pk_pag_${i}`,
        tags: ["paginationtag"],
        listed_at: ts,
      });
    }
    seedHub(db, { hub_pubkey: "pk_other", tags: ["other"] });
  });

  it("page 1 returns 20 items out of 25 total", () => {
    const result = listHubs({ tag: "paginationtag", page: 1 });
    expect(result.total).toBe(25);
    expect(result.hubs).toHaveLength(20);
  });

  it("page 2 returns the remaining 5", () => {
    const result = listHubs({ tag: "paginationtag", page: 2 });
    expect(result.total).toBe(25);
    expect(result.hubs).toHaveLength(5);
  });

  it("pages are dense — no gaps between page 1 and page 2", () => {
    const page1 = listHubs({ tag: "paginationtag", page: 1 });
    const page2 = listHubs({ tag: "paginationtag", page: 2 });
    const allKeys = new Set([
      ...page1.hubs.map((h) => h.hub_pubkey),
      ...page2.hubs.map((h) => h.hub_pubkey),
    ]);
    expect(allKeys.size).toBe(25);
    expect(page1.hubs.length + page2.hubs.length).toBe(25);
  });

  it("the non-matching hub does not appear in any page", () => {
    const page1 = listHubs({ tag: "paginationtag", page: 1 });
    const page2 = listHubs({ tag: "paginationtag", page: 2 });
    const allKeys = [
      ...page1.hubs.map((h) => h.hub_pubkey),
      ...page2.hubs.map((h) => h.hub_pubkey),
    ];
    expect(allKeys).not.toContain("pk_other");
  });

  it("total is consistent across pages", () => {
    const page1 = listHubs({ tag: "paginationtag", page: 1 });
    const page2 = listHubs({ tag: "paginationtag", page: 2 });
    expect(page1.total).toBe(page2.total);
  });
});

describe("listHubs — combined filters", () => {
  beforeEach(() => {
    seedHub(db, { hub_pubkey: "pk_en_gaming", language: "en", tags: ["gaming"] });
    seedHub(db, { hub_pubkey: "pk_de_gaming", language: "de", tags: ["gaming"] });
    seedHub(db, { hub_pubkey: "pk_en_social", language: "en", tags: ["social"] });
  });

  it("language filter scopes results", () => {
    const result = listHubs({ language: "de" });
    expect(result.total).toBe(1);
    expect(result.hubs[0].hub_pubkey).toBe("pk_de_gaming");
  });

  it("language + tag filter — intersection", () => {
    const result = listHubs({ language: "en", tag: "gaming" });
    expect(result.total).toBe(1);
    expect(result.hubs[0].hub_pubkey).toBe("pk_en_gaming");
  });
});

describe("listHubs — sort by counts", () => {
  function hub(pk: string, member_count: number | null, online_count: number | null) {
    upsertHub({
      hub_pubkey: pk, hub_url: "https://" + pk, name: pk, description: null, icon: null,
      invite_only: false, min_security_level: 0, invite_code: null, bio: "", tags: [],
      language: "en", member_count, online_count,
    });
  }

  beforeEach(() => {
    hub("pk_small", 3, 1);
    hub("pk_unknown", null, null);
    hub("pk_big", 40, 0);
  });

  it("orders by members, a missing count after every known one", () => {
    expect(listHubs({ sort: "members" }).hubs.map((h) => h.hub_pubkey)).toEqual(["pk_big", "pk_small", "pk_unknown"]);
  });

  it("orders by online, where zero is a count and missing is not", () => {
    expect(listHubs({ sort: "online" }).hubs.map((h) => h.hub_pubkey)).toEqual(["pk_small", "pk_big", "pk_unknown"]);
  });

  it("records when the counts were read, and nothing when there were none", () => {
    const hubs = listHubs().hubs;
    expect(hubs.find((h) => h.hub_pubkey === "pk_big")?.counts_at).toBeTruthy();
    expect(hubs.find((h) => h.hub_pubkey === "pk_unknown")?.counts_at).toBeNull();
  });
});
