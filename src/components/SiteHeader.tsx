"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "./Mark";

const NAV = [
  { href: "/hubs", label: "Hubs" },
  { href: "/clients", label: "Clients" },
  { href: "/providers", label: "Providers" },
  { href: "/docs", label: "Docs" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="flex h-[68px] items-center gap-9 border-b border-border px-12 max-sm:px-6">
      <Link href="/" className="flex items-center gap-[11px]">
        <Mark />
        <span className="font-mono text-[18px] font-bold tracking-[0.5px] text-text">wavvon</span>
      </Link>

      <nav className="ml-auto flex items-center gap-7 text-sm font-medium max-sm:gap-4 max-sm:text-[13px]">
        {NAV.map(({ href, label }) => {
          // `/hubs/<pubkey>` should still light up `Hubs`.
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
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
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
