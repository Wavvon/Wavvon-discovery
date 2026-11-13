import { lookup } from "node:dns/promises";
import { isPrivateAddress } from "./identity";
import type { InfoResponse } from "./types";

/** /info carries the hub icon as a data URL, so it is not small. */
const MAX_JSON_BYTES = 1024 * 1024;
const MAX_ICON_CHARS = 512 * 1024;
const ICON_RE = /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/;

/** Test topologies run hubs on localhost over http; a public directory never does. */
export function allowPrivateHubs(): boolean {
  return process.env.WAVVON_DISCOVERY_ALLOW_PRIVATE_HUBS === "true";
}

/**
 * GET a URL on a publisher's behalf: no redirects, no private address, a
 * bounded body. The URL itself was already checked; this checks what its name
 * resolves to.
 */
// ponytail: resolve-then-fetch leaves a DNS-rebinding window; pin the address with an undici dispatcher if the directory goes public at scale.
export async function fetchCapped(
  url: string,
  max: number,
  headers: Record<string, string> = {},
): Promise<{ bytes: Buffer; type: string | null }> {
  if (!allowPrivateHubs()) {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
    const addrs = await lookup(host, { all: true });
    if (addrs.length === 0 || addrs.some((a) => isPrivateAddress(a.address))) {
      throw new Error("private address");
    }
  }
  const res = await fetch(url, {
    headers,
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
  if (Number(res.headers.get("content-length") ?? 0) > max) throw new Error("too large");
  const reader = res.body?.getReader();
  if (!reader) throw new Error("no body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new Error("too large");
    }
    chunks.push(value);
  }
  return { bytes: Buffer.concat(chunks), type: res.headers.get("content-type") };
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const { bytes } = await fetchCapped(url, MAX_JSON_BYTES, headers);
  return JSON.parse(bytes.toString("utf8"));
}

const base = (hubUrl: string) => hubUrl.trim().replace(/\/+$/, "");

/** The hub's /info, with every field it is listed under checked for type and size. */
export async function fetchHubInfo(hubUrl: string): Promise<InfoResponse> {
  const info = (await fetchJson(`${base(hubUrl)}/info`)) as Record<string, unknown> | null;
  const optional = (v: unknown, max: number) =>
    v === undefined || v === null || (typeof v === "string" && v.length <= max);
  if (
    typeof info !== "object" || info === null ||
    typeof info.name !== "string" || info.name.trim() === "" || info.name.length > 100 ||
    !optional(info.description, 1000) ||
    typeof info.public_key !== "string" ||
    typeof info.invite_only !== "boolean" ||
    !Number.isInteger(info.min_security_level)
  ) {
    throw new Error("unusable /info");
  }
  // Only an inline image: a remote icon would show its host every visitor.
  const icon = typeof info.icon === "string" && info.icon.length <= MAX_ICON_CHARS && ICON_RE.test(info.icon)
    ? info.icon
    : null;
  return { ...info, icon } as unknown as InfoResponse;
}

export interface HubCounts {
  member_count: number | null;
  online_count: number | null;
}

/** The counts a hub shows anyone holding its public invite. Null when it
 * shows none, or could not be asked: the listing goes ahead either way. */
export async function fetchHubCounts(hubUrl: string, inviteCode: string | null | undefined): Promise<HubCounts> {
  const none = { member_count: null, online_count: null };
  if (!inviteCode) return none;
  try {
    const body = (await fetchJson(`${base(hubUrl)}/join/${encodeURIComponent(inviteCode)}`, {
      accept: "application/json",
    })) as Record<string, unknown>;
    const count = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : null);
    return { member_count: count(body.member_count), online_count: count(body.online_count) };
  } catch {
    return none;
  }
}
