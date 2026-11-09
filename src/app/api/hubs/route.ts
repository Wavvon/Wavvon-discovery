import { NextRequest, NextResponse } from "next/server";
import { listHubs, upsertHub, type HubSort } from "@/lib/db";
import { verifySignature } from "@/lib/verify";
import { fetchHubInfo, fetchHubCounts } from "@/lib/scrape";
import { buildCanonicalPayload, currentNonce } from "@/lib/canonical";
import { clientAddress, overWriteBudget, readSubmission, validateHubSubmission } from "@/lib/hub-submission";
import type { SubmitPayload } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const rawPage = Number(searchParams.get("page") ?? 1);
  const page = Number.isFinite(rawPage) ? Math.min(Math.max(1, rawPage), 1000) : 1;
  const q = searchParams.get("q")?.slice(0, 100) ?? undefined;
  const language = searchParams.get("language")?.slice(0, 10) ?? undefined;
  const sortParam = searchParams.get("sort");
  const sort: HubSort = sortParam === "members" || sortParam === "online" ? sortParam : "recent";
  const result = listHubs({
    q,
    tag: searchParams.getAll("tag").map((t) => t.slice(0, 50)),
    language,
    page,
    sort,
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const read = await readHubSubmission(req);
  if (read instanceof NextResponse) return read;

  const err = await validateAndUpsert(read);
  if (err) return err;

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** Rate limit, size cap and JSON parse shared by POST and PUT. */
export async function readHubSubmission(req: NextRequest): Promise<SubmitPayload | NextResponse> {
  if (overWriteBudget(clientAddress(req.headers))) {
    return NextResponse.json({ error: "Too many listing updates, try again later" }, { status: 429 });
  }
  const read = await readSubmission(req);
  if ("error" in read) return NextResponse.json({ error: read.error }, { status: read.status });
  return read.body as SubmitPayload;
}

export async function validateAndUpsert(body: SubmitPayload) {
  const problem = validateHubSubmission(body);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const { hub_url, tags, language, bio, invite_code, canonical_payload, hub_pubkey, signature } = body;

  // Replay protection: nonce must be within 5 minutes of now
  let parsed: { nonce?: unknown } = {};
  try { parsed = JSON.parse(canonical_payload); } catch {
    return NextResponse.json({ error: "Invalid canonical_payload" }, { status: 400 });
  }
  if (typeof parsed?.nonce !== "string") {
    return NextResponse.json({ error: "Missing nonce in canonical_payload" }, { status: 400 });
  }
  const nonceMs = new Date(parsed.nonce).getTime();
  if (isNaN(nonceMs) || Math.abs(Date.now() - nonceMs) > 5 * 60 * 1000) {
    return NextResponse.json({ error: "Nonce expired or invalid" }, { status: 400 });
  }

  // Verify the canonical payload matches what was signed
  const expected = buildCanonicalPayload({
    hub_url,
    tags: tags ?? [],
    language: language ?? "en",
    bio: bio ?? "",
    nonce: parsed.nonce,
    invite_code,
  });
  if (expected !== canonical_payload) {
    return NextResponse.json({ error: "canonical_payload mismatch" }, { status: 400 });
  }

  // The signature first: until it holds, nothing here fetches anything.
  const valid = await verifySignature(hub_pubkey, signature, canonical_payload);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let info;
  try {
    info = await fetchHubInfo(hub_url);
  } catch {
    return NextResponse.json({ error: "Cannot reach hub" }, { status: 400 });
  }

  // The key that signed must be the key the hub at that address presents.
  if (info.public_key !== hub_pubkey) {
    return NextResponse.json({ error: "hub_pubkey does not match /info" }, { status: 403 });
  }

  const counts = await fetchHubCounts(hub_url, invite_code);

  upsertHub({
    ...counts,
    hub_pubkey,
    hub_url,
    name: info.name,
    description: info.description ?? null,
    icon: info.icon ?? null,
    invite_only: info.invite_only,
    min_security_level: info.min_security_level,
    invite_code: invite_code ?? null,
    bio: bio ?? "",
    tags: tags ?? [],
    language: language ?? "en",
  });

  return null; // no error
}

// Suppress unused import warning — currentNonce is re-exported for client use
export { currentNonce };
