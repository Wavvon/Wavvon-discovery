import Link from "next/link";
import type { Metadata } from "next";
import { listLanguages } from "@/lib/languages-db";
import { EmptyState, PageIntro, SectionLabel } from "@/components/ui";
import { SearchBox, type Params } from "@/components/Facets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Languages",
  description: "Language packs for the Wavvon client. Every listing is signed by its author.",
};

function one(params: Params, key: string): string | undefined {
  const raw = params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function LanguagesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = one(params, "q")?.slice(0, 100) || undefined;
  const { languages, total } = listLanguages({ q });

  return (
    <>
      <PageIntro title="Languages">
        Language packs add a language to the Wavvon client without a release, published and signed by
        their authors. The directory lists them and never hosts them: the client downloads each pack from
        its author and checks it against the listed hash. Strings a pack lacks show in English, and the
        recovery, backup and security texts always come from the official translation.
      </PageIntro>

      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-12 pb-16 max-sm:px-4">
        <div className="max-w-[420px]">
          <SearchBox name="q" placeholder="Search languages" defaultValue={q} hidden={{}} />
        </div>

        <section className="flex flex-col gap-4">
          <SectionLabel>Language packs · {total}</SectionLabel>
          {languages.length === 0 ? (
            <EmptyState title={q ? "No language packs match that search." : "Nobody has listed a language pack here yet."}>
              {q ? (
                <Link href="/languages" className="font-mono text-xs">
                  clear search →
                </Link>
              ) : null}
            </EmptyState>
          ) : (
            <div className="grid grid-cols-3 gap-[18px] max-xl:grid-cols-2 max-md:grid-cols-1">
              {languages.map((lang) => (
                <article
                  key={lang.id}
                  className="flex flex-col gap-3 rounded-[14px] border border-border bg-bg-elevated p-[22px]"
                >
                  <h3 className="text-base font-semibold text-text">{lang.name}</h3>
                  <span className="font-mono text-[11px] text-text-faint">
                    {lang.code}
                    {lang.coverage !== undefined ? ` · ${Math.round(lang.coverage * 100)}% translated` : ""}
                    {lang.client_version ? ` · client ${lang.client_version}` : ""}
                  </span>
                  {lang.description ? (
                    <p className="line-clamp-3 text-sm leading-relaxed text-text-muted">{lang.description}</p>
                  ) : null}
                  <p className="truncate font-mono text-[11px] text-text-faint" title={lang.sha256}>
                    sha256 {lang.sha256.slice(0, 16)}…
                  </p>
                  <a href={lang.download_url} className="mt-auto font-mono text-xs" rel="nofollow noopener">
                    download .wavvonlang &rarr;
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
