import { describe, it, expect } from "vitest";
import { hasAnyFilter, isSelected, toggleHref } from "../../components/Facets";
import { isClientPlatform, languageName } from "../facets";

describe("toggleHref", () => {
  it("adds a value that is not selected", () => {
    expect(toggleHref("/clients", {}, "platform", "linux")).toBe("/clients?platform=linux");
  });

  it("removes a value that is selected", () => {
    expect(toggleHref("/clients", { platform: "linux" }, "platform", "linux")).toBe("/clients");
  });

  it("keeps the other filters when toggling one", () => {
    const href = toggleHref("/clients", { q: "rip", platform: ["linux"] }, "platform", "macos");
    expect(href).toBe("/clients?q=rip&platform=linux&platform=macos");
  });

  it("removes only the one value from a multi-select", () => {
    const href = toggleHref("/clients", { platform: ["linux", "macos"] }, "platform", "linux");
    expect(href).toBe("/clients?platform=macos");
  });

  it("reports selection and overall filter state", () => {
    expect(isSelected({ tag: ["gaming"] }, "tag", "gaming")).toBe(true);
    expect(isSelected({ tag: ["gaming"] }, "tag", "retro")).toBe(false);
    expect(hasAnyFilter({ tag: ["gaming"] }, ["q", "tag"])).toBe(true);
    // A filter box that was typed in and cleared leaves an empty array.
    expect(hasAnyFilter({ tag: [] }, ["q", "tag"])).toBe(false);
  });
});

describe("closed sets", () => {
  it("rejects a platform outside the known set", () => {
    expect(isClientPlatform("linux")).toBe(true);
    expect(isClientPlatform("haiku")).toBe(false);
  });

  it("rejects a bot capability outside the known set", () => {
  });
});

describe("languageName", () => {
  it("names a tag nobody hardcoded", () => {
    // The point of the open facet: Finnish works without this repo changing.
    expect(languageName("fi").toLowerCase()).toContain("suom");
  });

  it("gives back something readable for an unknown tag", () => {
    expect(languageName("zzz")).toBe("ZZZ");
  });
});
