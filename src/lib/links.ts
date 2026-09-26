/* Every link that leaves this site, in one file.
 *
 * The clients repo learned this the hard way: the same service was hardcoded
 * under three different hostnames across five files, and none of them
 * resolved. One module, one spelling. */

const ORG = "https://github.com/Wavvon";

export const GITHUB = {
  org: ORG,
  server: `${ORG}/Wavvon-server`,
  clients: `${ORG}/Wavvon-clients`,
  discovery: `${ORG}/Wavvon-discovery`,
  docs: `${ORG}/Wavvon-docs`,
  security: `${ORG}/.github/blob/main/SECURITY.md`,
  clientReleases: `${ORG}/Wavvon-clients/releases`,
} as const;

/** Where a documentation page is read by a human. */
const DOC_BLOB = `${ORG}/Wavvon-docs/blob/main`;

/** Where the same page is fetched as raw markdown at build time. */
export const DOC_RAW = "https://raw.githubusercontent.com/Wavvon/Wavvon-docs/main";

export const DOCS = {
  readme: `${DOC_BLOB}/README.md`,
  roadmap: `${DOC_BLOB}/ROADMAP.md`,
  comparison: `${DOC_BLOB}/COMPARISON.md`,
  openapi: `${DOC_BLOB}/openapi.yaml`,
  architecture: `${DOC_BLOB}/docs/architecture.md`,
  operatorGuide: `${DOC_BLOB}/docs/hub-operator-guide.md`,
  hubScaling: `${DOC_BLOB}/docs/hub-scaling.md`,
  client: `${DOC_BLOB}/docs/client.md`,
  apps: `${DOC_BLOB}/docs/apps.md`,
  wireFormat: `${DOC_BLOB}/docs/wire-format.md`,
  hubDiscovery: `${DOC_BLOB}/docs/hub-discovery.md`,
} as const;

/** `wavvon://host[:port][/invite]` — what an installed client answers. */
export function deepLink(hubUrl: string, inviteCode?: string | null): string {
  try {
    const u = new URL(hubUrl);
    const host = u.port ? `${u.hostname}:${u.port}` : u.hostname;
    return `wavvon://${host}${inviteCode ? `/${inviteCode}` : ""}`;
  } catch {
    return `wavvon://${hubUrl}`;
  }
}

/**
 * A public key as it appears in a URL path.
 *
 * The stored form is `ed25519:<hex>`, and a raw colon in a path segment does
 * not survive the router — the page reads back something that matches no row.
 * URLs therefore carry the hex alone; `getHub`/`getBot` accept either form, so
 * an old link with the prefix still resolves.
 */
export function keyParam(pubkey: string): string {
  return pubkey.startsWith("ed25519:") ? pubkey.slice(8) : pubkey;
}
