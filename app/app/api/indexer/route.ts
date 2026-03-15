import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import {
  searchSkillFiles,
  getFileContent,
  checkFileExists,
  RateLimitError,
} from "@/lib/github";
import { validateSkillMd } from "@/lib/validator";
import type { IndexerResponse } from "@apm/types";

export const maxDuration = 300; // 5 min for Vercel Pro

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result: IndexerResponse = { indexed: 0, skipped: 0, errors: [] };
  const maxPages = 10; // 10 pages * 100 = 1000 results (GitHub max)

  try {
    for (let page = 1; page <= maxPages; page++) {
      let searchResult;
      try {
        searchResult = await searchSkillFiles(page);
      } catch (err) {
        if (err instanceof RateLimitError) {
          result.errors.push(
            `Rate limited at page ${page}, retry after ${err.retryAfterSeconds}s`
          );
          break;
        }
        throw err;
      }

      if (searchResult.items.length === 0) break;

      for (const item of searchResult.items) {
        try {
          const repo = item.repository.full_name;

          // Check for .apm-exclude
          const excluded = await checkFileExists(repo, ".apm-exclude");
          if (excluded) {
            result.skipped++;
            continue;
          }

          // Fetch SKILL.md content
          const file = await getFileContent(
            repo,
            item.path,
            item.repository.default_branch
          );
          const content = Buffer.from(file.content, "base64").toString("utf-8");

          // Extract parent directory name
          const pathParts = item.path.split("/");
          const parentDir =
            pathParts.length >= 2
              ? pathParts[pathParts.length - 2]
              : undefined;

          // Validate
          const validation = validateSkillMd(content, parentDir);
          if (!validation.valid) {
            result.skipped++;
            continue;
          }

          const fm = validation.frontmatter!;
          const sourcePath = item.path.replace(/\/SKILL\.md$/, "");

          // Upsert
          await db
            .insert(schema.packages)
            .values({
              name: fm.name,
              description: fm.description,
              sourceRepo: repo,
              sourcePath,
              sourceRef: item.repository.default_branch,
              repoOwner: item.repository.owner.login,
              repoStars: item.repository.stargazers_count,
              license: item.repository.license?.spdx_id ?? null,
              skillMdRaw: content,
              frontmatter: fm as Record<string, unknown>,
              lastCommitSha: file.sha,
              lastIndexedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: schema.packages.name,
              set: {
                description: fm.description,
                sourceRepo: repo,
                sourcePath,
                sourceRef: item.repository.default_branch,
                repoOwner: item.repository.owner.login,
                repoStars: item.repository.stargazers_count,
                license: item.repository.license?.spdx_id ?? null,
                skillMdRaw: content,
                frontmatter: fm as Record<string, unknown>,
                lastCommitSha: file.sha,
                lastIndexedAt: new Date(),
              },
            });

          result.indexed++;
        } catch (err) {
          result.errors.push(
            `Error processing ${item.repository.full_name}/${item.path}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      // Stop if we've processed all results
      if (searchResult.items.length < 100) break;
    }
  } catch (err) {
    result.errors.push(
      `Fatal: ${err instanceof Error ? err.message : String(err)}`
    );
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
