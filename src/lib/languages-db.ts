import { getDb } from "./db";
import { isPublicHttpsUrl } from "./identity";
import { contentId, pubkeyHex } from "./signed-listing";

/* Language pack listings (language-packs.md §3): signed `wavvon.lang`
 * documents naming a pack's code, name, coverage and where to download it
 * with its SHA-256. The directory never hosts a pack.
 *
 * Keyed by author, code and name, not by content: republishing them under
 * the same key replaces the listing, which is what lets the official client
 * offer an update to whoever installed the earlier one. */

export const PAGE_SIZE = 20;
const MAX_PAYLOAD_BYTES = 8 * 1024;

export interface LanguageListing {
  id: string;
  author_pubkey: string;
  code: string;
  name: string;
  description?: string;
  /** Share of the client's translatable strings the pack carries, 0 to 1. */
  coverage?: number;
  /** The client version the pack was made against. */
  client_version?: string;
  download_url: string;
  sha256: string;
  listed_at: number;
}

// Shape only, like the hub's check: primary 2-3 letters, subtags of 1-8.
const BCP47 = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/;

export function listingId(authorPubkey: string, code: string, name: string): string {
  return contentId(`language\n${pubkeyHex(authorPubkey).toLowerCase()}\n${code.toLowerCase()}\n${name}`);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Anything wrong with a `wavvon.lang` listing, as a message, or null. */
export function validateLanguageDoc(doc: unknown, payloadBytes: number): string | null {
  if (!isObject(doc)) return "payload is not an object";
  if (payloadBytes > MAX_PAYLOAD_BYTES) return "payload must be 8 KB or smaller";
  if (doc.format !== "wavvon.lang") return "Invalid format field";
  if (doc.version !== 1) return "Unsupported version";
  if (typeof doc.code !== "string" || doc.code.length > 35 || !BCP47.test(doc.code)) {
    return "Invalid code (must be a BCP-47 language tag)";
  }
  if (typeof doc.name !== "string" || doc.name.trim() === "" || doc.name.length > 48) {
    return "Invalid name (must be 1-48 characters)";
  }
  if (typeof doc.author_pubkey !== "string" || !/^(ed25519:)?[0-9a-fA-F]{64}$/.test(doc.author_pubkey.trim())) {
    return "Missing or malformed author_pubkey";
  }
  if (doc.description !== undefined && !(typeof doc.description === "string" && doc.description.length <= 500)) {
    return "description must be 500 characters or fewer";
  }
  if (doc.coverage !== undefined && !(typeof doc.coverage === "number" && doc.coverage >= 0 && doc.coverage <= 1)) {
    return "coverage must be a number from 0 to 1";
  }
  if (doc.client_version !== undefined && !(typeof doc.client_version === "string" && doc.client_version.length <= 32)) {
    return "client_version must be 32 characters or fewer";
  }
  if (!isPublicHttpsUrl(doc.download_url)) return "download_url must be a public https URL";
  if (typeof doc.sha256 !== "string" || !/^[0-9a-f]{64}$/i.test(doc.sha256)) return "sha256 must be 64 hex digits";
  return null;
}

interface LanguageRow {
  id: string;
  author_pubkey: string;
  code: string;
  name: string;
  payload: string;
  listed_at: number;
}

function rowToListing(row: LanguageRow): LanguageListing | null {
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(row.payload) as Record<string, unknown>;
  } catch {
    return null;
  }
  return {
    id: row.id,
    author_pubkey: row.author_pubkey,
    code: row.code,
    name: row.name,
    ...(typeof doc.description === "string" ? { description: doc.description } : {}),
    ...(typeof doc.coverage === "number" ? { coverage: doc.coverage } : {}),
    ...(typeof doc.client_version === "string" ? { client_version: doc.client_version } : {}),
    download_url: String(doc.download_url),
    sha256: String(doc.sha256).toLowerCase(),
    listed_at: row.listed_at,
  };
}

/** Insert or replace the listing for this author, code and name; returns its id. */
export function upsertLanguage(doc: Record<string, unknown>, payload: string, listedAt = Date.now()): string {
  const name = String(doc.name).trim();
  const code = String(doc.code);
  const author = String(doc.author_pubkey).trim();
  const id = listingId(author, code, name);
  getDb()
    .prepare(
      `INSERT INTO languages (id, author_pubkey, code, name, description, payload, listed_at) VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET code = excluded.code, description = excluded.description,
         payload = excluded.payload, listed_at = excluded.listed_at`,
    )
    .run(id, author, code, name, typeof doc.description === "string" ? doc.description : "", payload, listedAt);
  return id;
}

export function getLanguage(id: string): LanguageListing | null {
  const row = getDb().prepare("SELECT * FROM languages WHERE id = ?").get(id) as LanguageRow | undefined;
  return row ? rowToListing(row) : null;
}

export function listLanguages(opts: { q?: string; page?: number } = {}): { languages: LanguageListing[]; total: number } {
  const db = getDb();
  const page = Math.max(1, opts.page ?? 1);
  const where = opts.q ? "WHERE name LIKE ? OR code LIKE ? OR description LIKE ?" : "";
  const params = opts.q ? [`%${opts.q}%`, `${opts.q}%`, `%${opts.q}%`] : [];
  const rows = db
    .prepare(`SELECT * FROM languages ${where} ORDER BY listed_at DESC LIMIT ? OFFSET ?`)
    .all([...params, PAGE_SIZE, (page - 1) * PAGE_SIZE]) as LanguageRow[];
  const { count } = db.prepare(`SELECT COUNT(*) as count FROM languages ${where}`).get(params) as { count: number };
  return { languages: rows.map(rowToListing).filter((l): l is LanguageListing => l !== null), total: count };
}

export function deleteLanguage(id: string): boolean {
  return getDb().prepare("DELETE FROM languages WHERE id = ?").run(id).changes > 0;
}
