import Link from "next/link";
import type { Metadata } from "next";
import { hubAccessCounts, hubLanguageCounts, hubTagCounts, listHubs } from "@/lib/db";
import { languageName } from "@/lib/facets";
import { deepLink, DOCS, keyParam } from "@/lib/links";
import { Avatar, EmptyState, PageIntro, Tag } from "@/components/ui";
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
  title: "Hubs",
  description: "Communities that chose to be listed. Every entry is signed by the hub itself.",
};

const BASE = "/hubs";
const FILTER_KEYS = ["q", "tag", "language", "access"];

function one(params: Params, key: string): string | undefined {
  const raw = params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

function many(params: Params, key: string): string[] {
  const raw = params[key];
  return raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
}

export default async function HubsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const access = many(params, "access");
  // Both boxes ticked says the same thing as neither.
  const inviteOnly =
    access.length === 1 ? access[0] === "invite" : undefined;

  const { hubs, total } = listHubs({
    q: one(params, "q"),
    tag: many(params, "tag"),
    language: many(params, "language"),
    inviteOnly,
  });

  const allHubs = listHubs({}).total;
  const tagCounts = hubTagCounts();
  const languageCounts = hubLanguageCounts();
  const accessCounts = hubAccessCounts();
  const filtered = hasAnyFilter(params, FILTER_KEYS);

  return (
    <>
      <PageIntro title="Hubs">
        Communities that chose to be listed. Each entry was published and signed by the hub itself, and
        can be pulled by it at any time. Plenty of hubs are not here at all — being listed is optional,
        and so is this page.
      </PageIntro>

      <RailLayout
        rail={
          <>
            <SearchBox name="q" placeholder="Search hubs" defaultValue={one(params, "q")} hidden={params} />

            <OpenFacet
              title="Tag"
              first
              options={tagCounts.map((t) => ({ value: t.value, label: t.value, count: t.count }))}
              paramKey="tag"
              basePath={BASE}
              params={params}
              filterPlaceholder="Filter tags"
              showAll={one(params, "tag_all") === "1"}
            />

            <OpenFacet
              title="Language"
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
              note="Whatever the listed hubs speak. The list is not a menu we curate — it grows as hubs arrive."
            />

            <ClosedFacet
              title="Getting in"
              options={[
                { value: "open", label: "Open to anyone", count: accessCounts.open },
                { value: "invite", label: "Invite only", count: accessCounts.invite },
              ]}
              paramKey="access"
              basePath={BASE}
              params={params}
            />

            {filtered ? <ResetFilters href={BASE} /> : null}
          </>
        }
      >
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-[13px] text-text">{total}</span>
          <span className="text-[13px] text-text-faint">
            {filtered ? `of ${allHubs} hubs match` : total === 1 ? "hub listed" : "hubs listed"}
          </span>
          {filtered ? (
            <Link href={BASE} className="ml-auto font-mono text-xs">
              show all &rarr;
            </Link>
          ) : null}
        </div>

        {hubs.length === 0 ? (
          <EmptyState
            title={
              filtered
                ? "No hubs match those filters yet."
                : "Nobody has listed a hub here yet. Hubs publish themselves, so this fills up on its own."
            }
          >
            <Link href={filtered ? BASE : DOCS.operatorGuide} className="font-mono text-xs">
              {filtered ? "clear filters →" : "run your own hub →"}
            </Link>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-3 gap-[18px] max-xl:grid-cols-2 max-md:grid-cols-1">
            {hubs.map((hub) => (
              <article
                key={hub.hub_pubkey}
                className="flex flex-col gap-3.5 rounded-[14px] border border-border bg-bg-elevated p-[22px] transition-colors hover:border-border-strong"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={hub.name} icon={hub.icon} accent />
                  <Link
                    href={`/hubs/${keyParam(hub.hub_pubkey)}`}
                    className="min-w-0 text-base font-semibold text-text hover:text-accent"
                  >
                    {hub.name}
                  </Link>
                  {hub.invite_only ? (
                    <span
                      title="Invite only"
                      className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--text-muted)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="4" y="10.5" width="16" height="10" rx="2" />
                        <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
                      </svg>
                    </span>
                  ) : null}
                </div>

                <p className="line-clamp-3 text-sm leading-relaxed text-text-muted">
                  {hub.bio || hub.description || "No description supplied."}
                </p>

                {hub.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {hub.tags.slice(0, 3).map((tag) => (
                      <Tag key={tag} label={tag} href={`${BASE}?tag=${encodeURIComponent(tag)}`} />
                    ))}
                  </div>
                ) : null}

                <a
                  href={deepLink(hub.hub_url, hub.invite_code)}
                  className="mt-auto pt-1 font-mono text-xs"
                >
                  open in wavvon &rarr;
                </a>
              </article>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-6 rounded-[14px] border border-border bg-bg-sunken px-6 py-6 max-sm:flex-col max-sm:items-start">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-semibold tracking-[-0.3px]">Nothing here fits?</h2>
            <p className="max-w-[480px] text-sm leading-relaxed text-text-muted">
              A hub is one container and a database. Run your own and it works whether or not it ever
              appears on this page.
            </p>
          </div>
          <Link
            href={DOCS.operatorGuide}
            className="shrink-0 rounded-full border border-border-strong px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-text-muted hover:text-text sm:ml-auto"
          >
            Operator guide
          </Link>
        </div>
      </RailLayout>
    </>
  );
}
