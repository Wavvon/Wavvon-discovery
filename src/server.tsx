import { Hono, type Context } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { renderToString } from "react-dom/server";
import RootLayout from "@/pages/layout";
import { NotFound, type Metadata, type PageModule } from "@/lib/page";
import type { Params } from "@/components/Facets";

import * as home from "@/pages/home";
import * as hubs from "@/pages/hubs";
import * as hub from "@/pages/hub";
import * as clients from "@/pages/clients";
import * as client from "@/pages/client";
import * as themes from "@/pages/themes";
import * as languages from "@/pages/languages";
import * as identities from "@/pages/identities";
import * as identity from "@/pages/identity";
import * as providers from "@/pages/providers";
import * as docs from "@/pages/docs";
import * as doc from "@/pages/doc";

import * as apiHubs from "@/api/hubs";
import * as apiHub from "@/api/hub";
import * as apiClients from "@/api/clients";
import * as apiClient from "@/api/client";
import * as apiClientScreenshot from "@/api/client-screenshot";
import * as apiThemes from "@/api/themes";
import * as apiTheme from "@/api/theme";
import * as apiOtherThemes from "@/api/other-themes";
import * as apiOtherTheme from "@/api/other-theme";
import * as apiLanguages from "@/api/languages";
import * as apiLanguage from "@/api/language";
import * as apiIdentities from "@/api/identities";
import * as apiIdentity from "@/api/identity";
import * as apiSearch from "@/api/search";

// Every script is a file from this origin (public/copy.js). Inline styles stay
// allowed for the few `style` props that carry a per-listing value.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const app = new Hono();

app.use("*", async (c, next) => {
  await next();
  c.header("Content-Security-Policy", CSP);
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
});

// Nothing under /api trusts a cookie: writes are signed by the key they name
// and reads are public, so any origin may call it.
app.use("/api/*", async (c, next) => {
  await next();
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "content-type, x-wavvon-signature");
  c.header("Access-Control-Max-Age", "86400");
});
app.options("/api/*", (c) => c.body(null, 204));

type Handler<P> = (req: Request, ctx: { params: Promise<P> }) => Promise<Response>;
type RouteModule<P> = Partial<Record<"GET" | "POST" | "PUT" | "DELETE", Handler<P>>>;

// The path pattern is what guarantees the keys a module's `P` names.
function api<P>(path: string, mod: RouteModule<P>) {
  for (const method of ["GET", "POST", "PUT", "DELETE"] as const) {
    const handler = mod[method];
    if (handler) {
      app.on(method, path, (c) => handler(c.req.raw, { params: Promise.resolve(c.req.param() as P) }));
    }
  }
}

api("/api/hubs", apiHubs);
api("/api/hubs/:pubkey", apiHub);
api("/api/clients", apiClients);
api("/api/clients/:id", apiClient);
api("/api/clients/:id/screenshots/:index", apiClientScreenshot);
api("/api/themes", apiThemes);
api("/api/themes/:id", apiTheme);
api("/api/other-themes", apiOtherThemes);
api("/api/other-themes/:id", apiOtherTheme);
api("/api/languages", apiLanguages);
api("/api/languages/:id", apiLanguage);
api("/api/identities", apiIdentities);
api("/api/identities/:pubkey", apiIdentity);
api("/api/search", apiSearch);

function searchParams(c: Context): Params {
  const out: Params = {};
  for (const [key, values] of Object.entries(c.req.queries())) {
    out[key] = values.length === 1 ? values[0] : values;
  }
  return out;
}

function html(c: Context, metadata: Metadata, body: React.ReactNode, status: 200 | 404 = 200) {
  const markup = renderToString(
    <RootLayout metadata={metadata} pathname={c.req.path}>
      {body}
    </RootLayout>,
  );
  return c.html(`<!DOCTYPE html>${markup}`, status);
}

function notFoundPage(c: Context) {
  return html(
    c,
    { title: "Not found" },
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">Not found</h1>
      <p className="text-text-muted">
        Nothing lives at this address. <a href="/">Back to the start</a>.
      </p>
    </div>,
    404,
  );
}

function page<P>(path: string, mod: PageModule<P>) {
  app.get(path, async (c) => {
    const params = Promise.resolve(c.req.param() as P);
    try {
      const metadata = mod.generateMetadata ? await mod.generateMetadata({ params }) : (mod.metadata ?? {});
      // Pages may be async, which React only supports under server components;
      // calling the function first leaves a plain element tree to render.
      const body = await mod.default({ params, searchParams: Promise.resolve(searchParams(c)) });
      return html(c, metadata, body);
    } catch (err) {
      if (err instanceof NotFound) return notFoundPage(c);
      throw err;
    }
  });
}

page("/", home);
page("/hubs", hubs);
page("/hubs/:pubkey", hub);
page("/clients", clients);
page("/clients/:id", client);
page("/themes", themes);
page("/languages", languages);
page("/identities", identities);
page("/identities/:pubkey", identity);
page("/providers", providers);
page("/docs", docs);
page("/docs/:slug", doc);

app.use("*", serveStatic({ root: "./public" }));
app.notFound((c) => (c.req.path.startsWith("/api/") ? c.json({ error: "Not found" }, 404) : notFoundPage(c)));

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => console.log(`discovery listening on http://localhost:${port}`));
