export interface HubListing {
  hub_pubkey: string;
  hub_url: string;
  name: string;
  description: string | null;
  icon: string | null;
  invite_only: boolean;
  min_security_level: number;
  invite_code: string | null;
  bio: string;
  tags: string[];
  language: string;
  listed_at: string;
  last_verified_at: string;
}

export interface InfoResponse {
  name: string;
  description?: string | null;
  icon?: string | null;
  version: string;
  public_key: string;
  min_security_level: number;
  invite_only: boolean;
}

export interface SubmitPayload {
  hub_url: string;
  tags: string[];
  language: string;
  bio: string;
  invite_code?: string | null;
  canonical_payload: string;
  hub_pubkey: string;
  signature: string;
}

export interface SkinListItem {
  id: string;
  author_pubkey: string;
  name: string;
  base: string;
  swatch_bg: string;
  swatch_surface: string;
  swatch_accent: string;
  featured: number;
  listed_at: number;
}

export interface SkinItem extends SkinListItem {
  payload: string;
}

export interface RegisterSkinPayload {
  payload: string; // full .wavvonskin JSON
  sig: string;     // base64url Ed25519 sig over payload bytes
}

/* ── Clients ──────────────────────────────────────────────────────────────
 * A client listing is a signed document, the same shape of thing a skin is.
 * The browse page reads the extracted columns; the detail page reads the
 * whole payload back. */

export type FeatureSupport = "full" | "partial" | "none";

export interface ClientDownload {
  platform: string;
  label: string;
  url: string;
}

/** The signed `.wavvonclient` document. */
export interface ClientDoc {
  format: "wavvon.client";
  version: 1;
  name: string;
  tagline: string;
  description: string;
  author_pubkey: string;
  maintainer: string;
  official?: boolean;
  platforms: string[];
  /** BCP-47 codes the interface is translated into. Open-ended on purpose. */
  languages: string[];
  features: Record<string, { support: FeatureSupport; note?: string }>;
  downloads?: ClientDownload[];
  screenshots?: string[];
  homepage_url?: string;
  source_url?: string;
  license?: string;
  built_with?: string;
  latest_version?: string;
  released_at?: string;
}

/** What the browse grid needs — never the full payload. */
export interface ClientListItem {
  id: string;
  author_pubkey: string;
  name: string;
  tagline: string;
  maintainer: string;
  official: boolean;
  platforms: string[];
  languages: string[];
  listed_at: string;
  updated_at: string;
}

export interface ClientItem extends ClientListItem {
  doc: ClientDoc;
}

export interface RegisterClientPayload {
  /** Full `.wavvonclient` JSON — the canonical signed bytes. */
  payload: string;
  /** base64url Ed25519 signature over `payload`. */
  sig: string;
}
