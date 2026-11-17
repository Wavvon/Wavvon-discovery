import { NextRequest, NextResponse } from "next/server";
import { deleteLanguage, getLanguage } from "@/lib/languages-db";
import { deleteMessage, verifyListingSignature } from "@/lib/signed-listing";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const listing = getLanguage((await params).id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(listing);
}

/** Removal is proved by the key that published the listing, as for clients. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = getLanguage(id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const sig = req.headers.get("x-wavvon-signature");
  if (!sig) return NextResponse.json({ error: "Missing x-wavvon-signature" }, { status: 401 });
  if (!(await verifyListingSignature(deleteMessage("language", id, listing.listed_at), sig, listing.author_pubkey))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }
  deleteLanguage(id);
  return NextResponse.json({ ok: true });
}
