import { NextRequest, NextResponse } from "next/server";
import { getSkin, deleteSkin } from "@/lib/db";
import { verifyListingSignature, deleteMessage } from "@/lib/signed-listing";

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const skin = getSkin(id);
  if (!skin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(skin);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const skin = getSkin(id);
  if (!skin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { author_pubkey: string; sig: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.author_pubkey !== "string" || typeof body.sig !== "string") {
    return NextResponse.json({ error: "Missing author_pubkey or sig" }, { status: 400 });
  }

  if (skin.author_pubkey !== body.author_pubkey) {
    return NextResponse.json({ error: "author_pubkey does not match" }, { status: 403 });
  }

  const valid = await verifyListingSignature(deleteMessage("skin", id, skin.listed_at), body.sig, skin.author_pubkey);
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 403 });

  deleteSkin(id);
  return new NextResponse(null, { status: 204 });
}
