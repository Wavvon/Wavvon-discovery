import { listIdentities, registerIdentity } from "@/lib/identities-db";
import { normalizeIdentityKey, validateIdentity } from "@/lib/identity";
import { verifyListingSignature } from "@/lib/signed-listing";
import type { IdentityDoc, RegisterClientPayload } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const identities = listIdentities({
    q: searchParams.get("q")?.slice(0, 100) ?? undefined,
    kind: searchParams.getAll("kind").map((k) => k.slice(0, 20)),
    tag: searchParams.getAll("tag").map((t) => t.slice(0, 40)),
    language: searchParams.getAll("language").map((l) => l.slice(0, 20)),
  });
  return Response.json({ identities, total: identities.length });
}

export async function POST(req: Request) {
  let body: RegisterClientPayload;
  try {
    body = (await req.json()) as RegisterClientPayload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { payload, sig } = body;
  if (typeof payload !== "string" || typeof sig !== "string") {
    return Response.json({ error: "Missing payload or sig" }, { status: 400 });
  }

  let doc: IdentityDoc;
  try {
    doc = JSON.parse(payload) as IdentityDoc;
  } catch {
    return Response.json({ error: "payload is not valid JSON" }, { status: 400 });
  }

  const problem = validateIdentity(doc, Buffer.byteLength(payload, "utf8"));
  if (problem) return Response.json({ error: problem }, { status: 400 });

  if (!(await verifyListingSignature(payload, sig, doc.pubkey))) {
    return Response.json({ error: "Invalid signature" }, { status: 403 });
  }

  const pubkey = normalizeIdentityKey(doc.pubkey)!;
  if (!registerIdentity(pubkey, doc, payload)) {
    return Response.json({ error: "A listing for this key at least as new was already published or removed" }, { status: 409 });
  }
  return Response.json({ ok: true, pubkey }, { status: 201 });
}
