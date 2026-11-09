import { isHttpUrl, isPublicHttpsUrl, LANGUAGE_RE } from "./identity";
import { allowPrivateHubs } from "./scrape";
import type { SubmitPayload } from "./types";

export const MAX_SUBMISSION_BYTES = 16 * 1024;

const INVITE_RE = /^[A-Za-z0-9_-]{1,64}$/;
const HEX_RE = /^[0-9a-f]+$/i;

/** A hub URL is a base the directory appends paths to: no query or fragment to swallow them. */
export function isHubUrl(value: unknown): value is string {
  if (!(allowPrivateHubs() ? isHttpUrl(value) : isPublicHttpsUrl(value))) return false;
  const url = new URL(value as string);
  return url.search === "" && url.hash === "" && !(value as string).includes("?") && !(value as string).includes("#");
}

/** Anything wrong with the submission's shape, as a message, or null. */
export function validateHubSubmission(b: unknown): string | null {
  if (typeof b !== "object" || b === null) return "Body must be an object";
  const s = b as Partial<Record<keyof SubmitPayload, unknown>>;
  if (!isHubUrl(s.hub_url)) return "hub_url must be a public https URL without query or fragment";
  if (typeof s.hub_pubkey !== "string" || s.hub_pubkey.length > 80) return "Invalid hub_pubkey";
  if (typeof s.signature !== "string" || s.signature.length > 256 || !HEX_RE.test(s.signature)) {
    return "Invalid signature";
  }
  if (typeof s.canonical_payload !== "string" || s.canonical_payload.length > 4096) {
    return "Invalid canonical_payload";
  }
  if (
    s.tags !== undefined &&
    !(Array.isArray(s.tags) && s.tags.length <= 10 &&
      s.tags.every((t) => typeof t === "string" && t.length >= 1 && t.length <= 32))
  ) {
    return "tags must be at most 10 strings of 32 characters or fewer";
  }
  if (s.language !== undefined && !(typeof s.language === "string" && LANGUAGE_RE.test(s.language))) {
    return "language must be a BCP-47 tag";
  }
  if (s.bio !== undefined && !(typeof s.bio === "string" && s.bio.length <= 500)) {
    return "bio must be 500 characters or fewer";
  }
  if (s.invite_code !== undefined && s.invite_code !== null &&
      !(typeof s.invite_code === "string" && INVITE_RE.test(s.invite_code))) {
    return "invite_code must be 1-64 letters, digits, '-' or '_'";
  }
  return null;
}

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, { count: number; reset: number }>();

/**
 * Per-address budget for listing writes, each of which makes this site fetch
 * a hub. The address is the proxy's `x-forwarded-for`, so this is only as
 * honest as the proxy in front.
 */
// ponytail: in-memory, per process; a shared store if the site ever runs replicated.
export function overWriteBudget(addr: string, now = Date.now()): boolean {
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }
  const entry = hits.get(addr);
  if (!entry || entry.reset <= now) {
    hits.set(addr, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export function clientAddress(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

/** The request body as JSON, refusing anything over the cap before parsing it. */
export async function readSubmission(req: Request): Promise<{ body: unknown } | { error: string; status: number }> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_SUBMISSION_BYTES) {
    return { error: "Body too large", status: 413 };
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = req.body?.getReader();
  for (;;) {
    const chunk = reader ? await reader.read() : { done: true as const, value: undefined };
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > MAX_SUBMISSION_BYTES) {
      await reader!.cancel();
      return { error: "Body too large", status: 413 };
    }
    chunks.push(chunk.value);
  }
  try {
    return { body: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return { error: "Invalid JSON", status: 400 };
  }
}
