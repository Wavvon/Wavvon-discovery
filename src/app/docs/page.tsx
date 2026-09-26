import Link from "next/link";
import type { Metadata } from "next";
import { API_REFERENCE, DOC_SECTIONS, START_HERE } from "@/lib/docs";
import { PageIntro, SectionLabel } from "@/components/ui";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Every design decision, protocol detail and operational procedure — the same documents the project works from.",
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  using: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  operating: (
    <>
      <rect x="3.5" y="4.5" width="17" height="6" rx="1.8" />
      <rect x="3.5" y="13.5" width="17" height="6" rx="1.8" />
      <path d="M7 7.5v.2M7 16.5v.2" />
    </>
  ),
  building: <path d="m9 8-5 4 5 4M15 8l5 4-5 4" />,
  reference: (
    <>
      <path d="M5.5 4.5h9l4 4v11a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1z" />
      <path d="M14 4.5v4.5h4.5" />
    </>
  ),
};

/** Libraries do not exist yet. The row marks the spot and states the plan. */
const LIBRARIES = [
  "Rust — identity, envelopes, wire format",
  "TypeScript — the same, for clients and apps",
];

export default function DocsPage() {
  return (
    <>
      <PageIntro title="Docs">
        Every design decision, protocol detail and operational procedure, written down. The same
        documents the project works from — not a marketing rewrite of them.
      </PageIntro>

      <section className="px-12 pt-12">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-[18px]">
          <SectionLabel>Start here</SectionLabel>
          <div className="grid grid-cols-3 gap-[18px] max-md:grid-cols-1">
            {START_HERE.map((entry, i) => (
              <Link
                key={entry.slug}
                href={`/docs/${entry.slug}`}
                className={`flex flex-col gap-3 rounded-[14px] border bg-bg-elevated p-6 transition-colors hover:border-border-strong ${
                  i === 0 ? "border-accent-border" : "border-border"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    i === 0 ? "bg-accent-sunken" : "bg-surface"
                  }`}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={i === 0 ? "var(--accent)" : "var(--text-muted)"}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h13M12.5 5.5 19 12l-6.5 6.5" />
                  </svg>
                </span>
                <span className="text-lg font-semibold tracking-[-0.3px] text-text">{entry.title}</span>
                <span className="text-sm leading-relaxed text-text-muted">{entry.blurb}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="flex-1 px-12 pt-12 pb-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-5 max-lg:grid-cols-1">
          {DOC_SECTIONS.map((section) => (
            <div
              key={section.id}
              className="flex flex-col rounded-[14px] border border-border bg-bg-elevated px-7 py-6"
            >
              <div className="flex items-center gap-3 pb-3.5">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {SECTION_ICONS[section.id]}
                </svg>
                <h2 className="text-[19px] font-semibold tracking-[-0.3px]">{section.title}</h2>
              </div>

              {section.id === "building" ? (
                <a
                  href={API_REFERENCE.href}
                  rel="noreferrer"
                  className="flex items-baseline gap-2.5 border-t border-border-hairline py-2.5 text-sm text-text-dim hover:text-text"
                >
                  {API_REFERENCE.title}
                  <span className="ml-auto font-mono text-[11px] text-text-ghost">
                    {API_REFERENCE.filename}
                  </span>
                </a>
              ) : null}

              {section.entries.map((entry) => (
                <Link
                  key={entry.slug}
                  href={`/docs/${entry.slug}`}
                  className="flex items-baseline gap-2.5 border-t border-border-hairline py-2.5 text-sm text-text-dim hover:text-text"
                >
                  {entry.title}
                  <span className="ml-auto font-mono text-[11px] text-text-ghost">{entry.slug}</span>
                </Link>
              ))}

              {section.id === "building" ? (
                <>
                  <div className="flex items-center gap-2.5 pt-[18px] pb-2.5">
                    <span className="font-mono text-[11px] font-medium tracking-[1.3px] text-text-faint uppercase">
                      Libraries
                    </span>
                    <span className="h-px flex-1 bg-border-hairline" />
                  </div>
                  {LIBRARIES.map((label) => (
                    <div key={label} className="flex items-baseline gap-2.5 py-2.5">
                      <span className="text-sm text-text-faint">{label}</span>
                      <span className="ml-auto rounded-full border border-border px-2 py-0.5 font-mono text-[10px] tracking-[0.6px] text-text-faint uppercase">
                        soon
                      </span>
                    </div>
                  ))}
                  <p className="pt-2 text-xs leading-relaxed text-text-faint">
                    They will live on crates.io and npm. This page will link to them rather than mirror
                    a registry that already exists.
                  </p>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
