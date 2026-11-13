import Link from "next/link";
import type { Metadata } from "next";
import { countIdentities, identityFacetCounts, listIdentities } from "@/lib/identities-db";
import { languageName } from "@/lib/facets";
import { DOCS, keyParam } from "@/lib/links";
import { Avatar, Chip, EmptyState, Note, PageIntro } from "@/components/ui";
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
  title: "Identities",
  description:
    "People open to invitations and programs asking to be added to hubs. Each listing is signed by the key it names.",
};

const BASE = "/identities";
const FILTER_KEYS = ["q", "kind", "tag", "language"];

function one(params: Params, key: string): string | undefined {
  const raw = params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

function many(params: Params, key: string): string[] {
  const raw = params[key];
  return raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
}

export default async function IdentitiesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;

  const identities = listIdentities({
    q: one(params, "q"),
    kind: many(params, "kind"),
    tag: many(params, "tag"),
    language: many(params, "language"),
  });

  const total = countIdentities();
  const tagCounts = identityFacetCounts("tags");
  const languageCounts = identityFacetCounts("languages");
  const filtered = hasAnyFilter(params, FILTER_KEYS);

  return (
    <>
      <PageIntro title="Identities">
        An identity here asked to be found and invited: a person open to joining communities, or a program
        that wants to be added to hubs. Each listing carries a way to reach its author, and the invite
        itself still comes from a hub.
      </PageIntro>

      <RailLayout
        rail={
          <>
            <SearchBox
              name="q"
              placeholder="Search name and tagline"
              defaultValue={one(params, "q")}
              hidden={params}
            />

            <ClosedFacet
              title="Kind"
              first
              options={[
                { value: "person", label: "Person", count: countIdentities("person") },
                { value: "program", label: "Program", count: countIdentities("program") },
              ]}
              paramKey="kind"
              basePath={BASE}
              params={params}
            />

            <OpenFacet
              title="Tags"
              options={tagCounts.map((t) => ({ value: t.value, label: t.value, count: t.count }))}
              paramKey="tag"
              basePath={BASE}
              params={params}
              filterPlaceholder="Filter tags"
              showAll={one(params, "tag_all") === "1"}
              note="Whatever the authors chose to call themselves."
            />

            <OpenFacet
              title="Languages"
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
            />

            {filtered ? <ResetFilters href={BASE} /> : null}
          </>
        }
      >
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-[13px] text-text">{identities.length}</span>
          <span className="text-[13px] text-text-faint">
            {filtered
              ? `of ${total} identities match`
              : identities.length === 1
                ? "identity"
                : "identities"}
          </span>
          {filtered ? (
            <Link href={BASE} className="ml-auto font-mono text-xs">
              show all &rarr;
            </Link>
          ) : null}
        </div>

        {identities.length === 0 ? (
          <EmptyState
            title={filtered ? "No identities match those filters." : "Nobody has listed themselves yet."}
          >
            {filtered ? (
              <Link href={BASE} className="font-mono text-xs">
                clear filters &rarr;
              </Link>
            ) : null}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-3 gap-[18px] max-xl:grid-cols-2 max-md:grid-cols-1">
            {identities.map((identity) => (
              <article
                key={identity.pubkey}
                className="flex flex-col gap-3.5 rounded-[14px] border border-border bg-bg-elevated p-[22px] transition-colors hover:border-border-strong"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={identity.name} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={`${BASE}/${keyParam(identity.pubkey)}`}
                      className="text-base font-semibold text-text hover:text-accent"
                    >
                      {identity.name}
                    </Link>
                    <span className="font-mono text-[10px] tracking-[0.7px] text-text-faint uppercase">
                      {identity.kind}
                    </span>
                  </div>
                </div>

                <p className="line-clamp-3 text-sm leading-relaxed text-text-muted">{identity.tagline}</p>

                {identity.tags.length > 0 ? (
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    {identity.tags.map((tag) => (
                      <Chip key={tag} label={tag} />
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-5 rounded-[14px] border border-border bg-bg-sunken px-6 py-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-semibold tracking-[-0.3px]">List yourself</h2>
            <p className="max-w-[560px] text-sm leading-relaxed text-text-muted">
              Listings are signed with your own key. Nobody approves one, and only your key can change or
              remove it. Before you publish, know three things.
            </p>
          </div>
          <Note tone="warning">
            <ul className="flex list-disc flex-col gap-2 pl-4">
              <li>
                The listing is public. Your public key was already public; the description beside it is
                new, and anyone can keep a record of the pair.
              </li>
              <li>
                Removing it removes it here only. Mirrors, caches and screenshots are not ours to recall.
              </li>
              <li>
                Naming a home hub tells the world where your messages land, and the designation list on
                that hub is public, so one URL discloses the whole signed list. The alternative is an
                endpoint instead.
              </li>
            </ul>
          </Note>
          <Link
            href={DOCS.inviteDirectory}
            className="shrink-0 self-start rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover hover:text-accent-text"
          >
            How to list yourself
          </Link>
        </div>
      </RailLayout>
    </>
  );
}
