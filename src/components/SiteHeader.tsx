import { Mark } from "./Mark";

const NAV = [
  { href: "/hubs", label: "Hubs" },
  { href: "/clients", label: "Clients" },
  { href: "/themes", label: "Themes" },
  { href: "/languages", label: "Languages" },
  { href: "/identities", label: "Identities" },
  { href: "/providers", label: "Providers" },
  { href: "/docs", label: "Docs" },
] as const;

export function SiteHeader({ pathname }: { pathname: string }) {
  return (
    <header className="flex h-[68px] items-center gap-9 border-b border-border px-12 max-sm:px-6">
      <a href="/" className="flex items-center gap-[11px]">
        <Mark />
        <span className="font-mono text-[18px] font-bold tracking-[0.5px] text-text">wavvon</span>
      </a>

      <nav className="ml-auto flex items-center gap-7 text-sm font-medium max-sm:gap-4 max-sm:text-[13px]">
        {NAV.map(({ href, label }) => {
          // `/hubs/<pubkey>` should still light up `Hubs`.
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <a
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "border-b-2 border-accent pb-[3px] text-text"
                  : "text-text-dim transition-colors hover:text-text"
              }
            >
              {label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}
