import Link from "next/link";
import type { Metadata } from "next";
import { listOtherThemes, listThemes, type ThemeListing } from "@/lib/themes-db";
import { EmptyState, PageIntro, SectionLabel } from "@/components/ui";
import { SearchBox, type Params } from "@/components/Facets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Themes",
  description: "Themes for the Wavvon client, and themes for other clients. Every listing is signed by its author.",
};

const SWATCH_TOKENS = ["--bg", "--surface", "--accent"];

function one(params: Params, key: string): string | undefined {
  const raw = params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

// Only plain hex colours reach a style attribute: a listing is a stranger's text.
function swatches(theme: ThemeListing): string[] {
  const colors = theme.metadata.colors as Record<string, Record<string, unknown> | undefined>;
  const map = colors.dark ?? colors.light ?? {};
  return SWATCH_TOKENS.map((t) => map[t]).filter(
    (v): v is string => typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v),
  );
}

export default async function ThemesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = one(params, "q")?.slice(0, 100) || undefined;
  const { themes, total } = listThemes({ q });
  const other = listOtherThemes({ q });

  return (
    <>
      <PageIntro title="Themes">
        Colours, icons, backgrounds, layout and sounds for the Wavvon client, published and signed by
        their authors. The directory lists them and never hosts them: the client downloads each package
        from its author, checks it against the listed hash and previews it before installing.
      </PageIntro>

      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-12 pb-16 max-sm:px-4">
        <div className="max-w-[420px]">
          <SearchBox name="q" placeholder="Search themes" defaultValue={q} hidden={{}} />
        </div>

        <section className="flex flex-col gap-4">
          <SectionLabel>Themes for the Wavvon client · {total}</SectionLabel>
          {themes.length === 0 ? (
            <EmptyState title={q ? "No themes match that search." : "Nobody has listed a theme here yet."}>
              {q ? (
                <Link href="/themes" className="font-mono text-xs">
                  clear search →
                </Link>
              ) : null}
            </EmptyState>
          ) : (
            <div className="grid grid-cols-3 gap-[18px] max-xl:grid-cols-2 max-md:grid-cols-1">
              {themes.map((theme) => (
                <article
                  key={theme.id}
                  className="flex flex-col gap-3 rounded-[14px] border border-border bg-bg-elevated p-[22px]"
                >
                  {theme.preview_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={theme.preview_url}
                      alt={`Preview of ${theme.name}`}
                      loading="lazy"
                      className="aspect-video w-full rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="flex gap-1.5" aria-hidden="true">
                      {swatches(theme).map((c, i) => (
                        <span key={i} className="h-6 w-6 rounded-md border border-border" style={{ background: c }} />
                      ))}
                    </div>
                  )}
                  <h3 className="text-base font-semibold text-text">{theme.name}</h3>
                  {theme.description ? (
                    <p className="line-clamp-3 text-sm leading-relaxed text-text-muted">{theme.description}</p>
                  ) : null}
                  <p className="truncate font-mono text-[11px] text-text-faint" title={theme.sha256}>
                    sha256 {theme.sha256.slice(0, 16)}…
                  </p>
                  <a href={theme.download_url} className="mt-auto font-mono text-xs" rel="nofollow noopener">
                    download .wavvontheme &rarr;
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <SectionLabel>Themes for other clients · {other.total}</SectionLabel>
          <p className="max-w-[640px] text-sm text-text-muted">
            Listed as their authors describe them. The directory does not look inside, and the official
            client does not show this section.
          </p>
          {other.themes.length === 0 ? (
            <EmptyState title={q ? "No themes for other clients match that search." : "None listed yet."} />
          ) : (
            <div className="grid grid-cols-3 gap-[18px] max-xl:grid-cols-2 max-md:grid-cols-1">
              {other.themes.map((theme) => (
                <article
                  key={theme.id}
                  className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-bg-elevated p-[22px]"
                >
                  <h3 className="text-base font-semibold text-text">{theme.name}</h3>
                  <span className="font-mono text-[11px] text-text-faint">for {theme.client}</span>
                  <p className="line-clamp-4 text-sm leading-relaxed text-text-muted">{theme.description}</p>
                  <a href={theme.link} className="mt-auto font-mono text-xs" rel="nofollow noopener">
                    open &rarr;
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
