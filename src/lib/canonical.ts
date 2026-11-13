export interface CanonicalFields {
  hub_url: string;
  tags: string[];
  language: string;
  bio: string;
  nonce: string;
  /** Signed when present, so nobody else can rewrite a listing's invite link. */
  invite_code?: string | null;
}

// Builds the canonical JSON string that the hub signs with its private key.
// Keys are sorted alphabetically; tags are sorted for determinism.
// The Rust signing side must produce the same byte sequence.
export function buildCanonicalPayload(fields: CanonicalFields): string {
  return JSON.stringify({
    bio: fields.bio,
    hub_url: fields.hub_url,
    ...(fields.invite_code ? { invite_code: fields.invite_code } : {}),
    language: fields.language,
    nonce: fields.nonce,
    tags: [...fields.tags].sort(),
  });
}

// Nonce is the current UTC minute rounded down — gives a 5-minute window.
export function currentNonce(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().replace(".000Z", "Z");
}
