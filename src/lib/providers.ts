import raw from "@/data/providers.json";

/* Hosting providers — companies that will run a hub for you.
 *
 * A curated list of websites, not a registry. Nobody publishes into it: there
 * is no table, no API and no signature, because there is nothing here that a
 * stranger writes. Adding an entry is a pull request against
 * `src/data/providers.json`, which is also how somebody running their own
 * directory curates a different list.
 *
 * That is a deliberate difference from hubs and clients, which *are*
 * self-published and signed. Those are things in the network describing
 * themselves; this is an editorial page about businesses. */

export interface Provider {
  name: string;
  /** The page a reader lands on. Also the entry's identity — one per site. */
  url: string;
  description: string;
  /** Free text, kept short: "from €5/month", "pay what you want". */
  pricing?: string;
  freeTier?: boolean;
  /** Rough locations they host in, for somebody who cares where data sits. */
  regions?: string[];
}

/** Anything wrong with an entry, as a message — or null if it is fine. */
export function validateProvider(value: unknown, index: number): string | null {
  if (typeof value !== "object" || value === null) return `entry ${index} is not an object`;
  const p = value as Partial<Provider>;
  if (typeof p.name !== "string" || p.name.trim() === "") return `entry ${index} has no name`;
  if (typeof p.url !== "string" || !/^https:\/\//.test(p.url)) {
    return `${p.name ?? index}: url must be an https:// address`;
  }
  if (typeof p.description !== "string" || p.description.trim() === "") {
    return `${p.name}: description is required`;
  }
  if (p.regions !== undefined && !Array.isArray(p.regions)) return `${p.name}: regions must be a list`;
  return null;
}

/**
 * The list, in the order the file gives.
 *
 * A malformed entry is dropped rather than allowed to break the page — the
 * file is edited by hand, and a typo in one row should not take the other
 * rows down with it.
 */
export function listProviders(opts: { freeTier?: boolean } = {}): Provider[] {
  const entries = (raw as unknown[]).filter((entry, i) => validateProvider(entry, i) === null) as Provider[];
  return opts.freeTier ? entries.filter((p) => p.freeTier) : entries;
}

export function countProviders(): number {
  return listProviders().length;
}

export function countFreeTier(): number {
  return listProviders({ freeTier: true }).length;
}
