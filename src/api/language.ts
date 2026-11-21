import { deleteLanguage, getLanguage } from "@/lib/languages-db";
import { deleteMessage, verifyListingSignature } from "@/lib/signed-listing";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const listing = getLanguage((await params).id);
  if (!listing) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(listing);
}

/** Removal is proved by the key that published the listing, as for clients. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = getLanguage(id);
  if (!listing) return Response.json({ error: "Not found" }, { status: 404 });
  const sig = req.headers.get("x-wavvon-signature");
  if (!sig) return Response.json({ error: "Missing x-wavvon-signature" }, { status: 401 });
  if (!(await verifyListingSignature(deleteMessage("language", id, listing.listed_at), sig, listing.author_pubkey))) {
    return Response.json({ error: "Invalid signature" }, { status: 403 });
  }
  deleteLanguage(id);
  return Response.json({ ok: true });
}
