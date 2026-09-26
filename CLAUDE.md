# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## What this repo is

**Wavvon-discovery** — the optional public hub directory site for Wavvon, a
self-hosted, federated voice+text community platform. Next.js 16 + React, with a
local SQLite store (`better-sqlite3`) and Ed25519 signature verification
(`@noble/ed25519`) for the listings hubs and farms publish.

It is *optional* by design: Wavvon works with zero discovery site. Nothing here
is on the critical path of running a hub or a client, and the site must never
become a coordination point the network depends on.

```
src/app/         Next.js App Router routes and pages
src/components/  React components — shell, filter rails, shared primitives
src/lib/         data access, signature verification, facet vocabularies
data/            local runtime database — gitignored, never committed
scripts/
```

The public surfaces are `/` (landing), `/hubs`, `/clients`, `/bots`,
`/providers` and `/docs`. Nothing else exists: no route is unreachable, and
none should be.

**A hub is self-hosted, and there is no hub-creation flow anywhere.** The
wizard, the bootstrap tokens and the config-template catalogue are gone: a hub
exists because somebody ran the binary on their own server. Somebody running
several keeps them together in a **farm** — a server-side deployment concept
that is never named in a client. An operator who chooses to run hubs for other
people is a **provider**, and `/providers` lists that offer. Don't reintroduce
a "create a hub" button.

**Providers are curated, not published.** `src/data/providers.json` is a
hand-edited file — no table, no API, no signature — because nothing in it is
written by a stranger. That is the deliberate difference from hubs, clients and
bots, which self-publish and are signed: those are things in the network
describing themselves, while this is an editorial page about businesses.
Somebody running their own directory curates their own file.

Sibling repos (you don't need them checked out):

| Repo | Contents |
|---|---|
| [Wavvon-server](https://github.com/Wavvon/Wavvon-server) | Hub server + the `seed` registry this site queries |
| [Wavvon-clients](https://github.com/Wavvon/Wavvon-clients) | Web + desktop clients |
| [Wavvon-docs](https://github.com/Wavvon/Wavvon-docs) | Architecture wiki + `openapi.yaml` |

Commit to **`develop`**. See `CONTRIBUTING.md`.

---

## Commands

```bash
npm run dev
npm run build
npm run start        # production server
npm run lint
npm run test         # vitest
```

---

## Constraints

**This site is English only, deliberately.** It was translated into six
languages on 2026-08-29 and the whole thing was reverted the same day. The
reason is not effort: it is that the *content* was never translatable in the
first place. A hub's name and bio, a bot's command descriptions, a client's
README — all of it is written by whoever published it, in whatever language
they chose, and no directory can translate that. Only the frame around it was
ever in Italian, so a Portuguese reader got Portuguese navigation wrapped
around English listings. That is not a translated site; it is a translated
menu bar, bought with `[locale]` routing, an Accept-Language middleware, a
switcher, a coverage gate, six catalogues to keep in step, and 168 prerendered
documentation pages instead of 28.

The clients are the opposite case and stay translated: there the strings *are*
the product, and the reader has already arrived.

Don't reintroduce i18n here. If it ever comes back, the thing that would make
it worth it is publishers declaring translations of their own listing text —
start there, not with the chrome.

**Next.js 16 differs significantly from earlier versions.** Check
`node_modules/next/dist/docs/` before writing Next.js-specific code rather than
relying on recalled patterns from 13/14/15.

**Nothing has been released, so there is no schema to preserve.** `migrate()`
creates what the site needs and nothing else — no `DROP TABLE IF EXISTS` to
converge an old dev database, because deleting `data/discovery.db` is the
supported way to converge one. Add compatibility shims when there is something
in the field to be compatible with.

**SQLite here is correct.** The hub server is PostgreSQL-only, but that rule is
about the hub. This site keeps its own small local catalog and `better-sqlite3`
is the deliberate choice — don't "align" it with the server.

**Every listing is signed, without exception.** A hub signs its own with the
hub key; a client author and a skin author sign theirs; a bot signs its own
with the bot key. `src/lib/signed-listing.ts` is the one place that verifies.
Deletion is proved the same way — a signature over the id — so nobody, this
directory included, can remove somebody else's listing.

Bots were the exception until 2026-08-28, and it was a hole rather than a
design: `POST /api/bots` believed whatever `pubkey` the body named, `PUT`
overwrote on the same terms, and `DELETE` took no credential at all. If a new
listing type appears, it signs.

Treat every field of a verified listing as untrusted input for display anyway.
A valid signature proves who wrote it, not that any of it is true.

**Federated, not centralized.** Don't add features that make hubs or clients
*need* this site to function.

**The site never probes a hub.** Uptime tracking was built and then removed.
The pings themselves were cheap — a thousand hubs every fifteen minutes is
about one request a second — but the per-card 7-day aggregate ran against a
table growing at 2,880 rows per hub per month, and nobody browses a directory
by uptime. A stale listing is reported by whoever noticed. Don't reintroduce a
scheduled job.

**Closed sets and open sets need different filter controls.** Platforms, client
features and bot capabilities are enumerated in `src/lib/facets.ts`, and a
listing naming something outside the set is rejected — those render as plain
checkbox lists (`ClosedFacet`). Tags and languages are whatever publishers
declare, so they render as `OpenFacet`: a total, a filter box, the commonest
values, and "show all". A hardcoded list of languages is a bug — there are more
of them than the four our own clients ship.

**Filters are links, not state.** Every rail control is a `<Link>` that toggles
one search param, and every search box is a GET form. The rails stay server
components, a filtered view is a URL somebody can send, and none of it needs
JavaScript.

**Keys in URLs carry no `ed25519:` prefix.** A raw colon in a path segment does
not reach a page component — the param arrives matching no row and every detail
page 404s, which is exactly how this shipped the first time. Build links with
`keyParam()`; `getHub` and `getBot` accept either spelling.
`src/lib/__tests__/keys.test.ts` guards it.

**Documentation is not stored here.** `src/lib/docs.ts` is an allowlist mapping
a slug to one path in Wavvon-docs; `/docs/[slug]` fetches that markdown and
renders it with `html: false`. The allowlist is what stops `/docs/<anything>`
fetching an arbitrary file from the repo, so pages are added by adding lines.

---

## Conventions

- Code comments in **English**, and only when the WHY is non-obvious. Don't explain WHAT.
- No comments in GitHub Actions workflow files — explain the choice in the commit message or the docs.
- Prefer one fixed home per UI control — avoid context-dependent relocation.
- Colours, spacing and radii come from `globals.css`, which mirrors the client
  design system (`clients/packages/ui/src/styles.css`, theme `linear`). Don't
  introduce a colour that isn't a token.
- Inter for prose, JetBrains Mono for anything a machine emitted — keys, tags,
  counts, dates, filenames.
- Competitor references are allowed — factual, no logos, no disparagement.
