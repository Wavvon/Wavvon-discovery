import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/clients-db";
import { isPublicHttpsUrl } from "@/lib/identity";
import { fetchCapped } from "@/lib/scrape";

const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;
// No SVG: served from this origin, it would be a document of the publisher's.
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

interface Ctx { params: Promise<{ id: string; index: string }> }

/**
 * A client listing's screenshot, fetched from the maintainer's host and
 * re-served, so that host sees this site instead of every visitor. Only URLs
 * a signed listing names are fetched: this is not an open proxy.
 */
// ponytail: fetched per request, relying on Cache-Control downstream; store the bytes if traffic warrants.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id, index } = await params;
  const src = getClient(id)?.doc.screenshots?.[Number(index)];
  if (!/^[0-7]$/.test(index) || typeof src !== "string" || !isPublicHttpsUrl(src)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let image;
  try {
    image = await fetchCapped(src, MAX_SCREENSHOT_BYTES, { accept: "image/*" });
  } catch {
    return NextResponse.json({ error: "Screenshot unavailable" }, { status: 502 });
  }
  const type = image.type?.split(";")[0].trim().toLowerCase() ?? "";
  if (!IMAGE_TYPES.has(type)) {
    return NextResponse.json({ error: "Screenshot unavailable" }, { status: 502 });
  }
  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
}
