import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { initDb } from "../db";
import { deleteLanguage, getLanguage, listLanguages, upsertLanguage, validateLanguageDoc } from "../languages-db";

const KEY = "ed25519:" + "ab".repeat(32);

function langDoc(over: Record<string, unknown> = {}) {
  return {
    format: "wavvon.lang",
    version: 1,
    code: "sc",
    name: "Sardu",
    author_pubkey: KEY,
    description: "Sardinian",
    coverage: 0.78,
    client_version: "0.10.0",
    download_url: "https://example.com/sardu.wavvonlang",
    sha256: "a".repeat(64),
    ...over,
  };
}

const size = (d: unknown) => JSON.stringify(d).length;

beforeEach(() => {
  initDb(new Database(":memory:"));
});

describe("language listings", () => {
  it("serves code, name, description, coverage, client version, download URL and hash", () => {
    const doc = langDoc();
    const id = upsertLanguage(doc, JSON.stringify(doc), 1000);
    const { languages, total } = listLanguages();
    expect(total).toBe(1);
    expect(languages[0]).toEqual({
      id,
      author_pubkey: KEY,
      code: "sc",
      name: "Sardu",
      description: "Sardinian",
      coverage: 0.78,
      client_version: "0.10.0",
      download_url: "https://example.com/sardu.wavvonlang",
      sha256: "a".repeat(64),
      listed_at: 1000,
    });
    expect(listLanguages({ q: "sc" }).total).toBe(1);
  });

  it("treats a republish under the same key, code and name as an update", () => {
    const first = langDoc();
    const id = upsertLanguage(first, JSON.stringify(first), 1);
    const second = langDoc({ sha256: "b".repeat(64) });
    expect(upsertLanguage(second, JSON.stringify(second), 2)).toBe(id);
    expect(getLanguage(id)?.sha256).toBe("b".repeat(64));
    const other = langDoc({ code: "sc-IT" });
    expect(upsertLanguage(other, JSON.stringify(other), 3)).not.toBe(id);
    expect(listLanguages().total).toBe(2);
    expect(deleteLanguage(id)).toBe(true);
    expect(listLanguages().total).toBe(1);
  });

  it("rejects malformed listings", () => {
    expect(validateLanguageDoc(langDoc(), size(langDoc()))).toBeNull();
    const bad: Record<string, unknown>[] = [
      { format: "wavvon.theme" },
      { code: "not a tag" },
      { name: "" },
      { coverage: 1.5 },
      { author_pubkey: "nope" },
      { download_url: "http://example.com/x" },
      { sha256: "xyz" },
    ];
    for (const over of bad) expect(validateLanguageDoc(langDoc(over), size(langDoc(over)))).not.toBeNull();
    expect(validateLanguageDoc(langDoc(), 9 * 1024)).not.toBeNull();
  });
});
