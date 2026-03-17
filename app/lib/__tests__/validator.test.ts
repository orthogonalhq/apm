import { describe, it, expect } from "vitest";
import { validateSkillMd } from "../validator";
import { validatorFixtures } from "./validator-fixtures";

describe("validateSkillMd", () => {
  // Run all shared fixtures
  for (const fixture of validatorFixtures) {
    it(fixture.name, () => {
      const result = validateSkillMd(fixture.content, fixture.parentDir);
      expect(result.valid).toBe(fixture.valid);

      if (!fixture.valid && fixture.expectedErrorSubstrings) {
        for (const substring of fixture.expectedErrorSubstrings) {
          const found = result.errors.some((e) =>
            e.toLowerCase().includes(substring.toLowerCase())
          );
          expect(found).toBe(true);
        }
      }
    });
  }

  // Consecutive hyphens should produce exactly one name-related error
  it("consecutive hyphens produce single error", () => {
    const result = validateSkillMd(
      "---\nname: my--skill\ndescription: A test\n---\n"
    );
    expect(result.valid).toBe(false);
    const nameErrors = result.errors.filter((e) =>
      e.toLowerCase().includes("name")
    );
    expect(nameErrors).toHaveLength(1);
  });

  // Valid result should include frontmatter
  it("returns frontmatter on valid input", () => {
    const result = validateSkillMd(
      "---\nname: good-skill\ndescription: Works fine\n---\n"
    );
    expect(result.valid).toBe(true);
    expect(result.frontmatter).toBeDefined();
    expect(result.frontmatter!.name).toBe("good-skill");
    expect(result.frontmatter!.description).toBe("Works fine");
  });
});
