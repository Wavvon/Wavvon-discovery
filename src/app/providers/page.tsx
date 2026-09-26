import Link from "next/link";
import type { Metadata } from "next";
import { countFreeTier, countProviders, listProviders } from "@/lib/providers";
import { DOCS, GITHUB } from "@/lib/links";
import { Avatar, Note, PageIntro } from "@/components/ui";
import { ClosedFacet, hasAnyFilter, type Params, RailLayout, ResetFilters } from "@/components/Facets";

export const metadata: Metadata = {
  title: "Hosting providers",
  description: "Companies that will run a Wavvon hub for you, if you would rather not run a server.",
};

const BASE = "/providers";

export default async function ProvidersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const raw = params.offer;
  const offer = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];

  const providers = listProviders({ freeTier: offer.includes("free") });
  const total = countProviders();
  const filtered = hasAnyFilter(params, ["offer"]);

  return (
    <>
      <PageIntro title="Hosting providers">
        Running a hub means running a server, and not everybody wants to. These companies will run one
        for you. They are other people&rsquo;s businesses making their own offer — this directory does
        not vet them, take a cut, or stand behind anything they promise.
      </PageIntro>

      <RailLayout
        rail={
          <>
            <ClosedFacet
              title="Offer"
              first
              options={[{ value: "free", label: "Has a free tier", count: countFreeTier() }]}
              paramKey="offer"
              basePath={BASE}
              params={params}
            />
            {filtered ? <ResetFilters href={BASE} /> : null}

            <div className="flex flex-col gap-2.5 border-t border-border pt-[22px]">
              <span className="font-mono text-[11px] font-medium tracking-[1.4px] text-text-faint uppercase">
                How this list works
              </span>
              <p className="text-xs leading-relaxed text-text-faint">
                Unlike hubs and clients, nobody publishes into this page. It is a file in the
                directory&rsquo;s own repository, edited by hand — so running your own directory means
                curating your own list.
              </p>
              <a href={`${GITHUB.discovery}/blob/develop/src/data/providers.json`} rel="noreferrer" className="font-mono text-xs">
                suggest a provider &rarr;
              </a>
            </div>
          </>
        }
      >
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-[13px] text-text">{providers.length}</span>
          <span className="text-[13px] text-text-faint">
            {filtered ? `of ${total} providers match` : providers.length === 1 ? "provider" : "providers"}
          </span>
          {filtered ? (
            <Link href={BASE} className="ml-auto font-mono text-xs">
              show all &rarr;
            </Link>
          ) : null}
        </div>

        {providers.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border-strong bg-bg-elevated p-8">
            <span className="font-mono text-[32px] leading-none font-medium text-text-ghost">0</span>
            <p className="max-w-[560px] text-sm leading-relaxed text-text-muted">
              {filtered
                ? "No provider on this list has a free tier."
                : "Nobody is offering Wavvon hosting yet. Until somebody does, running a hub yourself is one container and a PostgreSQL database — the operator guide walks it end to end."}
            </p>
            <Link href={filtered ? BASE : DOCS.operatorGuide} className="font-mono text-xs">
              {filtered ? "clear filter →" : "read the operator guide →"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-[18px] max-md:grid-cols-1">
            {providers.map((provider) => (
              <article
                key={provider.url}
                className="flex flex-col gap-3.5 rounded-[14px] border border-border bg-bg-elevated p-[22px] transition-colors hover:border-border-strong"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={provider.name} />
                  <a
                    href={provider.url}
                    rel="noreferrer nofollow"
                    className="min-w-0 text-base font-semibold text-text hover:text-accent"
                  >
                    {provider.name}
                  </a>
                  {provider.freeTier ? (
                    <span className="ml-auto shrink-0 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 font-mono text-[10px] tracking-[0.6px] text-success uppercase">
                      free tier
                    </span>
                  ) : null}
                </div>

                <p className="text-sm leading-relaxed text-text-muted">{provider.description}</p>

                {provider.pricing || provider.regions?.length ? (
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-text-faint">
                    {provider.pricing ? <span>{provider.pricing}</span> : null}
                    {provider.pricing && provider.regions?.length ? (
                      <span className="h-[3px] w-[3px] rounded-full bg-border" />
                    ) : null}
                    {provider.regions?.length ? <span>{provider.regions.join(" · ")}</span> : null}
                  </div>
                ) : null}

                <a
                  href={provider.url}
                  rel="noreferrer nofollow"
                  className="mt-auto pt-1 font-mono text-xs"
                >
                  visit &rarr;
                </a>
              </article>
            ))}
          </div>
        )}

        <Note>
          A hosted hub is still your hub — the same software, the same keys, and the same right to move
          it somewhere else. What you are paying for is somebody else running the server. Read what a
          provider says about backups and about what happens when you leave, because nobody here checks
          either.
        </Note>

        <div className="mt-1 flex items-center gap-6 rounded-[14px] border border-border bg-bg-sunken px-6 py-6 max-sm:flex-col max-sm:items-start">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-semibold tracking-[-0.3px]">Rather run it yourself?</h2>
            <p className="max-w-[480px] text-sm leading-relaxed text-text-muted">
              One container and a PostgreSQL database. <span className="font-mono">wavvon-hub setup</span>{" "}
              writes the compose file and the password for you, on your own machine.
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
