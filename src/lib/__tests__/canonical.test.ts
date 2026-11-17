import { describe, it, expect } from "vitest";
import { buildCanonicalPayload, currentNonce } from "../canonical";

describe("buildCanonicalPayload", () => {
  it("signs the theme preview last, byte-for-byte as the hub does", () => {
    // The string the hub's own test pins (routes/directory.rs).
    expect(
      buildCanonicalPayload({ hub_url: "https://h", tags: [], language: "en", bio: "", nonce: "n", theme_preview_url: "https://h/p" }),
    ).toBe('{"bio":"","hub_url":"https://h","language":"en","nonce":"n","tags":[],"theme_preview_url":"https://h/p"}');
  });

  it("serializes fields in alphabetical key order", () => {
    const payload = buildCanonicalPayload({
      hub_url: "https://hub.example",
      tags: ["gaming"],
      language: "en",
      bio: "hello",
      nonce: "2024-01-01T00:00Z",
    });
    const keys = Object.keys(JSON.parse(payload));
    expect(keys).toEqual(["bio", "hub_url", "language", "nonce", "tags"]);
  });

  it("sorts tags for determinism", () => {
    const a = buildCanonicalPayload({
      hub_url: "https://hub.example",
      tags: ["zzz", "aaa", "mmm"],
      language: "en",
      bio: "",
      nonce: "n",
    });
    const b = buildCanonicalPayload({
      hub_url: "https://hub.example",
      tags: ["aaa", "mmm", "zzz"],
      language: "en",
      bio: "",
      nonce: "n",
    });
    expect(a).toBe(b);
  });

  it("does not mutate the input tags array", () => {
    const tags = ["zzz", "aaa"];
    buildCanonicalPayload({ hub_url: "u", tags, language: "en", bio: "", nonce: "n" });
    expect(tags).toEqual(["zzz", "aaa"]);
  });

  it("produces identical output for same inputs", () => {
    const fields = {
      hub_url: "https://hub.example",
      tags: ["alpha"],
      language: "de",
      bio: "a bio",
      nonce: "2024-06-01T12:00Z",
    };
    expect(buildCanonicalPayload(fields)).toBe(buildCanonicalPayload(fields));
  });
});

describe("currentNonce", () => {
  it("returns an ISO 8601 string ending with Z", () => {
    expect(currentNonce()).toMatch(/Z$/);
  });

  it("has seconds zeroed out", () => {
    const nonce = currentNonce();
    expect(nonce).toMatch(/T\d{2}:\d{2}:00Z$/);
  });

  it("two calls within the same minute return the same nonce", () => {
    const a = currentNonce();
    const b = currentNonce();
    expect(a).toBe(b);
  });
});
