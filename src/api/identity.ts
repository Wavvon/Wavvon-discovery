import { deleteIdentity, getIdentity } from "@/lib/identities-db";
import { keyParam } from "@/lib/links";
import { deleteMessage, verifyListingSignature } from "@/lib/signed-listing";

interface Ctx {
  params: Promise<{ pubkey: string }>;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { pubkey } = await params;
  const identity = getIdentity(pubkey);
  if (!identity) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(identity);
}

/** The caller signs `deleteMessage` over the bare-hex key, as it appears in the URL, with that same key. */
export async function DELETE(req: Request, { params }: Ctx) {
  const { pubkey } = await params;
  const identity = getIdentity(pubkey);
  if (!identity) return Response.json({ error: "Not found" }, { status: 404 });

  const sig = req.headers.get("x-wavvon-signature");
  if (!sig) return Response.json({ error: "Missing x-wavvon-signature" }, { status: 401 });

  const message = deleteMessage("identity", keyParam(identity.pubkey), identity.listed_at);
  if (!(await verifyListingSignature(message, sig, identity.pubkey))) {
    return Response.json({ error: "Invalid signature" }, { status: 403 });
  }

  deleteIdentity(identity.pubkey);
  return Response.json({ ok: true });
}
