import { NextRequest, NextResponse } from "next/server";
import { listHubs, upsertHub } from "@/lib/db";
import { verifySignature } from "@/lib/verify";
import { fetchHubInfo } from "@/lib/scrape";
import { buildCanonicalPayload, currentNonce } from "@/lib/canonical";
import type { SubmitPayload } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const rawPage = Number(searchParams.get("page") ?? 1);
  const page = Number.isFinite(rawPage) ? Math.min(Math.max(1, rawPage), 1000) : 1;
  const q = searchParams.get("q")?.slice(0, 100) ?? undefined;
  const language = searchParams.get("language")?.slice(0, 10) ?? undefined;
  const result = listHubs({
    q,
    tag: searchParams.getAll("tag").map((t) => t.slice(0, 50)),
    language,
    page,
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  let body: SubmitPayload;
  try {
    body = await req.json() as SubmitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const err = await validateAndUpsert(body);
  if (err) return err;

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function validateAndUpsert(body: SubmitPayload) {
  const { hub_url, tags, language, bio, invite_code, canonical_payload, hub_pubkey, signature } = body;

  if (!hub_url || !hub_pubkey || !signature || !canonical_payload) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Replay protection: nonce must be within 5 minutes of now
  let parsed: { nonce?: string } = {};
  try { parsed = JSON.parse(canonical_payload); } catch {
    return NextResponse.json({ error: "Invalid canonical_payload" }, { status: 400 });
  }
  if (!parsed.nonce) {
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
  });
  if (expected !== canonical_payload) {
    return NextResponse.json({ error: "canonical_payload mismatch" }, { status: 400 });
  }

  // Fetch /info to confirm the hub is reachable and get its public key
  let info;
  try {
    info = await fetchHubInfo(hub_url);
  } catch (e) {
    return NextResponse.json({ error: `Cannot reach hub: ${e}` }, { status: 400 });
  }

  // The hub's public key must match what was submitted
  if (info.public_key !== hub_pubkey) {
    return NextResponse.json({ error: "hub_pubkey does not match /info" }, { status: 403 });
  }

  // Verify signature
  const valid = await verifySignature(hub_pubkey, signature, canonical_payload);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  upsertHub({
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
