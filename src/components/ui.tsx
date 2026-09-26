import Link from "next/link";
import type { ReactNode } from "react";

/** Page title band under the header. */
export function PageIntro({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="border-b border-border px-12 pt-14 pb-10">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
        <h1 className="text-[46px] leading-[1.08] font-bold tracking-[-1.6px] max-sm:text-4xl">
          {title}
        </h1>
        {children ? (
          <p className="max-w-[780px] text-[17px] leading-relaxed text-text-muted text-pretty">
            {children}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[11px] font-medium tracking-[1.6px] text-text-faint uppercase">
      {children}
    </span>
  );
}

/** Square initials block, standing in for an icon the listing did not supply. */
export function Avatar({
  name,
  icon,
  size = 46,
  accent = false,
}: {
  name: string;
  /** Whatever the listing published — an absolute URL or a data URI. */
  icon?: string | null;
  size?: number;
  accent?: boolean;
}) {
  if (icon) {
    return (
      // Supplied by a stranger and served from their host, so it stays a plain
      // img: no optimizer allowlist to maintain, and no referrer leaked.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-[13px] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-[13px] font-mono font-bold ${
        accent ? "bg-accent-sunken text-accent" : "bg-surface text-text-muted"
      }`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.37) }}
    >
      {initials || "?"}
    </span>
  );
}

export function Tag({ label, href }: { label: string; href?: string }) {
  const className =
    "rounded-full border border-border bg-surface px-2.5 py-[3px] font-mono text-[11px] text-text-muted";
  return href ? (
    <Link href={href} className={`${className} transition-colors hover:border-border-strong hover:text-text`}>
      {label}
    </Link>
  ) : (
    <span className={className}>{label}</span>
  );
}

export function Chip({ label, tone = "muted" }: { label: string; tone?: "muted" | "accent" }) {
  return (
    <span
      className={`rounded border px-2 py-[3px] font-mono text-[10px] tracking-[0.7px] uppercase ${
        tone === "accent"
          ? "border-accent-border bg-transparent text-accent"
          : "border-border bg-surface text-text-muted"
      }`}
    >
      {label}
    </span>
  );
}

export function PillLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold px-6 py-3.5";
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? `${base} bg-accent text-accent-text transition-colors hover:bg-accent-hover hover:text-accent-text`
          : `${base} border border-border-strong font-medium text-text transition-colors hover:border-text-muted hover:text-text`
      }
    >
      {children}
    </Link>
  );
}

export function Note({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning";
}) {
  const warning = tone === "warning";
  return (
    <div
      className={`flex items-start gap-3.5 rounded-xl border p-5 ${
        warning ? "border-warning-border bg-warning-bg" : "border-border bg-bg-sunken"
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={warning ? "var(--warning)" : "var(--text-faint)"}
        strokeWidth={warning ? 2 : 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0"
        aria-hidden="true"
      >
        {warning ? (
          <>
            <path d="M12 4.5 2.8 20h18.4z" />
            <path d="M12 10v4M12 17.2v.2" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 16v-5M12 8.2v.2" />
          </>
        )}
      </svg>
      <div className={`text-sm leading-relaxed text-pretty ${warning ? "text-[#d8c9a6]" : "text-text-muted"}`}>
        {children}
      </div>
    </div>
  );
}

export function VerifiedBadge({ label = "Signature verified" }: { label?: string }) {
  return (
    <span className="flex items-center gap-2 rounded border border-success-border bg-success-bg px-2.5 py-2">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--success)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
        aria-hidden="true"
      >
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
      <span className="font-mono text-[11px] text-success">{label}</span>
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border-strong bg-bg-elevated p-8">
      <span className="font-mono text-[32px] leading-none font-medium text-text-ghost">0</span>
      <p className="text-sm leading-relaxed text-text-muted">{title}</p>
      {children}
    </div>
  );
}

/** Key/value row used down the right-hand column of every detail page. */
export function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="font-mono text-[11px] tracking-[0.6px] text-text-faint uppercase">{label}</span>
      <span className="text-right font-mono text-[11px] text-text-muted">{children}</span>
    </div>
  );
}
