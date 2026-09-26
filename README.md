# Wavvon Discovery

[![Build check](https://github.com/Wavvon/Wavvon-discovery/actions/workflows/build.yml/badge.svg)](https://github.com/Wavvon/Wavvon-discovery/actions/workflows/build.yml)

The **optional public hub directory** for
[Wavvon](https://github.com/Wavvon/Wavvon-docs) — an open-source, federated
voice + text platform where communities run their own servers.

Wavvon has no central server, so there is nothing you *must* register
with — hubs are joined by URL. Discovery exists purely as a
convenience: hub operators can list their public hubs here, and users
can browse and search for communities to join. Hubs work exactly the
same without it, and because this service is open source you can run
your own directory for your own network.

## What it does

Four public surfaces, plus the docs index that ties them together.

- **Hubs** (`/hubs`) — communities that chose to be listed. Each entry is
  Ed25519-signed by the hub's own key, so only that hub can publish, change
  or remove it. Search plus filters for tag, language and whether it is
  invite-only.
- **Clients** (`/clients`) — anything that speaks the protocol. Filter by
  platform, by the features it implements, and by the languages its interface
  is translated into. Each has a page with a support table and its maintainer.
- **Bots** (`/bots`) — published bots, added to a hub by pasting their public
  key. A bot publishes its own listing signed with that key, the way a hub
  does. The detail page lists its commands and, just as usefully, the
  permissions it did *not* ask for.
- **Providers** (`/providers`) — companies that will run a hub for you, if you
  would rather not run a server. A curated file (`src/data/providers.json`),
  not a registry: listed offers, not endorsements, and nobody publishes into it.
- **Docs** (`/docs`) — an index over
  [Wavvon-docs](https://github.com/Wavvon/Wavvon-docs), with each page rendered
  here from its markdown source.
- **Skins** — community `.wavvonskin` themes, signed by their authors and
  served over the API to the Appearance tab of every client.

The site never probes a hub. A listing that has gone stale is reported by
whoever noticed, which costs nothing and scales with readers rather than with
the size of the catalogue.

## Run it

Requires [Node 20+](https://nodejs.org).

```bash
git clone https://github.com/Wavvon/Wavvon-discovery
cd Wavvon-discovery
npm install
npm run dev
# Open http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

State lives in a single SQLite database at `./data/discovery.db`
(created automatically); set `WAVVON_DISCOVERY_DATA_DIR` to put it
elsewhere. There is no cron job and no scheduled work of any kind.

Documentation pages are fetched from the Wavvon-docs repository at build
time and revalidated hourly. If that fetch fails the page says so and
links to GitHub, so the site still builds with no network.

Hubs choose which directory they announce to via the `discovery_url`
setting in [Wavvon-server](https://github.com/Wavvon/Wavvon-server).

> Note for contributors: this repo pins a Next.js version with breaking
> changes from older releases. Read the bundled guide under
> `node_modules/next/dist/docs/` before touching the App Router code.

## Tech

Next.js (App Router) · React · TypeScript · Tailwind CSS · SQLite via
better-sqlite3 · `@noble/ed25519` for signature verification.

```bash
npx tsc --noEmit   # type check
npm run lint       # eslint
```

## The Wavvon project

| Repo | What it is |
|---|---|
| [Wavvon-server](https://github.com/Wavvon/Wavvon-server) | Hub server, farm tooling, identity crate (Rust) |
| [Wavvon-clients](https://github.com/Wavvon/Wavvon-clients) | All clients (desktop / web / Android) + shared packages |
| **Wavvon-discovery** *(this repo)* | Optional public hub directory |
| [Wavvon-docs](https://github.com/Wavvon/Wavvon-docs) | Architecture wiki, roadmap, API spec |

Design docs:
[hub-discovery.md](https://github.com/Wavvon/Wavvon-docs/blob/main/docs/hub-discovery.md)
and
[discovery-v2.md](https://github.com/Wavvon/Wavvon-docs/blob/main/docs/discovery-v2.md).

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

GNU Affero General Public License v3.0.

## Built with AI assistance

This project was built with substantial help from
[Claude](https://claude.ai) (Anthropic's AI assistant). The product
owner directs architecture, features, and tradeoffs; Claude drafts
most of the code, tests, and documentation, which is then reviewed,
adjusted, and accepted.

Calling this out for transparency — it's not a fully hand-written
codebase, and pretending otherwise wouldn't be honest.
