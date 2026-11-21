import { deleteOtherTheme, getOtherTheme } from "@/lib/themes-db";
import { deleteMessage, verifyListingSignature } from "@/lib/signed-listing";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const theme = getOtherTheme((await params).id);
  if (!theme) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(theme);
}

/** Removal is proved by the key that published the listing, as for clients. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const theme = getOtherTheme(id);
  if (!theme) return Response.json({ error: "Not found" }, { status: 404 });
  const sig = req.headers.get("x-wavvon-signature");
  if (!sig) return Response.json({ error: "Missing x-wavvon-signature" }, { status: 401 });
  if (!(await verifyListingSignature(deleteMessage("other-theme", id, theme.listed_at), sig, theme.author_pubkey))) {
    return Response.json({ error: "Invalid signature" }, { status: 403 });
  }
  deleteOtherTheme(id);
  return Response.json({ ok: true });
}
