import { getDb } from "./db";
import { isPublicHttpsUrl } from "./identity";
import { contentId, pubkeyHex } from "./signed-listing";

/* Theme listings, in two sections (themes.md §5).
 *
 * "Themes for the Wavvon client" are signed `wavvon.theme` documents: the
 * theme.json metadata plus where to download the package, its SHA-256 and
 * an optional preview image. The directory never hosts a package.
 *
 * "Themes for other clients" are a name, the client they are for, a
 * description and a link. Nothing inside them is inspected.
 *
 * Both are keyed by author and name, not by content: republishing the same
 * name under the same key replaces the listing, which is what lets the
 * official client offer an update to whoever installed the earlier one. */

export const PAGE_SIZE = 20;
const MAX_PAYLOAD_BYTES = 32 * 1024;
const LISTING_FIELDS = ["download_url", "preview_url", "sha256"] as const;

export interface ThemeListing {
  id: string;
  author_pubkey: string;
  name: string;
  description?: string;
  /** The theme.json metadata, minus the listing fields. */
  metadata: Record<string, unknown> & { colors: Record<string, unknown> };
  preview_url?: string;
  download_url: string;
  sha256: string;
  listed_at: number;
}

export interface OtherThemeListing {
  id: string;
  author_pubkey: string;
  name: string;
  client: string;
  description: string;
  link: string;
  listed_at: number;
}

/** The stable id of a listing: one per author key and name. */
export function listingId(kind: "theme" | "other-theme", authorPubkey: string, name: string): string {
  return contentId(`${kind}\n${pubkeyHex(authorPubkey).toLowerCase()}\n${name}`);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function commonProblem(d: Record<string, unknown>, payloadBytes: number): string | null {
  if (payloadBytes > MAX_PAYLOAD_BYTES) return "payload must be 32 KB or smaller";
  if (d.version !== 1) return "Unsupported version";
  if (typeof d.name !== "string" || d.name.trim() === "" || d.name.length > 48) {
    return "Invalid name (must be 1-48 characters)";
  }
  if (typeof d.author_pubkey !== "string" || !/^(ed25519:)?[0-9a-fA-F]{64}$/.test(d.author_pubkey.trim())) {
    return "Missing or malformed author_pubkey";
  }
  return null;
}

/** Anything wrong with a `wavvon.theme` listing, as a message, or null. */
export function validateThemeDoc(doc: unknown, payloadBytes: number): string | null {
  if (!isObject(doc)) return "payload is not an object";
  if (doc.format !== "wavvon.theme") return "Invalid format field";
  const common = commonProblem(doc, payloadBytes);
  if (common) return common;
  if (doc.description !== undefined && !(typeof doc.description === "string" && doc.description.length <= 500)) {
    return "description must be 500 characters or fewer";
  }
  const colors = doc.colors;
  if (!isObject(colors) || !(isObject(colors.dark) || isObject(colors.light))) {
    return "colors needs a dark or a light map";
  }
  for (const scheme of ["dark", "light"]) {
    const map = colors[scheme];
    if (map === undefined) continue;
    if (!isObject(map) || !Object.values(map).every((v) => typeof v === "string" && v.length <= 100)) {
      return `colors.${scheme} must map token names to strings`;
    }
  }
  if (!isPublicHttpsUrl(doc.download_url)) return "download_url must be a public https URL";
  if (doc.preview_url !== undefined && !isPublicHttpsUrl(doc.preview_url)) {
    return "preview_url must be a public https URL";
  }
  if (typeof doc.sha256 !== "string" || !/^[0-9a-f]{64}$/i.test(doc.sha256)) return "sha256 must be 64 hex digits";
  return null;
}

/** Anything wrong with a `wavvon.theme.other` listing, as a message, or null. */
export function validateOtherThemeDoc(doc: unknown, payloadBytes: number): string | null {
  if (!isObject(doc)) return "payload is not an object";
  if (doc.format !== "wavvon.theme.other") return "Invalid format field";
  const common = commonProblem(doc, payloadBytes);
  if (common) return common;
  if (typeof doc.client !== "string" || doc.client.trim() === "" || doc.client.length > 48) {
    return "client must be 1-48 characters";
  }
  if (typeof doc.description !== "string" || doc.description.length > 2000) {
    return "description must be 2000 characters or fewer";
  }
  if (!isPublicHttpsUrl(doc.link)) return "link must be a public https URL";
  return null;
}

interface ThemeRow {
  id: string;
  author_pubkey: string;
  name: string;
  payload: string;
  listed_at: number;
}

function rowToListing(row: ThemeRow): ThemeListing | null {
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(row.payload) as Record<string, unknown>;
  } catch {
    return null;
  }
  const metadata = { ...doc };
  for (const k of LISTING_FIELDS) delete metadata[k];
  return {
    id: row.id,
    author_pubkey: row.author_pubkey,
    name: row.name,
    ...(typeof doc.description === "string" ? { description: doc.description } : {}),
    metadata: metadata as ThemeListing["metadata"],
    ...(typeof doc.preview_url === "string" ? { preview_url: doc.preview_url } : {}),
    download_url: String(doc.download_url),
    sha256: String(doc.sha256).toLowerCase(),
    listed_at: row.listed_at,
  };
}

/** Insert or replace the listing for this author and name; returns its id. */
export function upsertTheme(doc: Record<string, unknown>, payload: string, listedAt = Date.now()): string {
  const name = String(doc.name).trim();
  const author = String(doc.author_pubkey).trim();
  const id = listingId("theme", author, name);
  getDb()
    .prepare(
      `INSERT INTO themes (id, author_pubkey, name, description, payload, listed_at) VALUES (?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET description = excluded.description, payload = excluded.payload,
         listed_at = excluded.listed_at`,
    )
    .run(id, author, name, typeof doc.description === "string" ? doc.description : "", payload, listedAt);
  return id;
}

export function getTheme(id: string): ThemeListing | null {
  const row = getDb().prepare("SELECT * FROM themes WHERE id = ?").get(id) as ThemeRow | undefined;
  return row ? rowToListing(row) : null;
}

export function listThemes(opts: { q?: string; page?: number } = {}): { themes: ThemeListing[]; total: number } {
  const db = getDb();
  const page = Math.max(1, opts.page ?? 1);
  const where = opts.q ? "WHERE name LIKE ? OR description LIKE ?" : "";
  const params = opts.q ? [`%${opts.q}%`, `%${opts.q}%`] : [];
  const rows = db
    .prepare(`SELECT * FROM themes ${where} ORDER BY listed_at DESC LIMIT ? OFFSET ?`)
    .all([...params, PAGE_SIZE, (page - 1) * PAGE_SIZE]) as ThemeRow[];
  const { count } = db.prepare(`SELECT COUNT(*) as count FROM themes ${where}`).get(params) as { count: number };
  return { themes: rows.map(rowToListing).filter((t): t is ThemeListing => t !== null), total: count };
}

export function deleteTheme(id: string): boolean {
  return getDb().prepare("DELETE FROM themes WHERE id = ?").run(id).changes > 0;
}

export function upsertOtherTheme(doc: Record<string, unknown>, listedAt = Date.now()): string {
  const name = String(doc.name).trim();
  const author = String(doc.author_pubkey).trim();
  const id = listingId("other-theme", author, name);
  getDb()
    .prepare(
      `INSERT INTO other_themes (id, author_pubkey, name, client, description, link, listed_at) VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET client = excluded.client, description = excluded.description,
         link = excluded.link, listed_at = excluded.listed_at`,
    )
    .run(id, author, name, String(doc.client).trim(), String(doc.description), String(doc.link), listedAt);
  return id;
}

export function getOtherTheme(id: string): OtherThemeListing | null {
  return (getDb().prepare("SELECT * FROM other_themes WHERE id = ?").get(id) as OtherThemeListing | undefined) ?? null;
}

export function listOtherThemes(opts: { q?: string; page?: number } = {}): { themes: OtherThemeListing[]; total: number } {
  const db = getDb();
  const page = Math.max(1, opts.page ?? 1);
  const where = opts.q ? "WHERE name LIKE ? OR client LIKE ? OR description LIKE ?" : "";
  const params = opts.q ? [`%${opts.q}%`, `%${opts.q}%`, `%${opts.q}%`] : [];
  const themes = db
    .prepare(`SELECT * FROM other_themes ${where} ORDER BY listed_at DESC LIMIT ? OFFSET ?`)
    .all([...params, PAGE_SIZE, (page - 1) * PAGE_SIZE]) as OtherThemeListing[];
  const { count } = db.prepare(`SELECT COUNT(*) as count FROM other_themes ${where}`).get(params) as { count: number };
  return { themes, total: count };
}

export function deleteOtherTheme(id: string): boolean {
  return getDb().prepare("DELETE FROM other_themes WHERE id = ?").run(id).changes > 0;
}
