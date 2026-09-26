import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { getHub, initDb, upsertHub } from "../db";
import { keyParam } from "../links";

/* Keys are stored as `ed25519:<hex>` but travel through URLs as bare hex,
 * because a raw colon in a path segment never reaches the page. Both spellings
 * therefore have to resolve — otherwise every detail page 404s, which is
 * exactly what happened the first time this shipped. */

const HEX = "7f3c9a1e4b82d05f";
const PREFIXED = `ed25519:${HEX}`;

beforeEach(() => {
  initDb(new Database(":memory:"));
});

describe("keyParam", () => {
  it("strips the prefix for use in a URL", () => {
    expect(keyParam(PREFIXED)).toBe(HEX);
  });

  it("leaves a bare key alone", () => {
    expect(keyParam(HEX)).toBe(HEX);
  });
});

describe("looking a listing up by either spelling", () => {
  it("finds a prefix-stored hub from the bare hex a URL carries", () => {
    upsertHub({
      hub_pubkey: PREFIXED,
      hub_url: "https://hub.example",
      name: "Pixel Foundry",
      description: null,
      icon: null,
      invite_only: false,
      min_security_level: 0,
      invite_code: null,
      bio: "",
      tags: [],
      language: "en",
    });

    expect(getHub(HEX)?.name).toBe("Pixel Foundry");
    expect(getHub(PREFIXED)?.name).toBe("Pixel Foundry");
    expect(getHub("cafe")).toBeNull();
  });
});
