import { NextRequest, NextResponse } from "next/server";
import { listOtherThemes, upsertOtherTheme, validateOtherThemeDoc } from "@/lib/themes-db";
import { verifyListingSignature } from "@/lib/signed-listing";
import type { RegisterClientPayload } from "@/lib/types";

function pageOf(req: NextRequest): number {
  const raw = Number(req.nextUrl.searchParams.get("page") ?? 1);
  return Number.isFinite(raw) ? Math.min(Math.max(1, Math.floor(raw)), 1000) : 1;
}

/** Themes for other clients: listed, never inspected (themes.md §5). */
export async function GET(req: NextRequest) {
  return NextResponse.json(
    listOtherThemes({ q: req.nextUrl.searchParams.get("q")?.slice(0, 100) || undefined, page: pageOf(req) }),
  );
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
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "payload is not valid JSON" }, { status: 400 });
  }
  const problem = validateOtherThemeDoc(doc, Buffer.byteLength(payload, "utf8"));
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (!(await verifyListingSignature(payload, sig, String(doc.author_pubkey)))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }
  return NextResponse.json({ ok: true, id: upsertOtherTheme(doc) }, { status: 201 });
}
