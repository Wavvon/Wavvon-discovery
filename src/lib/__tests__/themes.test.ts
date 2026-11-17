import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { initDb } from "../db";
import { isThemePreviewUrl } from "../hub-submission";
import {
  getTheme,
  listOtherThemes,
  listThemes,
  upsertOtherTheme,
  upsertTheme,
  validateOtherThemeDoc,
  validateThemeDoc,
} from "../themes-db";

const KEY = "ed25519:" + "ab".repeat(32);

function themeDoc(over: Record<string, unknown> = {}) {
  return {
    format: "wavvon.theme",
    version: 1,
    name: "Sakura Night",
    author_pubkey: KEY,
    description: "Pink",
    colors: { dark: { "--accent": "#ff8fb1" } },
    download_url: "https://example.com/sakura.wavvontheme",
    preview_url: "https://example.com/sakura.webp",
    sha256: "a".repeat(64),
    ...over,
  };
}

beforeEach(() => {
  initDb(new Database(":memory:"));
});

describe("theme listings", () => {
  it("serves the contract the client gallery reads", () => {
    const doc = themeDoc();
    upsertTheme(doc, JSON.stringify(doc), 1000);
    const { themes, total } = listThemes();
    expect(total).toBe(1);
    expect(themes[0]).toMatchObject({
      author_pubkey: KEY,
      name: "Sakura Night",
      description: "Pink",
      metadata: { colors: { dark: { "--accent": "#ff8fb1" } } },
      preview_url: "https://example.com/sakura.webp",
      download_url: "https://example.com/sakura.wavvontheme",
      sha256: "a".repeat(64),
      listed_at: 1000,
    });
    expect(themes[0].metadata).not.toHaveProperty("download_url");
  });

  it("treats a republish under the same key and name as an update", () => {
    const first = themeDoc();
    const id = upsertTheme(first, JSON.stringify(first), 1);
    const second = themeDoc({ sha256: "b".repeat(64) });
    expect(upsertTheme(second, JSON.stringify(second), 2)).toBe(id);
    expect(listThemes().total).toBe(1);
    expect(getTheme(id)?.sha256).toBe("b".repeat(64));
    const other = themeDoc({ name: "Other" });
    upsertTheme(other, JSON.stringify(other), 3);
    expect(listThemes().total).toBe(2);
    expect(listThemes({ q: "Sakura" }).total).toBe(1);
  });

  it("rejects listings the client could not use", () => {
    const n = 100;
    expect(validateThemeDoc(themeDoc(), n)).toBeNull();
    expect(validateThemeDoc(themeDoc({ format: "wavvon.skin" }), n)).toMatch(/format/);
    expect(validateThemeDoc(themeDoc({ colors: {} }), n)).toMatch(/colors/);
    expect(validateThemeDoc(themeDoc({ download_url: "http://example.com/x" }), n)).toMatch(/download_url/);
    expect(validateThemeDoc(themeDoc({ sha256: "nothex" }), n)).toMatch(/sha256/);
    expect(validateThemeDoc(themeDoc(), 40_000)).toMatch(/32 KB/);
  });

  it("keeps themes for other clients in their own section", () => {
    const doc = { format: "wavvon.theme.other", version: 1, name: "Dark", author_pubkey: KEY, client: "Ripple", description: "d", link: "https://example.com" };
    expect(validateOtherThemeDoc(doc, 10)).toBeNull();
    expect(validateOtherThemeDoc({ ...doc, link: "javascript:alert(1)" }, 10)).toMatch(/link/);
    upsertOtherTheme(doc);
    expect(listOtherThemes().total).toBe(1);
    expect(listThemes().total).toBe(0);
  });
});

describe("hub theme preview", () => {
  it("accepts only the hub's own preview route", () => {
    const sha = "c".repeat(64);
    expect(isThemePreviewUrl(`https://hub.example/hub/theme/${sha}/preview`, "https://hub.example/")).toBe(true);
    expect(isThemePreviewUrl(`https://evil.example/hub/theme/${sha}/preview`, "https://hub.example")).toBe(false);
    expect(isThemePreviewUrl(`https://hub.example/hub/theme/${sha}/../x`, "https://hub.example")).toBe(false);
  });
});
