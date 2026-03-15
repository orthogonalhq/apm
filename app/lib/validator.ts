import matter from "gray-matter";
import type { ValidationResult, SkillFrontmatter } from "@apm/types";

const NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;

export function validateSkillMd(
  content: string,
  parentDirName?: string
): ValidationResult {
  const errors: string[] = [];

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch {
    return { valid: false, errors: ["Failed to parse YAML frontmatter"] };
  }

  const fm = parsed.data as Record<string, unknown>;

  // Validate name
  if (!fm.name || typeof fm.name !== "string") {
    errors.push("Missing required field: name");
  } else {
    if (fm.name.length > MAX_NAME_LENGTH) {
      errors.push(`name must be at most ${MAX_NAME_LENGTH} characters`);
    }
    if (!NAME_REGEX.test(fm.name)) {
      errors.push(
        "name must be lowercase alphanumeric with hyphens, no leading/trailing/consecutive hyphens"
      );
    }
    if (fm.name.includes("--")) {
      errors.push("name must not contain consecutive hyphens");
    }
    if (parentDirName && fm.name !== parentDirName) {
      errors.push(
        `name "${fm.name}" does not match parent directory "${parentDirName}"`
      );
    }
  }

  // Validate description
  if (!fm.description || typeof fm.description !== "string") {
    errors.push("Missing required field: description");
  } else if (fm.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `description must be at most ${MAX_DESCRIPTION_LENGTH} characters`
    );
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    frontmatter: fm as unknown as SkillFrontmatter,
  };
}
