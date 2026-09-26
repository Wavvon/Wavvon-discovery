import Link from "next/link";
import { Mark } from "./Mark";
import { DOCS, GITHUB } from "@/lib/links";

const COLUMNS = [
  {
    title: "Project",
    links: [
      { label: "About", href: DOCS.readme },
      { label: "Architecture", href: DOCS.architecture },
      { label: "Comparison", href: DOCS.comparison },
      { label: "Roadmap", href: DOCS.roadmap },
    ],
  },
  {
    title: "Directory",
    links: [
      { label: "Hubs", href: "/hubs" },
      { label: "Clients", href: "/clients" },
      { label: "Providers", href: "/providers" },
      { label: "Run your own directory", href: GITHUB.discovery },
    ],
  },
  {
    title: "Build",
    links: [
      { label: "Protocol spec", href: DOCS.openapi },
      { label: "Write a client", href: DOCS.client },
      { label: "Write an app", href: DOCS.apps },
      { label: "Wire format", href: DOCS.wireFormat },
    ],
  },
  {
    title: "Operate",
    links: [
      { label: "Operator guide", href: DOCS.operatorGuide },
      { label: "Hub scaling", href: DOCS.hubScaling },
      { label: "Security policy", href: GITHUB.security },
      { label: "Source on GitHub", href: GITHUB.org },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-bg-sunken px-12 pt-14 pb-8">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-11">
        <div className="grid grid-cols-[1.6fr_repeat(4,minmax(0,1fr))] gap-8 max-lg:grid-cols-2 max-sm:grid-cols-1">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <Mark size={22} />
              <span className="font-mono text-base font-bold tracking-[0.5px] text-text">wavvon</span>
            </div>
            <p className="max-w-[260px] text-[13px] leading-relaxed text-text-faint">
              Built for players. Owned by no one.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <span className="font-mono text-[11px] font-medium tracking-[1.4px] text-text-faint uppercase">
                {column.title}
              </span>
              {column.links.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="text-sm text-text-muted transition-colors hover:text-text"
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-6 border-t border-border pt-7 max-sm:flex-col max-sm:items-start max-sm:gap-2">
          <span className="font-mono text-xs text-text-ghost">AGPL-3.0</span>
          <span className="font-mono text-xs text-text-ghost sm:ml-auto">
            This directory is optional. Wavvon works without it.
          </span>
        </div>
      </div>
    </footer>
  );
}
