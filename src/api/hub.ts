import { getHub, deleteHub } from "@/lib/db";
import { verifySignature } from "@/lib/verify";
import { deleteMessage } from "@/lib/signed-listing";
import { readHubSubmission, validateAndUpsert } from "./hubs";

interface Ctx { params: Promise<{ pubkey: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { pubkey } = await params;
  const hub = getHub(pubkey);
  if (!hub) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(hub);
}

export async function PUT(req: Request, { params }: Ctx) {
  const { pubkey } = await params;
  if (!getHub(pubkey)) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await readHubSubmission(req);
  if (body instanceof Response) return body;

  if (body.hub_pubkey !== pubkey) {
    return Response.json({ error: "hub_pubkey mismatch" }, { status: 400 });
  }

  const err = await validateAndUpsert(body);
  if (err) return err;

  return Response.json(getHub(pubkey));
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { pubkey } = await params;
  const hub = getHub(pubkey);
  if (!hub) return Response.json({ error: "Not found" }, { status: 404 });

  let body: { hub_pubkey: string; signature: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.hub_pubkey !== pubkey) {
    return Response.json({ error: "hub_pubkey mismatch" }, { status: 400 });
  }

  // The signature by the listed key is the whole proof. Asking the hub's
  // /info as well added nothing to it and meant a hub that was down, or gone
  // for good, could never be delisted.
  //
  // Any payload the hub ever signed used to pass here, a listing among them.
  const valid = await verifySignature(pubkey, body.signature, deleteMessage("hub", pubkey, hub.listed_at));
  if (!valid) return Response.json({ error: "Invalid signature" }, { status: 403 });

  deleteHub(pubkey);
  return new Response(null, { status: 204 });
}
