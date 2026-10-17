import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import * as ed from "@noble/ed25519";
import { NextRequest } from "next/server";
import { initDb } from "../db";
import { getIdentity, listIdentities } from "../identities-db";
import { isHttpUrl, isPublicHttpsUrl, validateIdentity } from "../identity";
import { bytesToHex, deleteMessage } from "../signed-listing";
import { POST } from "@/app/api/identities/route";
import { DELETE } from "@/app/api/identities/[pubkey]/route";
import type { IdentityDoc } from "../types";

function b64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

async function keypair() {
  const { secretKey, publicKey } = await ed.keygenAsync();
  return { secretKey, hex: bytesToHex(publicKey) };
}

function doc(hex: string, overrides: Partial<IdentityDoc> = {}): IdentityDoc {
  return {
    format: "wavvon.identity",
    version: 1,
    pubkey: `ed25519:${hex}`,
    name: "Tallyman",
    tagline: "Counts things",
    description: "Body text.",
    kind: "program",
    tags: ["moderation"],
    languages: ["en", "it"],
    contact: { endpoint: "https://tallyman.example/invites" },
    listed_at: 1,
    ...overrides,
  };
}

async function sign(message: string, secretKey: Uint8Array): Promise<string> {
  return b64url(await ed.signAsync(new TextEncoder().encode(message), secretKey));
}

async function publish(d: IdentityDoc, secretKey: Uint8Array, sigOver?: string) {
  const payload = JSON.stringify(d);
  const req = new NextRequest("http://localhost/api/identities", {
    method: "POST",
    body: JSON.stringify({ payload, sig: await sign(sigOver ?? payload, secretKey) }),
  });
  return POST(req);
}

async function remove(hex: string, sig?: string) {
  const req = new NextRequest(`http://localhost/api/identities/${hex}`, {
    method: "DELETE",
    headers: sig ? { "x-wavvon-signature": sig } : {},
  });
  return DELETE(req, { params: Promise.resolve({ pubkey: hex }) });
}

beforeEach(() => {
  initDb(new Database(":memory:"));
});

describe("publishing an identity", () => {
  it("stores a document signed by the key it names", async () => {
    const { secretKey, hex } = await keypair();
    const res = await publish(doc(hex), secretKey);
    expect(res.status).toBe(201);
    expect(getIdentity(hex)?.doc.contact.endpoint).toBe("https://tallyman.example/invites");
    expect(listIdentities({ kind: "program", tag: "moderation", language: "it" })).toHaveLength(1);
  });

  it("rejects a signature made by a different key", async () => {
    const { hex } = await keypair();
    const other = await keypair();
    const res = await publish(doc(hex), other.secretKey);
    expect(res.status).toBe(403);
    expect(getIdentity(hex)).toBeNull();
  });

  it("rejects a document edited after signing", async () => {
    const { secretKey, hex } = await keypair();
    const signed = JSON.stringify(doc(hex));
    const res = await publish(doc(hex, { name: "Forged" }), secretKey, signed);
    expect(res.status).toBe(403);
  });

  it("refuses to roll back to an older listing", async () => {
    const { secretKey, hex } = await keypair();
    await publish(doc(hex, { listed_at: 5, name: "New" }), secretKey);
    const res = await publish(doc(hex, { listed_at: 2, name: "Old" }), secretKey);
    expect(res.status).toBe(409);
    expect(getIdentity(hex)?.name).toBe("New");
  });
});

describe("the delivery route rule", () => {
  const HEX = "a".repeat(64);
  const base = doc(HEX);

  it("rejects a listing with no contact", () => {
    expect(validateIdentity({ ...base, contact: undefined }, 100)).toMatch(/delivery route/);
  });

  it("rejects an empty contact", () => {
    expect(validateIdentity({ ...base, contact: {} }, 100)).toMatch(/exactly one/);
  });

  it("rejects both routes at once", () => {
    const contact = { home_hub: "https://hub.example", endpoint: "https://tallyman.example/x" };
    expect(validateIdentity({ ...base, contact }, 100)).toMatch(/exactly one/);
  });

  it("accepts a home_hub alone", () => {
    expect(validateIdentity({ ...base, contact: { home_hub: "https://hub.example" } }, 100)).toBeNull();
  });

  it("rejects a non-http home_hub", () => {
    expect(validateIdentity({ ...base, contact: { home_hub: "ftp://hub.example" } }, 100)).toMatch(/home_hub/);
  });
});

describe("document rules", () => {
  const HEX = "b".repeat(64);
  const base = doc(HEX);

  it("rejects an unknown format or version", () => {
    expect(validateIdentity({ ...base, format: "wavvon.client" }, 100)).toMatch(/format/);
    expect(validateIdentity({ ...base, version: 2 }, 100)).toMatch(/version/);
  });

  it("rejects a kind outside person and program", () => {
    expect(validateIdentity({ ...base, kind: "bot" }, 100)).toMatch(/kind/);
  });

  it("rejects malformed tags and languages", () => {
    expect(validateIdentity({ ...base, tags: ["Has Space"] }, 100)).toMatch(/tags/);
    expect(validateIdentity({ ...base, languages: ["english!"] }, 100)).toMatch(/languages/);
  });

  it("rejects a payload over 32 KB", () => {
    expect(validateIdentity(base, 32769)).toMatch(/32 KB/);
  });

  it("rejects a pubkey that is not a 32-byte key", () => {
    expect(validateIdentity({ ...base, pubkey: "ed25519:abcd" }, 100)).toMatch(/pubkey/);
  });
});

describe("endpoint URL rules", () => {
  it("accepts a public https URL", () => {
    expect(isPublicHttpsUrl("https://tallyman.example/invites")).toBe(true);
  });

  it("rejects http", () => {
    expect(isPublicHttpsUrl("http://tallyman.example/invites")).toBe(false);
  });

  it.each([
    "https://localhost/x",
    "https://app.localhost/x",
    "https://printer.local/x",
    "https://127.0.0.1/x",
    "https://10.1.2.3/x",
    "https://172.16.0.1/x",
    "https://192.168.1.1/x",
    "https://169.254.169.254/latest",
    "https://100.64.0.1/x",
    "https://0.0.0.0/x",
    "https://2130706433/x",
    "https://[::1]/x",
    "https://[fd00::1]/x",
    "https://[fe80::1]/x",
    "https://[::ffff:127.0.0.1]/x",
  ])("rejects %s", (url) => {
    expect(isPublicHttpsUrl(url)).toBe(false);
  });

  it("rejects credentials in the URL", () => {
    expect(isPublicHttpsUrl("https://user:pw@tallyman.example/")).toBe(false);
  });

  it("accepts a public IP literal", () => {
    expect(isPublicHttpsUrl("https://8.8.8.8/x")).toBe(true);
  });

  it("lets home_hub be http or https but nothing else", () => {
    expect(isHttpUrl("http://hub.example")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("removing an identity", () => {
  it("needs a signature", async () => {
    const { secretKey, hex } = await keypair();
    await publish(doc(hex), secretKey);
    expect((await remove(hex)).status).toBe(401);
    expect(getIdentity(hex)).not.toBeNull();
  });

  it("rejects a signature from another key", async () => {
    const { secretKey, hex } = await keypair();
    await publish(doc(hex), secretKey);
    const other = await keypair();
    expect((await remove(hex, await sign(deleteMessage("identity", hex, 1), other.secretKey))).status).toBe(403);
    expect(getIdentity(hex)).not.toBeNull();
  });

  it("removes the listing for a valid signature over the key", async () => {
    const { secretKey, hex } = await keypair();
    await publish(doc(hex), secretKey);
    expect((await remove(hex, await sign(deleteMessage("identity", hex, 1), secretKey))).status).toBe(200);
    expect(getIdentity(hex)).toBeNull();
  });

  it("does not let a captured delete remove the listing once it is re-published", async () => {
    const { secretKey, hex } = await keypair();
    await publish(doc(hex), secretKey);
    const captured = await sign(deleteMessage("identity", hex, 1), secretKey);
    expect((await remove(hex, captured)).status).toBe(200);

    await publish(doc(hex, { listed_at: 2 }), secretKey);
    expect((await remove(hex, captured)).status).toBe(403);
    expect(getIdentity(hex)).not.toBeNull();
  });
});
