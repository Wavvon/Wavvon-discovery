import type { InfoResponse } from "./types";

export async function fetchHubInfo(hubUrl: string): Promise<InfoResponse> {
  const base = hubUrl.trim().replace(/\/+$/, "");
  const res = await fetch(`${base}/info`, {
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Hub returned ${res.status}`);
  return res.json() as Promise<InfoResponse>;
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
    const base = hubUrl.trim().replace(/\/+$/, "");
    const res = await fetch(`${base}/join/${encodeURIComponent(inviteCode)}`, {
      headers: { accept: "application/json" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return none;
    const body = (await res.json()) as Record<string, unknown>;
    const count = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : null);
    return { member_count: count(body.member_count), online_count: count(body.online_count) };
  } catch {
    return none;
  }
}
