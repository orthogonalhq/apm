import { describe, it, expect } from "vitest";
import { parsePackageId, formatPackageId } from "@apm/types";
import { parseScopedSlug } from "../package-params";

describe("parsePackageId", () => {
  it("parses valid @scope/name", () => {
    expect(parsePackageId("@anthropics/code-review")).toEqual({
      scope: "anthropics",
      name: "code-review",
    });
  });

  it("parses single-char scope and name", () => {
    expect(parsePackageId("@a/b")).toEqual({ scope: "a", name: "b" });
  });

  it("parses underscores", () => {
    expect(parsePackageId("@my_org/my_skill")).toEqual({
      scope: "my_org",
      name: "my_skill",
    });
  });

  it("returns null for missing @", () => {
    expect(parsePackageId("scope/name")).toBeNull();
  });

  it("returns null for missing slash", () => {
    expect(parsePackageId("@scopename")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parsePackageId("")).toBeNull();
  });

  it("returns null for empty scope", () => {
    expect(parsePackageId("@/name")).toBeNull();
  });

  it("returns null for empty name", () => {
    expect(parsePackageId("@scope/")).toBeNull();
  });

  it("returns null for uppercase", () => {
    expect(parsePackageId("@Scope/Name")).toBeNull();
  });

  it("returns null for extra segments", () => {
    expect(parsePackageId("@scope/name/extra")).toBeNull();
  });
});

describe("formatPackageId", () => {
  it("formats scope and name", () => {
    expect(formatPackageId("anthropics", "code-review")).toBe(
      "@anthropics/code-review"
    );
  });

  it("roundtrips with parsePackageId", () => {
    const formatted = formatPackageId("apm", "init");
    const parsed = parsePackageId(formatted);
    expect(parsed).toEqual({ scope: "apm", name: "init" });
  });
});

describe("parseScopedSlug", () => {
  it("parses [@scope, name]", () => {
    expect(parseScopedSlug(["@anthropics", "code-review"])).toEqual({
      scope: "anthropics",
      name: "code-review",
      rest: [],
    });
  });

  it("strips @ prefix from scope", () => {
    const result = parseScopedSlug(["@apm", "init"]);
    expect(result?.scope).toBe("apm");
  });

  it("works without @ prefix", () => {
    const result = parseScopedSlug(["apm", "init"]);
    expect(result).toEqual({
      scope: "apm",
      name: "init",
      rest: [],
    });
  });

  it("captures rest segments", () => {
    const result = parseScopedSlug(["@scope", "name", "skill-md"]);
    expect(result).toEqual({
      scope: "scope",
      name: "name",
      rest: ["skill-md"],
    });
  });

  it("captures multiple rest segments", () => {
    const result = parseScopedSlug(["@scope", "name", "a", "b"]);
    expect(result?.rest).toEqual(["a", "b"]);
  });

  it("returns null for single segment", () => {
    expect(parseScopedSlug(["@scope"])).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(parseScopedSlug([])).toBeNull();
  });

  it("returns null for empty scope after stripping @", () => {
    expect(parseScopedSlug(["@", "name"])).toBeNull();
  });

  it("returns null for empty name", () => {
    expect(parseScopedSlug(["@scope", ""])).toBeNull();
  });

  it("decodes URI components", () => {
    const result = parseScopedSlug(["%40scope", "my%2Dskill"]);
    expect(result).toEqual({
      scope: "scope",
      name: "my-skill",
      rest: [],
    });
  });
});
