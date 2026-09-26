import { NextRequest, NextResponse } from "next/server";
import { listClients, registerClient } from "@/lib/clients-db";
import { contentId, verifyListingSignature } from "@/lib/signed-listing";
import { isClientFeature, isClientPlatform } from "@/lib/facets";
import type { ClientDoc, RegisterClientPayload } from "@/lib/types";

const MAX_PAYLOAD_BYTES = 32768;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const officialParam = searchParams.get("official");
  const clients = listClients({
    q: searchParams.get("q")?.slice(0, 100) ?? undefined,
    platform: searchParams.getAll("platform").map((p) => p.slice(0, 20)),
    language: searchParams.getAll("language").map((l) => l.slice(0, 20)),
    feature: searchParams.getAll("feature").map((f) => f.slice(0, 40)),
    official: officialParam === null ? undefined : officialParam === "true",
  });
  return NextResponse.json({ clients, total: clients.length });
}

/** Anything wrong with the document, as a message — or null if it is fine. */
function validate(doc: unknown, payloadBytes: number): string | null {
  if (payloadBytes > MAX_PAYLOAD_BYTES) return "payload must be 32 KB or smaller";
  if (typeof doc !== "object" || doc === null) return "payload is not an object";

  const d = doc as Partial<ClientDoc>;
  if (d.format !== "wavvon.client") return "Invalid format field";
  if (d.version !== 1) return "Unsupported version";
  if (typeof d.name !== "string" || d.name.trim() === "" || d.name.length > 48) {
    return "Invalid name (must be 1–48 characters)";
  }
  if (typeof d.author_pubkey !== "string" || d.author_pubkey.trim() === "") {
    return "Missing author_pubkey";
  }
  if (typeof d.tagline !== "string" || d.tagline.length > 160) {
    return "Invalid tagline (160 characters or fewer)";
  }
  if (typeof d.description !== "string" || d.description.length > 8000) {
    return "Invalid description (8000 characters or fewer)";
  }
  if (!Array.isArray(d.platforms) || d.platforms.length === 0) {
    return "platforms must list at least one platform";
  }
  // Platforms are a closed set: a listing cannot widen it by declaring a new
  // one, or the filter rail stops meaning anything.
  const badPlatform = d.platforms.find((p) => typeof p !== "string" || !isClientPlatform(p));
  if (badPlatform !== undefined) return `Unknown platform: ${String(badPlatform)}`;

  if (!Array.isArray(d.languages) || d.languages.length === 0) {
    return "languages must list at least one BCP-47 tag";
  }
  // Languages are open — anyone may add one — so this only rejects shapes
  // that would break the facet, not tags we have not seen before.
  const badLanguage = d.languages.find(
    (l) => typeof l !== "string" || !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(l)
  );
  if (badLanguage !== undefined) return `Malformed language tag: ${String(badLanguage)}`;

  if (typeof d.features !== "object" || d.features === null) return "features must be an object";
  for (const [key, value] of Object.entries(d.features)) {
    if (!isClientFeature(key)) return `Unknown feature: ${key}`;
    const support = (value as { support?: unknown })?.support;
    if (support !== "full" && support !== "partial" && support !== "none") {
      return `Invalid support value for ${key}`;
    }
  }
  if (d.screenshots && (!Array.isArray(d.screenshots) || d.screenshots.length > 8)) {
    return "screenshots must be a list of at most 8 URLs";
  }
  return null;
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

  let doc: ClientDoc;
  try {
    doc = JSON.parse(payload) as ClientDoc;
  } catch {
    return NextResponse.json({ error: "payload is not valid JSON" }, { status: 400 });
  }

  const problem = validate(doc, Buffer.byteLength(payload, "utf8"));
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (!(await verifyListingSignature(payload, sig, doc.author_pubkey))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // `official` is ours to decide, never the publisher's.
  const id = contentId(payload);
  registerClient({ id, doc: { ...doc, official: false }, payload });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
