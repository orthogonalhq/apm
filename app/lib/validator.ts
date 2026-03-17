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

  // Check for frontmatter delimiters before parsing
  if (!content.trimStart().startsWith("---")) {
    return {
      valid: false,
      errors: ["No YAML frontmatter found (must start with ---)"],
    };
  }

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
    if (!NAME_REGEX.test(fm.name) || fm.name.includes("--")) {
      errors.push(
        "name must be lowercase alphanumeric with hyphens (no leading, trailing, or consecutive hyphens)"
      );
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

  // Validate kind
  const kind = typeof fm.kind === "string" ? fm.kind : undefined;
  if (kind && kind !== "skill" && kind !== "composite") {
    errors.push(`kind must be "skill" or "composite", got "${kind}"`);
  }

  // Validate dependencies
  const deps = Array.isArray(fm.dependencies)
    ? (fm.dependencies as unknown[]).filter(
        (d): d is string => typeof d === "string"
      )
    : [];

  const isComposite = kind === "composite";

  if (isComposite && deps.length === 0) {
    errors.push(
      "composite skills must declare at least one dependency"
    );
  }

  if (deps.length > 0 && !isComposite) {
    errors.push(
      'dependencies declared but kind is not "composite" — add kind: composite to frontmatter'
    );
  }

  for (const dep of deps) {
    const stripped = dep.startsWith("@") ? dep.slice(1) : dep;
    const parts = stripped.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      errors.push(
        `invalid dependency format: "${dep}" — expected @scope/name`
      );
    }
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
