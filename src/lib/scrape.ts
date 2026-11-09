import { lookup } from "node:dns/promises";
import { isPrivateAddress } from "./identity";
import type { InfoResponse } from "./types";

const MAX_BODY_BYTES = 64 * 1024;

/** Test topologies run hubs on localhost over http; a public directory never does. */
export function allowPrivateHubs(): boolean {
  return process.env.WAVVON_DISCOVERY_ALLOW_PRIVATE_HUBS === "true";
}

/**
 * GET a URL on a hub's behalf: no redirects, no private address, a bounded
 * body. The URL itself was already checked; this checks what its name
 * resolves to.
 */
// ponytail: resolve-then-fetch leaves a DNS-rebinding window; pin the address with an undici dispatcher if the directory goes public at scale.
async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
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
  if (Number(res.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) throw new Error("too large");
  const reader = res.body?.getReader();
  if (!reader) throw new Error("no body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("too large");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
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
    !optional(info.icon, 2048) ||
    typeof info.public_key !== "string" ||
    typeof info.invite_only !== "boolean" ||
    !Number.isInteger(info.min_security_level)
  ) {
    throw new Error("unusable /info");
  }
  return info as unknown as InfoResponse;
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
