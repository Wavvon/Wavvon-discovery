import Link from "next/link";
import type { Metadata } from "next";
import { clientFacetCounts, countClients, listClients } from "@/lib/clients-db";
import {
  CLIENT_PLATFORMS,
  FEATURE_LABELS,
  FILTERABLE_FEATURES,
  PLATFORM_LABELS,
  languageName,
  type ClientPlatform,
} from "@/lib/facets";
import { DOCS } from "@/lib/links";
import { Avatar, Chip, EmptyState, PageIntro } from "@/components/ui";
import {
  ClosedFacet,
  hasAnyFilter,
  OpenFacet,
  type Params,
  RailLayout,
  ResetFilters,
  SearchBox,
} from "@/components/Facets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clients",
  description:
    "Anything that speaks the protocol is a client, and the protocol is documented — so anyone can write one.",
};

const BASE = "/clients";
const FILTER_KEYS = ["q", "platform", "language", "feature", "publisher"];

function one(params: Params, key: string): string | undefined {
  const raw = params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

function many(params: Params, key: string): string[] {
  const raw = params[key];
  return raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
}

function LanguageLine({ tags }: { tags: string[] }) {
  return (
    <div className="flex items-center gap-2 border-t border-border-hairline pt-2.5">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-faint)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
        aria-hidden="true"
      >
        <path d="M4 6.5h9M8.5 6.5V4.5M10.6 6.5c0 3.6-2.6 6.4-6 7.6M6 9.6c.9 2 2.6 3.4 4.8 4.1" />
        <path d="m13 19.5 3.4-8 3.4 8M14.2 17h5.2" />
      </svg>
      <span className="font-mono text-[11px] text-text-muted">
        {tags.length === 1
          ? `${tags[0].toUpperCase()} only`
          : tags.map((t) => t.toUpperCase()).join(" · ")}
      </span>
    </div>
  );
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const publisher = many(params, "publisher");
  const official = publisher.length === 1 ? publisher[0] === "official" : undefined;

  const clients = listClients({
    q: one(params, "q"),
    platform: many(params, "platform"),
    language: many(params, "language"),
    feature: many(params, "feature"),
    official,
  });

  const total = countClients();
  const platformCounts = clientFacetCounts("platforms");
  const languageCounts = clientFacetCounts("languages");
  const featureCounts = clientFacetCounts("features");
  const officialCount = listClients({ official: true }).length;
  const filtered = hasAnyFilter(params, FILTER_KEYS);

  const countOf = (rows: Array<{ value: string; count: number }>, value: string) =>
    rows.find((r) => r.value === value)?.count ?? 0;

  return (
    <>
      <PageIntro title="Clients">
        A client is anything that speaks the protocol, and the protocol is plain HTTP and WebSocket — so
        anyone can write one, in any language, with whatever taste they have. These are the ones people
        published. Your key and your hubs come with you whichever you pick.
      </PageIntro>

      <RailLayout
        rail={
          <>
            <SearchBox
              name="q"
              placeholder="Search clients"
              defaultValue={one(params, "q")}
              hidden={params}
            />

            <ClosedFacet
              title="Platform"
              first
              options={CLIENT_PLATFORMS.map((p: ClientPlatform) => ({
                value: p,
                label: PLATFORM_LABELS[p],
                count: countOf(platformCounts, p),
              }))}
              paramKey="platform"
              basePath={BASE}
              params={params}
            />

            <OpenFacet
              title="Interface language"
              options={languageCounts.map((l) => ({
                value: l.value,
                label: languageName(l.value),
                count: l.count,
              }))}
              paramKey="language"
              basePath={BASE}
              params={params}
              filterPlaceholder="Filter languages"
              showAll={one(params, "language_all") === "1"}
              note="This list is whatever the clients declare, so it grows on its own. Each one is translated by whoever maintains it — none covers every language, ours included."
            />

            <ClosedFacet
              title="Supports"
              options={FILTERABLE_FEATURES.map((f) => ({
                value: f,
                label: FEATURE_LABELS[f],
                count: countOf(featureCounts, f),
              }))}
              paramKey="feature"
              basePath={BASE}
              params={params}
            />

            <ClosedFacet
              title="Published by"
              options={[
                { value: "official", label: "The Wavvon project", count: officialCount },
                { value: "community", label: "Everyone else", count: total - officialCount },
              ]}
              paramKey="publisher"
              basePath={BASE}
              params={params}
            />

            {filtered ? <ResetFilters href={BASE} /> : null}
          </>
        }
      >
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-[13px] text-text">{clients.length}</span>
          <span className="text-[13px] text-text-faint">
            {filtered ? `of ${total} clients match` : clients.length === 1 ? "client" : "clients"}
          </span>
          {filtered ? (
            <Link href={BASE} className="ml-auto font-mono text-xs">
              show all &rarr;
            </Link>
          ) : null}
        </div>

        {clients.length === 0 ? (
          <EmptyState
            title={
              filtered
                ? "No clients match those filters."
                : "No client has been listed yet. The official web client ships with every hub either way."
            }
          >
            <Link href={filtered ? BASE : DOCS.openapi} className="font-mono text-xs">
              {filtered ? "clear filters →" : "read the protocol spec →"}
            </Link>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-3 gap-[18px] max-xl:grid-cols-2 max-md:grid-cols-1">
            {clients.map((client) => (
              <article
                key={client.id}
                className="flex flex-col gap-3.5 rounded-[14px] border border-border bg-bg-elevated p-[22px] transition-colors hover:border-border-strong"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={client.name} accent={client.official} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-base font-semibold text-text hover:text-accent"
                    >
                      {client.name}
                    </Link>
                    <span
                      className={`font-mono text-[10px] tracking-[0.7px] uppercase ${
                        client.official ? "text-accent" : "text-text-faint"
                      }`}
                    >
                      {client.official ? "official" : client.maintainer || "community"}
                    </span>
                  </div>
                </div>

                <p className="line-clamp-3 text-sm leading-relaxed text-text-muted">{client.tagline}</p>

                <div className="mt-auto flex flex-wrap gap-1.5">
                  {client.platforms.map((platform) => (
                    <Chip key={platform} label={platform} />
                  ))}
                </div>

                {client.languages.length > 0 ? <LanguageLine tags={client.languages} /> : null}
              </article>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-6 rounded-[14px] border border-border bg-bg-sunken px-6 py-6 max-sm:flex-col max-sm:items-start">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-semibold tracking-[-0.3px]">Written one?</h2>
            <p className="max-w-[460px] text-sm leading-relaxed text-text-muted">
              Listings are signed with your own key, the way hubs publish themselves. Nobody approves
              it, and only your key can change or remove it.
            </p>
          </div>
          <Link
            href={DOCS.hubDiscovery}
            className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover hover:text-accent-text sm:ml-auto"
          >
            List your client
          </Link>
        </div>
      </RailLayout>
    </>
  );
}
