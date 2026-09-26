import MarkdownIt from "markdown-it";

/* Markdown from the docs repo, rendered.
 *
 * `html: false` is the whole security posture: raw HTML in a source document
 * is escaped rather than passed through, so nothing in Wavvon-docs can inject
 * markup into this site even by accident. */
const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

export interface Heading {
  id: string;
  text: string;
}

export interface RenderedDoc {
  html: string;
  /** Second-level headings, in order — the "on this page" rail. */
  headings: Heading[];
  /** The document's own H1, if it opened with one. */
  title?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export function renderMarkdown(source: string): RenderedDoc {
  const tokens = md.parse(source, {});
  const headings: Heading[] = [];
  let title: string | undefined;
  const used = new Set<string>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== "heading_open") continue;
    const text = tokens[i + 1]?.content ?? "";

    if (token.tag === "h1" && title === undefined) {
      title = text;
      // The page prints the title in its own hero; leaving it in the body
      // would show it twice.
      tokens.splice(i, 3);
      i--;
      continue;
    }

    let id = slugify(text) || `section-${headings.length + 1}`;
    while (used.has(id)) id = `${id}-1`;
    used.add(id);
    token.attrSet("id", id);

    if (token.tag === "h2") headings.push({ id, text });
  }

  return { html: md.renderer.render(tokens, md.options, {}), headings, title };
}
