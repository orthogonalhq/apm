/**
 * Local test script — runs the GitHub SKILL.md search + validation
 * without touching the cron or database.
 *
 * Usage:  npx tsx scripts/test-search.ts
 */

import "dotenv/config";
import { searchSkillFiles, getFileContent, checkFileExists } from "../lib/github";
import { validateSkillMd } from "../lib/validator";

const LIMIT = 10;

interface Result {
  repo: string;
  path: string;
  stars: number;
  license: string | null;
  branch: string;
  excluded: boolean;
  valid: boolean;
  validationErrors: string[];
  frontmatter: Record<string, unknown> | null;
  contentPreview: string;
}

async function main() {
  console.log(`\n🔎  Searching GitHub for SKILL.md files (limit: ${LIMIT})...\n`);

  const search = await searchSkillFiles(1, LIMIT);
  console.log(`Total results reported by GitHub: ${search.totalCount}`);
  console.log(`Items returned this page: ${search.items.length}\n`);

  const results: Result[] = [];

  for (const item of search.items) {
    const repo = item.repository.full_name;
    const entry: Result = {
      repo,
      path: item.path,
      stars: item.repository.stargazers_count,
      license: item.repository.license?.spdx_id ?? null,
      branch: item.repository.default_branch,
      excluded: false,
      valid: false,
      validationErrors: [],
      frontmatter: null,
      contentPreview: "",
    };

    try {
      // Check .apm-exclude
      const excluded = await checkFileExists(repo, ".apm-exclude");
      if (excluded) {
        entry.excluded = true;
        results.push(entry);
        continue;
      }

      // Fetch content
      const file = await getFileContent(repo, item.path, item.repository.default_branch);
      const content = Buffer.from(file.content, "base64").toString("utf-8");
      entry.contentPreview = content.slice(0, 300);

      // Validate
      const pathParts = item.path.split("/");
      const parentDir = pathParts.length >= 2 ? pathParts[pathParts.length - 2] : undefined;
      const validation = validateSkillMd(content, parentDir);

      entry.valid = validation.valid;
      entry.validationErrors = validation.errors;
      entry.frontmatter = validation.frontmatter as Record<string, unknown> | null;
    } catch (err) {
      entry.validationErrors = [err instanceof Error ? err.message : String(err)];
    }

    results.push(entry);
  }

  // ── Summary ──────────────────────────────────────────────
  console.log("=".repeat(80));
  console.log("RESULTS");
  console.log("=".repeat(80));

  for (const [i, r] of results.entries()) {
    console.log(`\n--- [${i + 1}] ${r.repo} ---`);
    console.log(`  Path:     ${r.path}`);
    console.log(`  Stars:    ${r.stars}`);
    console.log(`  License:  ${r.license ?? "none"}`);
    console.log(`  Branch:   ${r.branch}`);
    console.log(`  Excluded: ${r.excluded}`);
    console.log(`  Valid:    ${r.valid}`);
    if (r.validationErrors.length) {
      console.log(`  Errors:   ${r.validationErrors.join("; ")}`);
    }
    if (r.frontmatter) {
      console.log(`  Frontmatter:`, JSON.stringify(r.frontmatter, null, 4));
    }
    console.log(`  Preview:\n${r.contentPreview}\n`);
  }

  // ── Aggregate stats ──────────────────────────────────────
  const valid = results.filter((r) => r.valid).length;
  const excluded = results.filter((r) => r.excluded).length;
  const invalid = results.filter((r) => !r.valid && !r.excluded).length;

  console.log("=".repeat(80));
  console.log("AGGREGATE");
  console.log("=".repeat(80));
  console.log(`  Total:    ${results.length}`);
  console.log(`  Valid:    ${valid}`);
  console.log(`  Excluded: ${excluded}`);
  console.log(`  Invalid:  ${invalid}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
