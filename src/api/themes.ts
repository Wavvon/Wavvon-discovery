import { listThemes, upsertTheme, validateThemeDoc } from "@/lib/themes-db";
import { verifyListingSignature } from "@/lib/signed-listing";
import type { RegisterClientPayload } from "@/lib/types";

function pageOf(req: Request): number {
  const raw = Number(new URL(req.url).searchParams.get("page") ?? 1);
  return Number.isFinite(raw) ? Math.min(Math.max(1, Math.floor(raw)), 1000) : 1;
}

/** The contract the official client's theme picker reads (themes.md §5). */
export async function GET(req: Request) {
  return Response.json(
    listThemes({ q: new URL(req.url).searchParams.get("q")?.slice(0, 100) || undefined, page: pageOf(req) }),
  );
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
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "payload is not valid JSON" }, { status: 400 });
  }
  const problem = validateThemeDoc(doc, Buffer.byteLength(payload, "utf8"));
  if (problem) return Response.json({ error: problem }, { status: 400 });
  if (!(await verifyListingSignature(payload, sig, String(doc.author_pubkey)))) {
    return Response.json({ error: "Invalid signature" }, { status: 403 });
  }
  return Response.json({ ok: true, id: upsertTheme(doc, payload) }, { status: 201 });
}
