import Link from "next/link";
import { listHubs } from "@/lib/db";
import { countClients } from "@/lib/clients-db";
import { PillLink } from "@/components/ui";
import { DOCS } from "@/lib/links";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "Voice and text together",
    body: "Every channel is both. Opus over QUIC with noise suppression, push-to-talk, per-person volume, proximity voice, screen share and webcam.",
    path: (
      <>
        <path d="M3 12.5v-1M7 13V8M11 13V4.5M15 13V6.5M19 13v-3" />
        <path d="M4 17h16M8 20h8" />
      </>
    ),
  },
  {
    title: "Messages the server cannot read",
    body: "Direct messages, one-to-one and group, are end-to-end encrypted. Hubs relay ciphertext — including when it crosses to another hub.",
    path: (
      <>
        <rect x="4" y="10.5" width="16" height="10" rx="2.4" />
        <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      </>
    ),
  },
  {
    title: "Hubs that federate",
    body: "Independent communities form alliances and share channels, without either side handing over its members, its data, or its moderation.",
    path: (
      <>
        <circle cx="6" cy="7" r="2.6" />
        <circle cx="18" cy="7" r="2.6" />
        <circle cx="12" cy="17.5" r="2.6" />
        <path d="M8.4 8.4 10.6 15.4M15.6 8.4 13.4 15.4M8.6 7h6.8" />
      </>
    ),
  },
  {
    title: "One key, everywhere",
    body: "An Ed25519 keypair with a 24-word recovery phrase. Pair your other devices with a QR code. Nothing to reset, nobody to ask.",
    path: (
      <>
        <circle cx="8.5" cy="12" r="4" />
        <path d="M12.5 12H21M17.5 12v3.5M20 12v2.5" />
      </>
    ),
  },
] as const;

const GUARANTEES = [
  {
    ok: true,
    title: "Your data lives on your hub",
    body: "Messages, uploads and members are in that community's own database, under their backup policy.",
  },
  {
    ok: true,
    title: "The protocol is documented, not reverse-engineered",
    body: "HTTP and WebSocket, with an OpenAPI spec kept in step with the routes.",
  },
  {
    ok: true,
    title: "Every part is AGPL-3.0",
    body: "Server, clients and this directory. Fork it, audit it, run a private copy of the whole thing.",
  },
  {
    ok: false,
    title: "It is young, and says where it falls short",
    body: "There is a written comparison against the closed alternatives, including the parts we lose.",
  },
] as const;

export default function HomePage() {
  const counts = [
    { value: listHubs({}).total, label: "hubs listed", href: "/hubs" },
    { value: countClients(), label: "clients", href: "/clients" },
  ];

  return (
    <>
      <section className="px-12 pt-28 pb-22">
        <div className="mx-auto flex max-w-[900px] flex-col items-center gap-6 text-center">
          <h1 className="text-[62px] leading-[1.06] font-bold tracking-[-2.2px] text-pretty max-md:text-[42px] max-md:tracking-[-1.4px]">
            An open network for communities that host themselves
          </h1>
          <p className="max-w-[660px] text-xl leading-relaxed text-text-muted text-pretty max-md:text-lg">
            Voice, text and end-to-end encrypted messaging across independent servers. Your identity is
            a keypair you hold — no accounts, no company in the middle, no central server to shut down.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2.5">
            <PillLink href="/hubs">Find a community</PillLink>
            <PillLink href={DOCS.operatorGuide} variant="secondary">
              Run your own hub
            </PillLink>
          </div>
          <p className="pt-1.5 font-mono text-xs text-text-faint">
            open source · AGPL-3.0 · nothing to install
          </p>
        </div>
      </section>

      <section className="px-12">
        <div className="mx-auto grid max-w-[1200px] grid-cols-3 overflow-hidden rounded-2xl border border-border bg-bg-elevated max-sm:grid-cols-1">
          {counts.map(({ value, label, href }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col items-center gap-1.5 border-border px-5 py-8 transition-colors hover:bg-surface not-last:border-r max-sm:not-last:border-r-0 max-sm:not-last:border-b"
            >
              <span className="font-mono text-[38px] leading-none font-medium text-accent">{value}</span>
              <span className="text-sm text-text-muted">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-12 py-24">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
          <div className="flex flex-col items-center gap-3.5 text-center">
            <h2 className="text-[40px] leading-[1.1] font-bold tracking-[-1.3px] max-md:text-3xl">
              What is Wavvon?
            </h2>
            <p className="max-w-[640px] text-[17px] leading-relaxed text-text-muted text-pretty">
              A community runs a hub — one Rust binary and a database, on hardware they chose. Hubs talk
              to each other. You bring one key to all of them.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-3.5">
                <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-accent-sunken">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {feature.path}
                  </svg>
                </span>
                <h3 className="text-lg font-semibold tracking-[-0.3px]">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-bg-sunken px-12 py-24">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-11">
          <h2 className="text-center text-[40px] leading-[1.1] font-bold tracking-[-1.3px] max-md:text-3xl">
            Where do you start?
          </h2>

          <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-1">
            {[
              {
                eyebrow: "I want to join",
                title: "Find a community",
                body: "Browse the hubs that chose to be listed, or paste an address someone gave you. Every hub serves its own client in the browser, so there is nothing to install first.",
                cta: { href: "/hubs", label: "Browse hubs", primary: true },
                aside: { href: "/clients", label: "or pick a different client →" },
              },
              {
                eyebrow: "I want to host",
                title: "Run a hub",
                body: "A hub runs on your own server: one container and a PostgreSQL database. You keep the data, the moderation and the decisions about who belongs.",
                cta: { href: DOCS.operatorGuide, label: "Operator guide", primary: false },
                aside: { href: "/providers", label: "or let somebody host it for you →" },
              },
              {
                eyebrow: "I want to build",
                title: "Write a client or an app",
                body: "The whole protocol is plain HTTP and WebSocket, specified in an OpenAPI document. No SDK required, no partner programme, no key to apply for.",
                cta: { href: DOCS.openapi, label: "Protocol spec", primary: false },
                aside: { href: "/clients", label: "or see what others built →" },
              },
            ].map((card) => (
              <article
                key={card.title}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-bg-elevated p-7"
              >
                <span className="font-mono text-[11px] font-medium tracking-[1.6px] text-accent uppercase">
                  {card.eyebrow}
                </span>
                <h3 className="text-[23px] font-semibold tracking-[-0.5px]">{card.title}</h3>
                <p className="text-[15px] leading-relaxed text-text-muted">{card.body}</p>
                <div className="mt-auto flex flex-col gap-2.5 pt-1.5">
                  <Link
                    href={card.cta.href}
                    className={
                      card.cta.primary
                        ? "rounded-full bg-accent py-3 text-center text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover hover:text-accent-text"
                        : "rounded-full border border-border-strong py-3 text-center text-sm font-medium text-text transition-colors hover:border-text-muted hover:text-text"
                    }
                  >
                    {card.cta.label}
                  </Link>
                  <Link
                    href={card.aside.href}
                    className="text-center text-[13px] text-text-muted hover:text-text"
                  >
                    {card.aside.label}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-12 py-24">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 items-start gap-18 max-lg:grid-cols-1 max-lg:gap-10">
          <div className="flex flex-col gap-5">
            <h2 className="text-[40px] leading-[1.1] font-bold tracking-[-1.3px] text-pretty max-md:text-3xl">
              There is no Wavvon server
            </h2>
            <p className="text-base leading-[1.75] text-text-muted text-pretty">
              Nothing in the network routes through us. A hub keeps working if this site disappears, if
              the project stops, or if we turn out to be idiots. That is not a promise about our
              intentions — it is a property of how it is built.
            </p>
            <p className="text-base leading-[1.75] text-text-muted text-pretty">
              This directory is a convenience. It cannot moderate a hub, suspend one, rank one higher for
              money, or see who joins what. Hubs publish themselves to it, signed with their own key, and
              can stop at any time.
            </p>
            <Link href={DOCS.architecture} className="pt-1 text-[15px] font-medium">
              Read the architecture &rarr;
            </Link>
          </div>

          <div className="flex flex-col overflow-hidden rounded-2xl border border-border">
            {GUARANTEES.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3.5 p-[22px] not-last:border-b not-last:border-border"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={item.ok ? "var(--success)" : "var(--warning)"}
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-[3px] shrink-0"
                  aria-hidden="true"
                >
                  {item.ok ? (
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  ) : (
                    <>
                      <path d="M12 4.5 2.8 20h18.4z" />
                      <path d="M12 10v4M12 17.2v.2" />
                    </>
                  )}
                </svg>
                <div className="flex flex-col gap-1">
                  <span className="text-[15px] font-semibold">{item.title}</span>
                  <span className="text-sm leading-relaxed text-text-muted">{item.body}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-12 pb-24">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-5 rounded-[20px] border border-accent-border bg-bg-elevated px-10 py-16 text-center">
          <h2 className="max-w-[640px] text-[38px] leading-[1.1] font-bold tracking-[-1.3px] text-pretty max-md:text-3xl">
            Go find somewhere to hang out
          </h2>
          <p className="max-w-[520px] text-base leading-relaxed text-text-muted text-pretty">
            Or paste a hub address straight into your browser, if someone already gave you one.
          </p>
          <div className="pt-1.5">
            <PillLink href="/hubs">Find a community</PillLink>
          </div>
        </div>
      </section>
    </>
  );
}
