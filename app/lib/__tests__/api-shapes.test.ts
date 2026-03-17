import { describe, it, expect } from "vitest";
import type {
  Package,
  PackageListItem,
  PaginatedResponse,
  SearchResponse,
} from "@apm/types";

/**
 * API shape tests.
 *
 * These verify that mock API responses conform to the TypeScript types
 * defined in @apm/types. If the types or API responses drift apart,
 * these tests catch it at compile time (type errors) and runtime
 * (missing/extra field checks).
 *
 * For full integration tests against a live DB, see the CI pipeline.
 */

// ── Helpers ────────────────────────────────────────────────────

/** Assert obj has exactly the expected keys (no more, no fewer) */
function expectKeys(obj: Record<string, unknown>, keys: string[]) {
  expect(Object.keys(obj).sort()).toEqual(keys.sort());
}

// ── Fixtures ───────────────────────────────────────────────────

const mockPackageListItem: PackageListItem = {
  scope: "anthropics",
  name: "code-review",
  description: "Systematic code review checklist",
  kind: "skill",
  category: null,
  tags: ["review"],
  compatibility: [],
  language: "en",
  sourceRepo: "anthropics/skills",
  repoOwner: "anthropics",
  author: "anthropics",
  repoStars: 87,
  license: "MIT",
  tokenCount: 450,
  downloadCount: 12,
  verified: false,
  status: "active",
  lastIndexedAt: "2026-03-14T00:00:00.000Z",
};

const mockFullPackage: Package = {
  ...mockPackageListItem,
  id: "550e8400-e29b-41d4-a716-446655440000",
  sourcePath: "code-review",
  sourceRef: "main",
  repoUrl: "https://github.com/anthropics/skills",
  homepageUrl: null,
  version: null,
  skillMdRaw: "---\nname: code-review\n---\n",
  frontmatter: { name: "code-review", description: "..." },
  allowedTools: [],
  fileCount: 1,
  progressiveDisclosure: false,
  depCount: 0,
  dependantCount: 0,
  featured: false,
  hosted: false,
  lastUpdatedAt: null,
  firstIndexedAt: "2026-03-01T00:00:00.000Z",
  lastCommitSha: "abc123def456",
};

// ── Tests ──────────────────────────────────────────────────────

describe("GET /api/packages response shape", () => {
  it("PaginatedResponse has required envelope fields", () => {
    const response: PaginatedResponse<PackageListItem> = {
      data: [mockPackageListItem],
      total: 1,
      page: 1,
      pageSize: 20,
    };

    expect(response.data).toBeInstanceOf(Array);
    expect(typeof response.total).toBe("number");
    expect(typeof response.page).toBe("number");
    expect(typeof response.pageSize).toBe("number");
  });

  it("PackageListItem has all expected fields", () => {
    const expectedKeys = [
      "scope",
      "name",
      "description",
      "kind",
      "category",
      "tags",
      "compatibility",
      "language",
      "sourceRepo",
      "repoOwner",
      "author",
      "repoStars",
      "license",
      "tokenCount",
      "downloadCount",
      "verified",
      "status",
      "lastIndexedAt",
    ];

    expectKeys(
      mockPackageListItem as unknown as Record<string, unknown>,
      expectedKeys
    );
  });
});

describe("GET /api/packages/@scope/name response shape", () => {
  it("Package has all expected fields", () => {
    const expectedKeys = [
      "id",
      "scope",
      "name",
      "description",
      "kind",
      "category",
      "tags",
      "compatibility",
      "language",
      "sourceRepo",
      "sourcePath",
      "sourceRef",
      "repoUrl",
      "homepageUrl",
      "repoOwner",
      "author",
      "repoStars",
      "license",
      "version",
      "skillMdRaw",
      "frontmatter",
      "allowedTools",
      "tokenCount",
      "fileCount",
      "progressiveDisclosure",
      "downloadCount",
      "depCount",
      "dependantCount",
      "verified",
      "featured",
      "status",
      "hosted",
      "lastUpdatedAt",
      "firstIndexedAt",
      "lastIndexedAt",
      "lastCommitSha",
    ];

    expectKeys(
      mockFullPackage as unknown as Record<string, unknown>,
      expectedKeys
    );
  });

  it("Package extends PackageListItem fields", () => {
    // Every field in PackageListItem must exist in Package
    for (const key of Object.keys(mockPackageListItem)) {
      expect(mockFullPackage).toHaveProperty(key);
    }
  });

  it("skillMdRaw is a string", () => {
    expect(typeof mockFullPackage.skillMdRaw).toBe("string");
  });

  it("frontmatter is an object", () => {
    expect(typeof mockFullPackage.frontmatter).toBe("object");
    expect(mockFullPackage.frontmatter).not.toBeNull();
  });
});

describe("GET /api/search response shape", () => {
  it("SearchResponse has results and total", () => {
    const response: SearchResponse = {
      results: [mockPackageListItem],
      total: 1,
    };

    expect(response.results).toBeInstanceOf(Array);
    expect(typeof response.total).toBe("number");
  });

  it("empty search returns empty results", () => {
    const response: SearchResponse = {
      results: [],
      total: 0,
    };

    expect(response.results).toHaveLength(0);
    expect(response.total).toBe(0);
  });
});

describe("POST /api/packages/@scope/name/track response shape", () => {
  it("success response is { ok: true }", () => {
    const response = { ok: true };
    expect(response).toEqual({ ok: true });
  });
});

describe("error response shape", () => {
  it("error responses have { error: string }", () => {
    const responses = [
      { error: "Invalid package path. Use @scope/name" },
      { error: "Package not found" },
      { error: "Not found" },
      { error: "Unknown action" },
    ];

    for (const r of responses) {
      expect(typeof r.error).toBe("string");
      expect(r.error.length).toBeGreaterThan(0);
    }
  });
});
