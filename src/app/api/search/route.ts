import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface SearchResult {
  type: string;
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string | null;
  tags: string[];
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 100);
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const VALID_TYPES = new Set(["hubs", "clients"]);
  const rawTypes = req.nextUrl.searchParams.get("types")?.split(",") ?? ["hubs", "clients"];
  const types = rawTypes.filter((t) => VALID_TYPES.has(t));
  const db = getDb();
  const pattern = `%${q}%`;
  const results: SearchResult[] = [];

  if (types.includes("hubs")) {
    const rows = db.prepare(
      "SELECT hub_pubkey as id, name, bio as description, hub_url as url, icon, tags FROM hubs WHERE name LIKE ? OR bio LIKE ? OR tags LIKE ? LIMIT 5"
    ).all(pattern, pattern, pattern) as { id: string; name: string; description: string | null; url: string; icon: string | null; tags: string }[];
    results.push(...rows.map((r) => ({
      type: "hub",
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      url: r.url,
      icon: r.icon,
      tags: tryParseJson(r.tags),
    })));
  }

  if (types.includes("clients")) {
    const rows = db.prepare(
      "SELECT id, name, tagline, maintainer FROM clients WHERE name LIKE ? OR tagline LIKE ? LIMIT 5"
    ).all(pattern, pattern) as { id: string; name: string; tagline: string; maintainer: string }[];
    results.push(...rows.map((r) => ({
      type: "client",
      id: r.id,
      name: r.name,
      description: r.tagline,
      url: `/clients/${r.id}`,
      icon: null,
      tags: r.maintainer ? [r.maintainer] : [],
    })));
  }

  return NextResponse.json({ results });
}

function tryParseJson(s: string): string[] {
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
