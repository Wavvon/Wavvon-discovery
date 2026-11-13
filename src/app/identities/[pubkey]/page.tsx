import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getIdentity } from "@/lib/identities-db";
import { languageName } from "@/lib/facets";
import { Avatar, Chip, MetaRow, SectionLabel, VerifiedBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}): Promise<Metadata> {
  const { pubkey } = await params;
  const identity = getIdentity(pubkey);
  if (!identity) return { title: "Identity not found" };
  return { title: identity.name, description: identity.tagline };
}

export default async function IdentityDetailPage({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}) {
  const { pubkey } = await params;
  const identity = getIdentity(pubkey);
  if (!identity) notFound();

  const { doc } = identity;
  const commands = doc.app?.commands ?? [];

  return (
    <>
      <section className="px-12 pt-7">
        <div className="mx-auto flex max-w-[1200px] items-center gap-2 font-mono text-xs text-text-faint">
          <Link href="/identities" className="text-text-muted">
            identities
          </Link>
          <span>/</span>
          <span>{identity.name}</span>
        </div>
      </section>

      <section className="border-b border-border px-12 pt-7 pb-9">
        <div className="mx-auto flex max-w-[1200px] items-start gap-[22px] max-sm:flex-col">
          <Avatar name={identity.name} size={84} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3.5">
              <h1 className="text-[38px] leading-[1.1] font-bold tracking-[-1.1px] max-sm:text-3xl">
                {identity.name}
              </h1>
              <Chip label={identity.kind} />
            </div>
            <p className="max-w-[640px] text-[17px] leading-relaxed text-text-muted text-pretty">
              {identity.tagline}
            </p>
            {identity.tags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {identity.tags.map((tag) => (
                  <Chip key={tag} label={tag} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="flex-1 px-12 pt-10 pb-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)_320px] items-start gap-10 max-lg:grid-cols-1">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <SectionLabel>About</SectionLabel>
              {doc.description.split(/\n{2,}/).map((paragraph, i) => (
                <p key={i} className="text-[15px] leading-[1.7] text-text-muted text-pretty">
                  {paragraph}
                </p>
              ))}
            </div>

            {commands.length > 0 ? (
              <div className="flex flex-col gap-3">
                <SectionLabel>Commands</SectionLabel>
                <div className="overflow-hidden rounded-xl border border-border">
                  {commands.map((command) => (
                    <div
                      key={command.name}
                      className="flex items-baseline gap-3.5 border-b border-border px-5 py-3.5 last:border-b-0"
                    >
                      <span className="font-mono text-sm text-text">/{command.name}</span>
                      <span className="text-sm text-text-muted">{command.description}</span>
                    </div>
                  ))}
                </div>
                {doc.app?.mini_app ? (
                  <span className="font-mono text-[11px] text-text-faint">also offers a mini app</span>
                ) : null}
              </div>
            ) : null}
          </div>

          <aside className="flex flex-col gap-4">
            <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-bg-elevated p-5">
              <SectionLabel>Reach</SectionLabel>
              {doc.contact.home_hub ? (
                <MetaRow label="Home hub">
                  <span className="font-mono text-xs break-all">{doc.contact.home_hub}</span>
                </MetaRow>
              ) : null}
              {doc.contact.endpoint ? (
                <MetaRow label="Endpoint">
                  <span className="font-mono text-xs break-all">{doc.contact.endpoint}</span>
                </MetaRow>
              ) : null}
              <p className="text-xs leading-relaxed text-text-faint">
                Where an invitation can be sent. It carries no authority: a hub redeeming an invite does
                that with the code.
              </p>
            </div>

            <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-bg-elevated p-5">
              <SectionLabel>Signing key</SectionLabel>
              <span className="font-mono text-[11px] leading-relaxed break-all text-text-muted">
                {identity.pubkey}
              </span>
              <VerifiedBadge label="Listing signature verified" />
              <p className="text-xs leading-relaxed text-text-faint">
                The key proves the same author published every version of this listing, not who they are.
                The kind above is whatever the author chose; nobody checks it.
              </p>
            </div>

            {identity.languages.length > 0 ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-bg-elevated p-5">
                <SectionLabel>Languages</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {identity.languages.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border-strong bg-surface px-2.5 py-[3px] font-mono text-[11px] text-text"
                    >
                      {languageName(tag)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </>
  );
}
