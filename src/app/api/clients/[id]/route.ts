import { NextRequest, NextResponse } from "next/server";
import { deleteClient, getClient } from "@/lib/clients-db";
import { verifyListingSignature } from "@/lib/signed-listing";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClient(id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

/**
 * Removal is proved, not asserted: the caller signs the id with the same key
 * that published the listing. Nobody else can take a client down — this
 * directory included.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClient(id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sig = req.headers.get("x-wavvon-signature");
  if (!sig) return NextResponse.json({ error: "Missing x-wavvon-signature" }, { status: 401 });

  if (!(await verifyListingSignature(id, sig, client.author_pubkey))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  deleteClient(id);
  return NextResponse.json({ ok: true });
}
