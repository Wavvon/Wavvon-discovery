import { describe, it, expect } from "vitest";
import { isHubUrl, overWriteBudget, validateHubSubmission } from "../hub-submission";
import { isPrivateAddress } from "../identity";
import { buildCanonicalPayload } from "../canonical";
import { deepLink } from "../links";

const ok = {
  hub_url: "https://hub.example",
  hub_pubkey: "a".repeat(64),
  signature: "b".repeat(128),
  canonical_payload: "{}",
  tags: ["gaming"],
  language: "en",
  bio: "hi",
};

describe("validateHubSubmission", () => {
  it("accepts a well-formed submission", () => {
    expect(validateHubSubmission(ok)).toBeNull();
  });

  it("refuses tags that are not an array of short strings", () => {
    expect(validateHubSubmission({ ...ok, tags: "gaming" })).not.toBeNull();
    expect(validateHubSubmission({ ...ok, tags: [1] })).not.toBeNull();
    expect(validateHubSubmission({ ...ok, tags: Array(11).fill("x") })).not.toBeNull();
  });

  it("refuses oversized and mistyped fields", () => {
    expect(validateHubSubmission({ ...ok, bio: "x".repeat(501) })).not.toBeNull();
    expect(validateHubSubmission({ ...ok, language: 5 })).not.toBeNull();
    expect(validateHubSubmission({ ...ok, invite_code: "a/b" })).not.toBeNull();
    expect(validateHubSubmission({ ...ok, signature: "zz" })).not.toBeNull();
  });
});

describe("isHubUrl", () => {
  it("wants public https with nothing that swallows the appended path", () => {
    expect(isHubUrl("https://hub.example/hub/abc")).toBe(true);
    expect(isHubUrl("http://hub.example")).toBe(false);
    expect(isHubUrl("https://hub.example/x?")).toBe(false);
    expect(isHubUrl("https://hub.example/x#")).toBe(false);
    expect(isHubUrl("data:application/json,{}#")).toBe(false);
    expect(isHubUrl("https://127.0.0.1")).toBe(false);
  });
});

describe("isPrivateAddress", () => {
  it("covers resolved v4, v6 and mapped addresses", () => {
    expect(isPrivateAddress("10.0.0.1")).toBe(true);
    expect(isPrivateAddress("169.254.169.254")).toBe(true);
    expect(isPrivateAddress("::1")).toBe(true);
    expect(isPrivateAddress("fd00::1")).toBe(true);
    expect(isPrivateAddress("::ffff:7f00:1")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(isPrivateAddress("2606:4700::1111")).toBe(false);
  });
});

describe("overWriteBudget", () => {
  it("allows ten writes per window, then refuses", () => {
    const addr = `test-${Math.random()}`;
    for (let i = 0; i < 10; i++) expect(overWriteBudget(addr, 0)).toBe(false);
    expect(overWriteBudget(addr, 0)).toBe(true);
    expect(overWriteBudget(addr, 11 * 60 * 1000)).toBe(false);
  });
});

describe("invite_code", () => {
  it("is signed when present and absent from the payload otherwise", () => {
    const base = { hub_url: "u", tags: [], language: "en", bio: "", nonce: "n" };
    expect(Object.keys(JSON.parse(buildCanonicalPayload({ ...base, invite_code: "abc" }))))
      .toEqual(["bio", "hub_url", "invite_code", "language", "nonce", "tags"]);
    expect(buildCanonicalPayload({ ...base, invite_code: null })).toBe(buildCanonicalPayload(base));
  });

  it("is encoded in the deep link", () => {
    expect(deepLink("https://hub.example", "a/b?c")).toBe("wavvon://hub.example/a%2Fb%3Fc");
  });
});
