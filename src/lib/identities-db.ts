import { getDb } from "./db";
import type { IdentityDoc, IdentityItem, IdentityKind, IdentityListItem } from "./types";

interface IdentityRow {
  pubkey: string;
  name: string;
  tagline: string;
  kind: IdentityKind;
  tags: string;
  languages: string;
  payload: string;
  listed_at: number;
  updated_at: string;
}

function rowToListItem(row: IdentityRow): IdentityListItem {
  return {
    pubkey: row.pubkey,
    name: row.name,
    tagline: row.tagline,
    kind: row.kind,
    tags: JSON.parse(row.tags) as string[],
    languages: JSON.parse(row.languages) as string[],
    listed_at: row.listed_at,
    updated_at: row.updated_at,
  };
}

/**
 * Stores the listing unless a newer one is already held. The signature covers
 * `listed_at`, so refusing older documents is what stops a replayed copy of a
 * superseded listing from rolling it back. Returns false when refused.
 */
export function registerIdentity(pubkey: string, doc: IdentityDoc, payload: string): boolean {
  const db = getDb();
  const existing = db.prepare("SELECT listed_at FROM identities WHERE pubkey = ?").get(pubkey) as
    | { listed_at: number }
    | undefined;
  if (existing && existing.listed_at > doc.listed_at) return false;
  // A deleted listing leaves nothing above to compare against, so without
  // this a copy of the owner's last publish would list them again.
  const removed = db.prepare("SELECT listed_at FROM identity_tombstones WHERE pubkey = ?").get(pubkey) as
    | { listed_at: number }
    | undefined;
  if (removed && removed.listed_at >= doc.listed_at) return false;

  db.prepare(
    `INSERT INTO identities (pubkey, name, tagline, kind, tags, languages, payload, listed_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(pubkey) DO UPDATE SET
       name = excluded.name,
       tagline = excluded.tagline,
       kind = excluded.kind,
       tags = excluded.tags,
       languages = excluded.languages,
       payload = excluded.payload,
       listed_at = excluded.listed_at,
       updated_at = excluded.updated_at`
  ).run(
    pubkey,
    doc.name,
    doc.tagline,
    doc.kind,
    JSON.stringify(doc.tags),
    JSON.stringify(doc.languages),
    payload,
    doc.listed_at,
    new Date().toISOString()
  );
  return true;
}

export function deleteIdentity(pubkey: string): boolean {
  const db = getDb();
  return db.transaction(() => {
    db.prepare(
      `INSERT INTO identity_tombstones (pubkey, listed_at)
       SELECT pubkey, listed_at FROM identities WHERE pubkey = ?
       ON CONFLICT(pubkey) DO UPDATE SET listed_at = excluded.listed_at`
    ).run(pubkey);
    return db.prepare("DELETE FROM identities WHERE pubkey = ?").run(pubkey).changes > 0;
  })();
}

/** Accepts either spelling of the key, as a URL carries it without the prefix. */
export function getIdentity(pubkey: string): IdentityItem | null {
  const hex = pubkey.startsWith("ed25519:") ? pubkey.slice(8) : pubkey;
  const row = getDb().prepare("SELECT * FROM identities WHERE pubkey = ?").get(`ed25519:${hex.toLowerCase()}`) as
    | IdentityRow
    | undefined;
  if (!row) return null;
  try {
    return { ...rowToListItem(row), doc: JSON.parse(row.payload) as IdentityDoc };
  } catch {
    return null;
  }
}

export interface ListIdentitiesOptions {
  q?: string;
  kind?: string | string[];
  tag?: string | string[];
  language?: string | string[];
}

function asArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function listIdentities(opts: ListIdentitiesOptions = {}): IdentityListItem[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.q) {
    conditions.push("(name LIKE ? OR tagline LIKE ?)");
    params.push(`%${opts.q}%`, `%${opts.q}%`);
  }
  // A listing has one kind, so several selected kinds read as "either".
  const kinds = asArray(opts.kind);
  if (kinds.length > 0) {
    conditions.push(`kind IN (${kinds.map(() => "?").join(", ")})`);
    params.push(...kinds);
  }
  // Tags and languages are lists, so several selected values read as "all of".
  for (const [column, values] of [
    ["tags", asArray(opts.tag)],
    ["languages", asArray(opts.language)],
  ] as const) {
    for (const value of values) {
      conditions.push(`EXISTS (SELECT 1 FROM json_each(identities.${column}) WHERE json_each.value = ?)`);
      params.push(value);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(`SELECT * FROM identities ${where} ORDER BY name COLLATE NOCASE LIMIT 200`)
    .all(...params) as IdentityRow[];
  return rows.map(rowToListItem);
}

/** Every value of an open facet with its count, most common first. */
export function identityFacetCounts(column: "tags" | "languages"): Array<{ value: string; count: number }> {
  return getDb()
    .prepare(
      `SELECT json_each.value AS value, COUNT(*) AS count
         FROM identities, json_each(identities.${column})
        GROUP BY value
        ORDER BY count DESC, value`
    )
    .all() as Array<{ value: string; count: number }>;
}

export function countIdentities(kind?: string): number {
  const row = kind
    ? getDb().prepare("SELECT COUNT(*) AS n FROM identities WHERE kind = ?").get(kind)
    : getDb().prepare("SELECT COUNT(*) AS n FROM identities").get();
  return (row as { n: number }).n;
}
