import { DOC_RAW, GITHUB } from "./links";

/* The documentation lives in Wavvon-docs, not here.
 *
 * This registry is the allowlist that makes rendering it safe: a slug maps to
 * one known path in that repo, so `/docs/<anything>` can never be talked into
 * fetching an arbitrary file. Adding a page means adding a line — which is the
 * point, because an index nobody curates is a list of broken links. */

export interface DocEntry {
  slug: string;
  title: string;
  /** Path inside the Wavvon-docs repo. */
  path: string;
  blurb?: string;
}

export interface DocSection {
  id: string;
  title: string;
  entries: DocEntry[];
}

const d = (slug: string, title: string, path = `docs/${slug}.md`): DocEntry => ({ slug, title, path });

export const DOC_SECTIONS: DocSection[] = [
  {
    id: "using",
    title: "Using Wavvon",
    entries: [
      d("getting-started", "Getting started"),
      d("client", "The client, room by room"),
      d("browser-client", "Running it in a browser"),
      d("identity-recovery", "Recovering a lost identity"),
      d("data-export", "Exporting your data"),
      d("custom-themes", "Themes and skins"),
      d("accessibility", "Accessibility"),
    ],
  },
  {
    id: "operating",
    title: "Running a hub",
    entries: [
      d("hub-operator-guide", "Hub operator guide"),
      d("hosting", "Where to host it"),
      d("hub-operations", "Day-to-day operations"),
      d("hub-scaling", "Scaling past one box"),
      d("hub-admin-panel", "The admin panel"),
      d("federation", "Federation"),
      d("alliances", "Alliances between hubs"),
    ],
  },
  {
    id: "building",
    title: "Building on it",
    entries: [
      d("ws-protocol", "WebSocket protocol"),
      d("wire-format", "Wire format and signed envelopes"),
      d("apps", "Writing an app"),
      d("gaming", "The sandboxed game SDK"),
      d("hub-discovery", "Running your own directory"),
    ],
  },
  {
    id: "reference",
    title: "Reference",
    entries: [
      d("data-model", "Data model"),
      d("e2e-encryption", "End-to-end encryption"),
      d("decisions", "Design decisions, newest first"),
      d("shipped-log", "What shipped, and when"),
      d("roadmap", "Roadmap", "ROADMAP.md"),
      d("glossary", "Glossary"),
    ],
  },
];

/** Pages worth putting in front of somebody who has just arrived. */
export const START_HERE: DocEntry[] = [
  { slug: "getting-started", title: "Getting started", path: "docs/getting-started.md", blurb: "Create an identity, join a hub, find your way around." },
  { slug: "architecture", title: "Architecture", path: "docs/architecture.md", blurb: "How a hub, a client and federation fit together, and why it is shaped this way." },
  { slug: "comparison", title: "Comparison", path: "COMPARISON.md", blurb: "Where Wavvon stands against the closed alternatives, including what it still lacks." },
];

/* The API reference is YAML, not prose — it belongs on the index as a link
 * out, never as a page this renderer tries to format. */
export const API_REFERENCE = {
  title: "HTTP API reference",
  filename: "openapi.yaml",
  href: `${GITHUB.docs}/blob/main/openapi.yaml`,
};

const BY_SLUG = new Map<string, DocEntry>(
  [...DOC_SECTIONS.flatMap((s) => s.entries), ...START_HERE].map((entry) => [entry.slug, entry])
);

export function getDocEntry(slug: string): DocEntry | undefined {
  return BY_SLUG.get(slug);
}

export function allDocSlugs(): string[] {
  return [...BY_SLUG.keys()];
}

/** The section a page sits in, for the breadcrumb and the sidebar. */
export function sectionOf(slug: string): DocSection | undefined {
  return DOC_SECTIONS.find((section) => section.entries.some((e) => e.slug === slug));
}

/** Previous and next within the flattened reading order. */
export function neighbours(slug: string): { prev?: DocEntry; next?: DocEntry } {
  const flat = DOC_SECTIONS.flatMap((s) => s.entries);
  const i = flat.findIndex((e) => e.slug === slug);
  if (i === -1) return {};
  return { prev: flat[i - 1], next: flat[i + 1] };
}

export function rawUrl(entry: DocEntry): string {
  return `${DOC_RAW}/${entry.path}`;
}

export function editUrl(entry: DocEntry): string {
  return `${GITHUB.docs}/edit/main/${entry.path}`;
}

/**
 * Fetch the markdown source. Returns null when the docs repo cannot be
 * reached — the page then says so and points at GitHub, rather than
 * pretending the document does not exist.
 */
export async function fetchDoc(entry: DocEntry): Promise<string | null> {
  try {
    const res = await fetch(rawUrl(entry), { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
