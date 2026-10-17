import type { IdentityDoc } from "./types";

export const MAX_IDENTITY_BYTES = 32768;

const KEY_RE = /^[0-9a-f]{64}$/;
const TAG_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
const LANGUAGE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/** The stored spelling of a key: `ed25519:` plus 64 lowercase hex. Null if it is not one. */
export function normalizeIdentityKey(key: string): string | null {
  const hex = (key.startsWith("ed25519:") ? key.slice(8) : key).toLowerCase();
  return KEY_RE.test(hex) ? `ed25519:${hex}` : null;
}

function ipv4Private(host: string): boolean {
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function ipv6Private(host: string): boolean {
  const h = host.slice(1, -1).toLowerCase();
  if (h === "::" || h === "::1") return true;
  if (/^f[cd]/.test(h) || /^fe[89ab]/.test(h)) return true;
  // The URL parser rewrites ::ffff:127.0.0.1 into hex groups, so the mapped
  // IPv4 range has to be recognised in that form.
  const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(h);
  if (!mapped) return false;
  const hi = parseInt(mapped[1], 16);
  const lo = parseInt(mapped[2], 16);
  return ipv4Private(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
}

function parseUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return null;
  try {
    const url = new URL(value);
    return url.username || url.password ? null : url;
  } catch {
    return null;
  }
}

/**
 * A hub POSTs to this URL, so it is an SSRF surface. This is a static check on
 * the literal host: a public name that resolves to a private address is the
 * caller's DNS-resolution problem, which the directory cannot see.
 */
export function isPublicHttpsUrl(value: unknown): boolean {
  const url = parseUrl(value);
  if (!url || url.protocol !== "https:") return false;
  const host = url.hostname;
  if (host.startsWith("[")) return !ipv6Private(host);
  return !(
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    ipv4Private(host)
  );
}

export function isHttpUrl(value: unknown): boolean {
  const url = parseUrl(value);
  return url !== null && (url.protocol === "https:" || url.protocol === "http:");
}

function validList(value: unknown, re: RegExp, max: number): value is string[] {
  return Array.isArray(value) && value.length <= max && value.every((v) => typeof v === "string" && re.test(v));
}

/** Anything wrong with the document, as a message, or null if it is fine. */
export function validateIdentity(doc: unknown, payloadBytes: number): string | null {
  if (payloadBytes > MAX_IDENTITY_BYTES) return "payload must be 32 KB or smaller";
  if (typeof doc !== "object" || doc === null) return "payload is not an object";

  const d = doc as Partial<IdentityDoc>;
  if (d.format !== "wavvon.identity") return "Invalid format field";
  if (d.version !== 1) return "Unsupported version";
  if (typeof d.pubkey !== "string" || normalizeIdentityKey(d.pubkey) === null) {
    return "pubkey must be an ed25519 public key";
  }
  if (typeof d.name !== "string" || d.name.trim() === "" || d.name.length > 48) {
    return "Invalid name (must be 1-48 characters)";
  }
  if (typeof d.tagline !== "string" || d.tagline.length > 160) {
    return "Invalid tagline (160 characters or fewer)";
  }
  if (typeof d.description !== "string" || d.description.length > 8000) {
    return "Invalid description (8000 characters or fewer)";
  }
  if (d.kind !== "person" && d.kind !== "program") return "kind must be person or program";
  if (!validList(d.tags, TAG_RE, 10)) return "tags must be at most 10 lowercase slugs of 32 characters or fewer";
  if (!validList(d.languages, LANGUAGE_RE, 10)) return "languages must be at most 10 BCP-47 tags";
  if (!Number.isSafeInteger(d.listed_at) || (d.listed_at as number) < 0) {
    return "listed_at must be a non-negative integer";
  }

  const contact = d.contact as Record<string, unknown> | undefined;
  if (typeof contact !== "object" || contact === null || Array.isArray(contact)) {
    return "A listing must carry a delivery route: contact.home_hub or contact.endpoint";
  }
  const routes = Object.keys(contact);
  if (routes.length !== 1 || (routes[0] !== "home_hub" && routes[0] !== "endpoint")) {
    return "contact must carry exactly one of home_hub or endpoint";
  }
  if (routes[0] === "endpoint" && !isPublicHttpsUrl(contact.endpoint)) {
    return "contact.endpoint must be a public https URL";
  }
  if (routes[0] === "home_hub" && !isHttpUrl(contact.home_hub)) {
    return "contact.home_hub must be an http(s) URL";
  }

  if (d.app !== undefined) {
    const app = d.app as { commands?: unknown; mini_app?: unknown } | null;
    if (typeof app !== "object" || app === null || Array.isArray(app)) return "app must be an object";
    if (app.mini_app !== undefined && typeof app.mini_app !== "boolean") return "app.mini_app must be a boolean";
    if (app.commands !== undefined) {
      const ok =
        Array.isArray(app.commands) &&
        app.commands.length <= 25 &&
        app.commands.every((c: unknown) => {
          const cmd = c as { name?: unknown; description?: unknown } | null;
          return (
            typeof cmd === "object" &&
            cmd !== null &&
            typeof cmd.name === "string" &&
            cmd.name.length >= 1 &&
            cmd.name.length <= 32 &&
            typeof cmd.description === "string" &&
            cmd.description.length <= 200
          );
        });
      if (!ok) return "app.commands must be at most 25 entries with a name and a description";
    }
  }
  return null;
}
