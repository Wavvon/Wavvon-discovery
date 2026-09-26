import Link from "next/link";

/* Filter rails, rendered on the server.
 *
 * Every checkbox is a link that toggles one search param, and every search box
 * is a plain GET form. No client component, no state to hydrate, and the
 * filtered view is a real URL somebody can send to somebody else. */

export type Params = Record<string, string | string[] | undefined>;

function paramValues(params: Params, key: string): string[] {
  const raw = params[key];
  if (raw === undefined) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export function isSelected(params: Params, key: string, value: string): boolean {
  return paramValues(params, key).includes(value);
}

/** The current URL with `value` added to, or removed from, `key`. */
export function toggleHref(basePath: string, params: Params, key: string, value: string): string {
  const search = new URLSearchParams();
  for (const [k, raw] of Object.entries(params)) {
    if (raw === undefined) continue;
    for (const v of Array.isArray(raw) ? raw : [raw]) {
      if (k === key && v === value) continue;
      search.append(k, v);
    }
  }
  if (!isSelected(params, key, value)) search.append(key, value);
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function hasAnyFilter(params: Params, keys: string[]): boolean {
  return keys.some((key) => paramValues(params, key).length > 0);
}

function CheckBox({ checked }: { checked: boolean }) {
  return checked ? (
    <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[5px] bg-accent">
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent-text)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    </span>
  ) : (
    <span className="h-[17px] w-[17px] shrink-0 rounded-[5px] border border-border-strong" />
  );
}

export interface FacetOption {
  value: string;
  label: string;
  count?: number;
}

function OptionRow({
  option,
  checked,
  href,
}: {
  option: FacetOption;
  checked: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      aria-pressed={checked}
      className="flex items-center gap-2.5 text-sm text-text-dim transition-colors hover:text-text"
    >
      <CheckBox checked={checked} />
      <span className={checked ? "text-text" : undefined}>{option.label}</span>
      {option.count !== undefined ? (
        <span className="ml-auto font-mono text-xs text-text-faint">{option.count}</span>
      ) : null}
    </Link>
  );
}

export function SearchBox({
  name,
  placeholder,
  defaultValue,
  hidden = {},
  size = "md",
}: {
  name: string;
  placeholder: string;
  defaultValue?: string;
  /** Params to carry across the submit, so searching does not clear filters. */
  hidden?: Params;
  size?: "sm" | "md";
}) {
  const small = size === "sm";
  return (
    <form
      role="search"
      className={`flex items-center gap-2.5 rounded-lg border border-border bg-bg-sunken px-3 ${
        small ? "h-[34px]" : "h-[42px]"
      }`}
    >
      {Object.entries(hidden).flatMap(([key, raw]) =>
        raw === undefined || key === name
          ? []
          : (Array.isArray(raw) ? raw : [raw]).map((v, i) => (
              <input key={`${key}-${i}`} type="hidden" name={key} value={v} />
            ))
      )}
      <svg
        width={small ? 14 : 16}
        height={small ? 14 : 16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-faint)"
        strokeWidth="2"
        strokeLinecap="round"
        className="shrink-0"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.6-3.6" />
      </svg>
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`w-full border-0 bg-transparent text-text placeholder:text-text-faint focus-visible:shadow-none ${
          small ? "text-[13px]" : "text-sm"
        }`}
      />
    </form>
  );
}

/**
 * A facet over a set we define — platforms, features. Every option is always
 * shown, because the list cannot grow behind our back.
 */
export function ClosedFacet({
  title,
  options,
  paramKey,
  basePath,
  params,
  first = false,
}: {
  title: string;
  options: FacetOption[];
  paramKey: string;
  basePath: string;
  params: Params;
  first?: boolean;
}) {
  if (options.length === 0) return null;
  return (
    <div
      className={`flex flex-col gap-3 ${first ? "" : "border-t border-border pt-[22px]"}`}
    >
      <span className="font-mono text-[11px] font-medium tracking-[1.4px] text-text-faint uppercase">
        {title}
      </span>
      {options.map((option) => (
        <OptionRow
          key={option.value}
          option={option}
          checked={isSelected(params, paramKey, option.value)}
          href={toggleHref(basePath, params, paramKey, option.value)}
        />
      ))}
    </div>
  );
}

const OPEN_FACET_VISIBLE = 6;

/**
 * A facet over a set publishers grow — tags, interface languages. Shows the
 * whole size, the selection as removable chips, a filter box and the most
 * common values, with the rest behind an expander. Works the same at four
 * entries and at four hundred.
 */
export function OpenFacet({
  title,
  options,
  paramKey,
  basePath,
  params,
  filterPlaceholder,
  note,
  showAll = false,
  first = false,
}: {
  title: string;
  options: FacetOption[];
  paramKey: string;
  basePath: string;
  params: Params;
  filterPlaceholder: string;
  note?: string;
  showAll?: boolean;
  first?: boolean;
}) {
  const selected = paramValues(params, paramKey);
  const filter = (params[`${paramKey}_q`] as string | undefined)?.toLowerCase();

  const matching = filter
    ? options.filter((o) => o.label.toLowerCase().includes(filter) || o.value.includes(filter))
    : options;
  // A selected value stays reachable even when the filter text hides it.
  const unselected = matching.filter((o) => !selected.includes(o.value));
  const visible = showAll || filter ? unselected : unselected.slice(0, OPEN_FACET_VISIBLE);
  const hiddenCount = unselected.length - visible.length;

  return (
    <div className={`flex flex-col gap-3 ${first ? "" : "border-t border-border pt-[22px]"}`}>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[11px] font-medium tracking-[1.4px] text-text-faint uppercase">
          {title}
        </span>
        <span className="ml-auto font-mono text-[11px] text-text-ghost">{options.length}</span>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => {
            const label = options.find((o) => o.value === value)?.label ?? value;
            return (
              <Link
                key={value}
                href={toggleHref(basePath, params, paramKey, value)}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent py-[3px] pr-[5px] pl-2.5 text-accent-text hover:text-accent-text"
                aria-label={`Remove ${label}`}
              >
                <span className="font-mono text-[11px] font-semibold">{label}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent-text)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="m7 7 10 10M17 7 7 17" />
                </svg>
              </Link>
            );
          })}
        </div>
      ) : null}

      <SearchBox
        name={`${paramKey}_q`}
        placeholder={filterPlaceholder}
        defaultValue={filter}
        hidden={params}
        size="sm"
      />

      <div className="flex flex-col gap-3">
        {visible.map((option) => (
          <OptionRow
            key={option.value}
            option={option}
            checked={false}
            href={toggleHref(basePath, params, paramKey, option.value)}
          />
        ))}
        {visible.length === 0 ? (
          <span className="text-[13px] text-text-faint">Nothing matches that.</span>
        ) : null}
      </div>

      {hiddenCount > 0 ? (
        <Link
          href={toggleHref(basePath, params, `${paramKey}_all`, "1")}
          className="font-mono text-xs text-text-muted hover:text-text"
        >
          show all {options.length} &rarr;
        </Link>
      ) : null}

      {note ? <p className="text-xs leading-relaxed text-text-faint">{note}</p> : null}
    </div>
  );
}

export function ResetFilters({ href }: { href: string }) {
  return (
    <Link href={href} className="font-mono text-xs text-text-muted hover:text-text">
      reset filters
    </Link>
  );
}

/** The two-column body every ecosystem page shares. */
export function RailLayout({
  rail,
  children,
}: {
  rail: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex-1 px-12 pt-10 pb-20">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[250px_minmax(0,1fr)] items-start gap-12 max-lg:grid-cols-1 max-lg:gap-8">
        <aside className="flex flex-col gap-6">{rail}</aside>
        <div className="flex flex-col gap-5">{children}</div>
      </div>
    </section>
  );
}
