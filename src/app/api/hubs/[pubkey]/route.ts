import { NextRequest, NextResponse } from "next/server";
import { getHub, deleteHub } from "@/lib/db";
import { verifySignature } from "@/lib/verify";
import { fetchHubInfo } from "@/lib/scrape";
import { validateAndUpsert } from "../route";
import type { SubmitPayload } from "@/lib/types";

interface Ctx { params: Promise<{ pubkey: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { pubkey } = await params;
  const hub = getHub(pubkey);
  if (!hub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(hub);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { pubkey } = await params;
  if (!getHub(pubkey)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: SubmitPayload;
  try {
    body = await req.json() as SubmitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.hub_pubkey !== pubkey) {
    return NextResponse.json({ error: "hub_pubkey mismatch" }, { status: 400 });
  }

  const err = await validateAndUpsert(body);
  if (err) return err;

  return NextResponse.json(getHub(pubkey));
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { pubkey } = await params;
  if (!getHub(pubkey)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { canonical_payload: string; hub_pubkey: string; signature: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.hub_pubkey !== pubkey) {
    return NextResponse.json({ error: "hub_pubkey mismatch" }, { status: 400 });
  }

  // Verify ownership before deleting
  let info;
  try { info = await fetchHubInfo(getHub(pubkey)!.hub_url); } catch {
    return NextResponse.json({ error: "Cannot reach hub to verify ownership" }, { status: 400 });
  }
  if (info.public_key !== pubkey) {
    return NextResponse.json({ error: "hub_pubkey does not match /info" }, { status: 403 });
  }
  const valid = await verifySignature(pubkey, body.signature, body.canonical_payload);
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 403 });

  deleteHub(pubkey);
  return new NextResponse(null, { status: 204 });
}
