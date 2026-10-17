import { NextRequest, NextResponse } from "next/server";
import { listIdentities, registerIdentity } from "@/lib/identities-db";
import { normalizeIdentityKey, validateIdentity } from "@/lib/identity";
import { verifyListingSignature } from "@/lib/signed-listing";
import type { IdentityDoc, RegisterClientPayload } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const identities = listIdentities({
    q: searchParams.get("q")?.slice(0, 100) ?? undefined,
    kind: searchParams.getAll("kind").map((k) => k.slice(0, 20)),
    tag: searchParams.getAll("tag").map((t) => t.slice(0, 40)),
    language: searchParams.getAll("language").map((l) => l.slice(0, 20)),
  });
  return NextResponse.json({ identities, total: identities.length });
}

export async function POST(req: NextRequest) {
  let body: RegisterClientPayload;
  try {
    body = (await req.json()) as RegisterClientPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { payload, sig } = body;
  if (typeof payload !== "string" || typeof sig !== "string") {
    return NextResponse.json({ error: "Missing payload or sig" }, { status: 400 });
  }

  let doc: IdentityDoc;
  try {
    doc = JSON.parse(payload) as IdentityDoc;
  } catch {
    return NextResponse.json({ error: "payload is not valid JSON" }, { status: 400 });
  }

  const problem = validateIdentity(doc, Buffer.byteLength(payload, "utf8"));
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (!(await verifyListingSignature(payload, sig, doc.pubkey))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const pubkey = normalizeIdentityKey(doc.pubkey)!;
  if (!registerIdentity(pubkey, doc, payload)) {
    return NextResponse.json({ error: "A newer listing for this key is already published" }, { status: 409 });
  }
  return NextResponse.json({ ok: true, pubkey }, { status: 201 });
}
