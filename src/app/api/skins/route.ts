import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { listSkins, registerSkin } from "@/lib/db";
import { verifySignature } from "@/lib/verify";
import type { RegisterSkinPayload } from "@/lib/types";

// The clients' two themes; a skin is an overlay on one of them.
const VALID_BASES = ["dark", "light"] as const;

// base64url → Uint8Array
function base64urlToBytes(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Uint8Array → lowercase hex
function bytesToHex(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const rawPage = Number(searchParams.get("page") ?? 1);
  const page = Number.isFinite(rawPage) ? Math.min(Math.max(1, rawPage), 1000) : 1;
  const result = listSkins({
    q: searchParams.get("q")?.slice(0, 100) ?? undefined,
    base: searchParams.get("base") ?? undefined,
    page,
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  let body: RegisterSkinPayload;
  try {
    body = await req.json() as RegisterSkinPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { payload, sig } = body;

  if (typeof payload !== "string" || typeof sig !== "string") {
    return NextResponse.json({ error: "Missing payload or sig" }, { status: 400 });
  }

  // Parse and validate payload
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "payload is not valid JSON" }, { status: 400 });
  }

  if (parsed.format !== "wavvon.skin") {
    return NextResponse.json({ error: "Invalid format field" }, { status: 400 });
  }
  if (parsed.version !== 1) {
    return NextResponse.json({ error: "Unsupported version" }, { status: 400 });
  }
  if (typeof parsed.name !== "string" || parsed.name.trim() === "" || parsed.name.length > 48) {
    return NextResponse.json({ error: "Invalid name (must be 1–48 characters)" }, { status: 400 });
  }
  if (!VALID_BASES.includes(parsed.base as (typeof VALID_BASES)[number])) {
    return NextResponse.json({ error: "Invalid base theme" }, { status: 400 });
  }
  if (typeof parsed.author_pubkey !== "string" || parsed.author_pubkey.trim() === "") {
    return NextResponse.json({ error: "Missing author_pubkey" }, { status: 400 });
  }
  if (payload.length > 16384) {
    return NextResponse.json({ error: "payload must be 16 KB or smaller" }, { status: 400 });
  }
  if (typeof parsed.tokens !== "object" || parsed.tokens === null) {
    return NextResponse.json({ error: "Invalid tokens field" }, { status: 400 });
  }
  if (Object.keys(parsed.tokens as object).length > 50) {
    return NextResponse.json({ error: "tokens must have at most 50 keys" }, { status: 400 });
  }

  const authorPubkey = (parsed.author_pubkey as string).trim();

  // Verify Ed25519 sig (base64url) over payload bytes.
  // verifySignature expects hex strings; convert both sig and pubkey.
  let sigHex: string;
  let pubkeyHex: string;
  try {
    sigHex = bytesToHex(base64urlToBytes(sig));
    // author_pubkey may be "ed25519:<hex>" or plain hex
    const rawPubkey = authorPubkey.startsWith("ed25519:")
      ? authorPubkey.slice(8)
      : authorPubkey;
    pubkeyHex = rawPubkey;
  } catch {
    return NextResponse.json({ error: "Invalid sig or author_pubkey encoding" }, { status: 400 });
  }

  const valid = await verifySignature(pubkeyHex, sigHex, payload);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // Compute id = SHA-256 hex of payload bytes
  const id = createHash("sha256").update(payload).digest("hex");

  const tokens = parsed.tokens as Record<string, unknown>;
  const swatchBg = typeof tokens["--bg"] === "string" ? tokens["--bg"] : "";
  const swatchSurface = typeof tokens["--surface"] === "string" ? tokens["--surface"] : "";
  const swatchAccent = typeof tokens["--accent"] === "string" ? tokens["--accent"] : "";

  registerSkin({
    id,
    author_pubkey: authorPubkey,
    name: (parsed.name as string).trim(),
    base: parsed.base as string,
    swatch_bg: swatchBg,
    swatch_surface: swatchSurface,
    swatch_accent: swatchAccent,
    payload,
    featured: 0,
    listed_at: Date.now(),
  });

  return NextResponse.json({ id }, { status: 201 });
}
