import { getDb } from "./db";
import type { ClientDoc, ClientItem, ClientListItem } from "./types";

interface ClientRow {
  id: string;
  author_pubkey: string;
  name: string;
  tagline: string;
  maintainer: string;
  official: number;
  platforms: string;
  languages: string;
  features: string;
  payload: string;
  listed_at: string;
  updated_at: string;
}

function parseList(json: string): string[] {
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function rowToListItem(row: ClientRow): ClientListItem {
  return {
    id: row.id,
    author_pubkey: row.author_pubkey,
    name: row.name,
    tagline: row.tagline,
    maintainer: row.maintainer,
    official: row.official === 1,
    platforms: parseList(row.platforms),
    languages: parseList(row.languages),
    listed_at: row.listed_at,
    updated_at: row.updated_at,
  };
}

export interface RegisterClientRow {
  id: string;
  doc: ClientDoc;
  payload: string;
}

export function registerClient({ id, doc, payload }: RegisterClientRow): void {
  const db = getDb();
  const now = new Date().toISOString();
  // Only the features a client actually implements go in the filter column;
  // a declared "none" is information for the detail page, not a match.
  const supported = Object.entries(doc.features ?? {})
    .filter(([, v]) => v?.support === "full" || v?.support === "partial")
    .map(([k]) => k);

  db.prepare(
    `INSERT INTO clients
       (id, author_pubkey, name, tagline, maintainer, official, platforms, languages, features, payload, listed_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       tagline = excluded.tagline,
       maintainer = excluded.maintainer,
       official = excluded.official,
       platforms = excluded.platforms,
       languages = excluded.languages,
       features = excluded.features,
       payload = excluded.payload,
       updated_at = excluded.updated_at`
  ).run(
    id,
    doc.author_pubkey,
    doc.name,
    doc.tagline ?? "",
    doc.maintainer ?? "",
    doc.official ? 1 : 0,
    JSON.stringify(doc.platforms ?? []),
    JSON.stringify(doc.languages ?? []),
    JSON.stringify(supported),
    payload,
    now,
    now
  );
}

export function deleteClient(id: string): boolean {
  return getDb().prepare("DELETE FROM clients WHERE id = ?").run(id).changes > 0;
}

export function getClient(id: string): ClientItem | null {
  const row = getDb().prepare("SELECT * FROM clients WHERE id = ?").get(id) as ClientRow | undefined;
  if (!row) return null;
  let doc: ClientDoc;
  try {
    doc = JSON.parse(row.payload) as ClientDoc;
  } catch {
    return null;
  }
  return { ...rowToListItem(row), doc };
}

export interface ListClientsOptions {
  q?: string;
  platform?: string | string[];
  language?: string | string[];
  feature?: string | string[];
  official?: boolean;
}

function asArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function listClients(opts: ListClientsOptions = {}): ClientListItem[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.q) {
    conditions.push("(name LIKE ? OR tagline LIKE ? OR maintainer LIKE ?)");
    params.push(`%${opts.q}%`, `%${opts.q}%`, `%${opts.q}%`);
  }
  if (opts.official !== undefined) {
    conditions.push("official = ?");
    params.push(opts.official ? 1 : 0);
  }
  // Every selected value must be present, so a two-platform filter means
  // "runs on both" rather than "runs on either".
  for (const [column, values] of [
    ["platforms", asArray(opts.platform)],
    ["languages", asArray(opts.language)],
    ["features", asArray(opts.feature)],
  ] as const) {
    for (const value of values) {
      conditions.push(`EXISTS (SELECT 1 FROM json_each(clients.${column}) WHERE json_each.value = ?)`);
      params.push(value);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(`SELECT * FROM clients ${where} ORDER BY official DESC, name COLLATE NOCASE LIMIT 200`)
    .all(...params) as ClientRow[];
  return rows.map(rowToListItem);
}

/** Every value of an open facet with its count, most common first. */
export function clientFacetCounts(column: "platforms" | "languages" | "features"): Array<{ value: string; count: number }> {
  return getDb()
    .prepare(
      `SELECT json_each.value AS value, COUNT(*) AS count
         FROM clients, json_each(clients.${column})
        GROUP BY value
        ORDER BY count DESC, value`
    )
    .all() as Array<{ value: string; count: number }>;
}

export function countClients(): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM clients").get() as { n: number }).n;
}

export function clientsByAuthor(pubkey: string, excludeId?: string): ClientListItem[] {
  const rows = getDb()
    .prepare("SELECT * FROM clients WHERE author_pubkey = ? AND id != ? ORDER BY name COLLATE NOCASE")
    .all(pubkey, excludeId ?? "") as ClientRow[];
  return rows.map(rowToListItem);
}
