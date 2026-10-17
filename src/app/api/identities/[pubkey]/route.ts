import { NextRequest, NextResponse } from "next/server";
import { deleteIdentity, getIdentity } from "@/lib/identities-db";
import { keyParam } from "@/lib/links";
import { verifyListingSignature } from "@/lib/signed-listing";

interface Ctx {
  params: Promise<{ pubkey: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { pubkey } = await params;
  const identity = getIdentity(pubkey);
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(identity);
}

/** The caller signs the bare-hex key, as it appears in the URL, with that same key. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { pubkey } = await params;
  const identity = getIdentity(pubkey);
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sig = req.headers.get("x-wavvon-signature");
  if (!sig) return NextResponse.json({ error: "Missing x-wavvon-signature" }, { status: 401 });

  if (!(await verifyListingSignature(keyParam(identity.pubkey), sig, identity.pubkey))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  deleteIdentity(identity.pubkey);
  return NextResponse.json({ ok: true });
}
