import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { clientsByAuthor, getClient } from "@/lib/clients-db";
import { CLIENT_FEATURES, FEATURE_LABELS, languageName, type ClientFeature } from "@/lib/facets";
import { GITHUB } from "@/lib/links";
import { Avatar, Chip, MetaRow, SectionLabel, VerifiedBadge } from "@/components/ui";
import type { FeatureSupport } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const client = getClient(id);
  if (!client) return { title: "Client not found" };
  return { title: client.name, description: client.tagline };
}

function SupportMark({ support }: { support: FeatureSupport }) {
  if (support === "full") {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--success)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
        aria-label="supported"
      >
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    );
  }
  if (support === "partial") {
    return (
      <span className="flex w-[15px] shrink-0 justify-center" aria-label="partly supported">
        <span className="h-0.5 w-[11px] rounded bg-warning" />
      </span>
    );
  }
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--text-ghost)"
      strokeWidth="2.4"
      strokeLinecap="round"
      className="shrink-0"
      aria-label="not supported"
    >
      <path d="m7 7 10 10M17 7 7 17" />
    </svg>
  );
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = getClient(id);
  if (!client) notFound();

  const { doc } = client;
  const siblings = clientsByAuthor(client.author_pubkey, client.id);
  const declared = CLIENT_FEATURES.filter((f) => doc.features?.[f]);
  const reportUrl = `${GITHUB.discovery}/issues/new?title=${encodeURIComponent(
    `Broken listing: ${client.name}`
  )}&body=${encodeURIComponent(`Client: ${client.name}\nListing id: ${client.id}\n\nWhat is wrong:\n`)}`;

  return (
    <>
      <section className="px-12 pt-7">
        <div className="mx-auto flex max-w-[1200px] items-center gap-2 font-mono text-xs text-text-faint">
          <Link href="/clients" className="text-text-muted">
            clients
          </Link>
          <span>/</span>
          <span>{client.name}</span>
        </div>
      </section>

      <section className="border-b border-border px-12 pt-7 pb-9">
        <div className="mx-auto flex max-w-[1200px] items-start gap-[22px] max-sm:flex-col">
          <Avatar name={client.name} size={84} accent={client.official} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3.5">
              <h1 className="text-[38px] leading-[1.1] font-bold tracking-[-1.1px] max-sm:text-3xl">
                {client.name}
              </h1>
              <Chip
                label={client.official ? "official client" : "community client"}
                tone={client.official ? "accent" : "muted"}
              />
            </div>
            <p className="max-w-[640px] text-[17px] leading-relaxed text-text-muted text-pretty">
              {client.tagline}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {client.platforms.map((platform) => (
                <Chip key={platform} label={platform} />
              ))}
              <span className="mx-1.5 h-[3px] w-[3px] rounded-full bg-border" />
              <span className="font-mono text-[11px] text-text-faint">
                {[doc.built_with, doc.license, client.languages.map((l) => l.toUpperCase()).join(", ")]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex-1 px-12 pt-10 pb-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)_320px] items-start gap-10 max-lg:grid-cols-1">
          <div className="flex flex-col gap-8">
            {doc.screenshots && doc.screenshots.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline gap-3">
                  <SectionLabel>Screenshots</SectionLabel>
                  <span className="font-mono text-[11px] text-text-ghost">
                    supplied by the maintainer
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  {doc.screenshots.slice(0, 4).map((src, i) => (
                    // Hosted by the maintainer, not by us — plain img, lazy, no referrer.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt={`${client.name} screenshot ${i + 1}`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full rounded-xl border border-border"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <SectionLabel>About</SectionLabel>
              {doc.description.split(/\n{2,}/).map((paragraph, i) => (
                <p key={i} className="text-[15px] leading-[1.7] text-text-muted text-pretty">
                  {paragraph}
                </p>
              ))}
            </div>

            {declared.length > 0 ? (
              <div className="flex flex-col gap-3">
                <SectionLabel>What it supports</SectionLabel>
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="grid grid-cols-2 max-sm:grid-cols-1">
                    {declared.map((feature: ClientFeature) => {
                      const entry = doc.features[feature];
                      return (
                        <div
                          key={feature}
                          className="flex items-center gap-3.5 border-b border-border px-5 py-3.5 odd:border-r"
                        >
                          <SupportMark support={entry.support} />
                          <span
                            className={`text-sm ${
                              entry.support === "none" ? "text-text-faint" : "text-text"
                            }`}
                          >
                            {FEATURE_LABELS[feature]}
                          </span>
                          {entry.note ? (
                            <span className="ml-auto font-mono text-[11px] text-warning">
                              {entry.note}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed text-text-faint">
                  Declared by the maintainer in the listing, not tested by this directory. If something
                  here is wrong, report it.
                </p>
              </div>
            ) : null}
          </div>

          <aside className="flex flex-col gap-4">
            {doc.downloads && doc.downloads.length > 0 ? (
              <div className="flex flex-col gap-2.5 rounded-xl border border-accent-border bg-bg-elevated p-5">
                <SectionLabel>Get it</SectionLabel>
                {doc.downloads.map((download, i) => (
                  <a
                    key={download.url}
                    href={download.url}
                    rel="noreferrer nofollow"
                    className={`flex items-center justify-between gap-2 rounded-full px-4 py-2.5 text-[13px] ${
                      i === 0
                        ? "bg-accent font-semibold text-accent-text hover:bg-accent-hover hover:text-accent-text"
                        : "border border-border-strong font-medium text-text hover:border-text-muted hover:text-text"
                    }`}
                  >
                    {download.platform}
                    <span className="font-mono text-[11px] opacity-70">{download.label}</span>
                  </a>
                ))}
                <p className="pt-0.5 text-xs leading-relaxed text-text-faint">
                  Downloads come from the maintainer&rsquo;s own release page. This directory does not
                  host or scan binaries.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-bg-elevated p-5">
              <SectionLabel>Maintained by</SectionLabel>
              <div className="flex items-center gap-3">
                <Avatar name={doc.maintainer || "?"} size={40} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-semibold">{doc.maintainer || "Unnamed"}</span>
                  {doc.homepage_url ? (
                    <a href={doc.homepage_url} rel="noreferrer nofollow" className="font-mono text-[11px]">
                      {doc.homepage_url.replace(/^https?:\/\//, "")}
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] tracking-[0.6px] text-text-faint uppercase">
                  Signing key
                </span>
                <span className="font-mono text-[11px] leading-relaxed break-all text-text-muted">
                  {client.author_pubkey}
                </span>
              </div>
              <VerifiedBadge label="Listing signature verified" />
              <p className="text-xs leading-relaxed text-text-faint">
                The key is the identity. It proves the same person published every version of this
                listing — not who they are.
              </p>
              {siblings.length > 0 ? (
                <Link
                  href={`/clients?q=${encodeURIComponent(doc.maintainer)}`}
                  className="flex items-center justify-center rounded border border-border py-2.5 text-xs font-medium text-text-muted hover:border-border-strong hover:text-text"
                >
                  {siblings.length} more by this key
                </Link>
              ) : null}
            </div>

            {client.languages.length > 0 ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-bg-elevated p-5">
                <SectionLabel>Interface language</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {client.languages.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border-strong bg-surface px-2.5 py-[3px] font-mono text-[11px] text-text"
                    >
                      {languageName(tag)}
                    </span>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-text-faint">
                  Each client is translated by whoever maintains it, so coverage differs from one to the
                  next.
                </p>
                {doc.source_url ? (
                  <a href={doc.source_url} rel="noreferrer nofollow" className="font-mono text-xs">
                    contribute a translation &rarr;
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 rounded-xl border border-border bg-bg-elevated p-5">
              <SectionLabel>Project</SectionLabel>
              {doc.source_url ? (
                <MetaRow label="Source">
                  <a href={doc.source_url} rel="noreferrer nofollow">
                    repository &rarr;
                  </a>
                </MetaRow>
              ) : null}
              {doc.license ? <MetaRow label="Licence">{doc.license}</MetaRow> : null}
              {doc.built_with ? <MetaRow label="Built with">{doc.built_with}</MetaRow> : null}
              {doc.latest_version ? (
                <MetaRow label="Latest">
                  {doc.latest_version}
                  {doc.released_at ? ` · ${doc.released_at.slice(0, 10)}` : ""}
                </MetaRow>
              ) : null}
              <MetaRow label="Listed">{client.listed_at.slice(0, 10)}</MetaRow>
            </div>

            <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-bg-elevated p-5">
              <p className="text-xs leading-relaxed text-text-faint">
                This directory did not build, review or audit this client. Treat it like any other
                program you install.
              </p>
              <a
                href={reportUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center rounded border border-border py-2.5 text-xs font-medium text-text-muted hover:border-border-strong hover:text-text"
              >
                Report a broken listing
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
