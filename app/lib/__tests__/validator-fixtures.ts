/**
 * Shared validator test fixtures.
 *
 * These cases define the canonical validation behavior for SKILL.md files.
 * Both the TypeScript (app/lib/validator.ts) and Rust (cli/src/validator.rs)
 * validators must agree on these outcomes.
 *
 * To add a case to the Rust test suite, translate the `content` and
 * `parentDir` fields into the corresponding `validate_skill_md` call
 * and assert `valid` + check `expectedErrorSubstrings`.
 */

export interface ValidatorFixture {
  /** Human-readable label for the test */
  name: string;
  /** Raw SKILL.md content (frontmatter + body) */
  content: string;
  /** Optional parent directory name to check against */
  parentDir?: string;
  /** Whether the validator should accept this input */
  valid: boolean;
  /** Substrings that must appear in the error list (only when valid=false) */
  expectedErrorSubstrings?: string[];
}

export const validatorFixtures: ValidatorFixture[] = [
  // ── Valid cases ──────────────────────────────────────────────

  {
    name: "valid minimal skill",
    content: "---\nname: my-skill\ndescription: A test skill\n---\nBody here.",
    parentDir: "my-skill",
    valid: true,
  },
  {
    name: "valid skill without parent dir check",
    content: "---\nname: my-skill\ndescription: A test skill\n---\n",
    valid: true,
  },
  {
    name: "valid single-char name",
    content: "---\nname: a\ndescription: Single char name\n---\n",
    valid: true,
  },
  {
    name: "valid composite skill",
    content: [
      "---",
      "name: my-comp",
      "description: A composite skill",
      "kind: composite",
      "dependencies:",
      '  - "@scope/dep1"',
      '  - "@scope/dep2"',
      "---",
      "",
    ].join("\n"),
    parentDir: "my-comp",
    valid: true,
  },
  {
    name: "valid skill with explicit kind: skill",
    content: "---\nname: basic\ndescription: Explicit kind\nkind: skill\n---\n",
    valid: true,
  },

  // ── Invalid: name ────────────────────────────────────────────

  {
    name: "missing frontmatter",
    content: "No frontmatter here",
    valid: false,
    expectedErrorSubstrings: ["frontmatter"],
  },
  {
    name: "empty name",
    content: '---\nname: ""\ndescription: A test\n---\n',
    valid: false,
    expectedErrorSubstrings: ["name"],
  },
  {
    name: "missing name field",
    content: "---\ndescription: A test\n---\n",
    valid: false,
    expectedErrorSubstrings: ["name"],
  },
  {
    name: "uppercase name",
    content: "---\nname: My-Skill\ndescription: A test\n---\n",
    valid: false,
    expectedErrorSubstrings: ["lowercase"],
  },
  {
    name: "consecutive hyphens — single error",
    content: "---\nname: my--skill\ndescription: A test\n---\n",
    valid: false,
    expectedErrorSubstrings: ["lowercase"],
  },
  {
    name: "leading hyphen",
    content: "---\nname: -my-skill\ndescription: A test\n---\n",
    valid: false,
    expectedErrorSubstrings: ["lowercase"],
  },
  {
    name: "trailing hyphen",
    content: "---\nname: my-skill-\ndescription: A test\n---\n",
    valid: false,
    expectedErrorSubstrings: ["lowercase"],
  },
  {
    name: "name too long (65 chars)",
    content: `---\nname: ${"a".repeat(65)}\ndescription: A test\n---\n`,
    valid: false,
    expectedErrorSubstrings: ["64 characters"],
  },
  {
    name: "name does not match parent directory",
    content: "---\nname: foo\ndescription: A test\n---\n",
    parentDir: "bar",
    valid: false,
    expectedErrorSubstrings: ["does not match"],
  },

  // ── Invalid: description ─────────────────────────────────────

  {
    name: "missing description",
    content: "---\nname: my-skill\n---\n",
    valid: false,
    expectedErrorSubstrings: ["description"],
  },
  {
    name: "empty description",
    content: '---\nname: my-skill\ndescription: ""\n---\n',
    valid: false,
    expectedErrorSubstrings: ["description"],
  },
  {
    name: "description too long (1025 chars)",
    content: `---\nname: my-skill\ndescription: ${"a".repeat(1025)}\n---\n`,
    valid: false,
    expectedErrorSubstrings: ["1024"],
  },

  // ── Invalid: kind ────────────────────────────────────────────

  {
    name: "invalid kind value",
    content: "---\nname: my-skill\ndescription: A test\nkind: workflow\n---\n",
    valid: false,
    expectedErrorSubstrings: ["kind must be"],
  },

  // ── Invalid: dependencies ────────────────────────────────────

  {
    name: "composite without dependencies",
    content:
      "---\nname: my-comp\ndescription: A test\nkind: composite\n---\n",
    valid: false,
    expectedErrorSubstrings: ["must declare at least one dependency"],
  },
  {
    name: "dependencies without composite kind",
    content: [
      "---",
      "name: my-skill",
      "description: A test",
      "dependencies:",
      '  - "@scope/dep"',
      "---",
      "",
    ].join("\n"),
    valid: false,
    expectedErrorSubstrings: ["kind is not"],
  },
  {
    name: "invalid dependency format",
    content: [
      "---",
      "name: my-comp",
      "description: A test",
      "kind: composite",
      "dependencies:",
      '  - "bad-format"',
      "---",
      "",
    ].join("\n"),
    valid: false,
    expectedErrorSubstrings: ["invalid dependency format"],
  },
];
