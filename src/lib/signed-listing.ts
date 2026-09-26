import { createHash } from "crypto";
import { verifySignature } from "./verify";

/* Shared plumbing for self-published listings.
 *
 * Skins and clients arrive the same way: a JSON document, plus a base64url
 * Ed25519 signature over its exact bytes, signed by the key named inside the
 * document. The id is the content hash, so re-publishing an unchanged document
 * is idempotent and editing it produces a new id. */

export function base64urlToBytes(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Accepts `ed25519:<hex>` or bare hex; returns the hex. */
export function pubkeyHex(pubkey: string): string {
  const trimmed = pubkey.trim();
  return trimmed.startsWith("ed25519:") ? trimmed.slice(8) : trimmed;
}

/** SHA-256 of the payload bytes, hex — the listing's primary key. */
export function contentId(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Verify `sig` over `payload` against the key the document names.
 * Returns false on any malformed input rather than throwing, because every
 * one of these arrives from a stranger.
 */
export async function verifyListingSignature(
  payload: string,
  sig: string,
  authorPubkey: string
): Promise<boolean> {
  try {
    return await verifySignature(pubkeyHex(authorPubkey), bytesToHex(base64urlToBytes(sig)), payload);
  } catch {
    return false;
  }
}
