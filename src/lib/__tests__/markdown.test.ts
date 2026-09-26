import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../markdown";

describe("renderMarkdown", () => {
  it("lifts the leading H1 out of the body", () => {
    const { title, html } = renderMarkdown("# Getting started\n\nSome prose.\n");
    expect(title).toBe("Getting started");
    // The page prints the title itself; leaving it here would show it twice.
    expect(html).not.toContain("<h1");
    expect(html).toContain("Some prose.");
  });

  it("collects H2s as anchored headings", () => {
    const { headings, html } = renderMarkdown(
      "# Doc\n\n## First section\n\ntext\n\n### Deeper\n\n## Second section\n"
    );
    expect(headings).toEqual([
      { id: "first-section", text: "First section" },
      { id: "second-section", text: "Second section" },
    ]);
    expect(html).toContain('id="first-section"');
    // H3s get an id so they can be linked, but stay out of the page rail.
    expect(html).toContain('id="deeper"');
  });

  it("does not let a source document inject markup", () => {
    const { html } = renderMarkdown('Hello <script>alert("x")</script> there.\n');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("keeps duplicate headings addressable", () => {
    const { headings } = renderMarkdown("## Notes\n\n## Notes\n");
    expect(headings.map((h) => h.id)).toEqual(["notes", "notes-1"]);
  });

  it("falls back to a numbered id when a heading has no word characters", () => {
    const { headings } = renderMarkdown("## ???\n");
    expect(headings[0].id).toBe("section-1");
  });
});
