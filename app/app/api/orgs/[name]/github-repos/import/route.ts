import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import {
  organizations,
  orgMembers,
  scopes,
  publisherAuthMethods,
  auditLog,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import matter from "gray-matter";

function countTokens(text: string): number {
  // Rough estimate: ~4 chars per token for English text
  return Math.ceil(text.length / 4);
}

/** POST /api/orgs/:name/github-repos/import — import SKILL.md files from a repo */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: orgName } = await params;

  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, orgName))
    .limit(1);

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, org.id),
        eq(orgMembers.publisherId, publisher.id)
      )
    )
    .limit(1);

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [githubAuth] = await db
    .select()
    .from(publisherAuthMethods)
    .where(
      and(
        eq(publisherAuthMethods.publisherId, publisher.id),
        eq(publisherAuthMethods.provider, "github")
      )
    )
    .limit(1);

  if (!githubAuth?.accessToken) {
    return NextResponse.json({ error: "No GitHub token found" }, { status: 400 });
  }

  const body = await req.json();
  const { repo, scope: scopeName, paths } = body;

  if (!repo || !scopeName || !Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json(
      { error: "repo, scope, and paths are required" },
      { status: 400 }
    );
  }

  // Verify scope belongs to this org
  const [scope] = await db
    .select()
    .from(scopes)
    .where(
      and(eq(scopes.name, scopeName), eq(scopes.orgId, org.id))
    )
    .limit(1);

  if (!scope) {
    return NextResponse.json(
      { error: `Scope '${scopeName}' not found under this org` },
      { status: 404 }
    );
  }

  // Get repo details for stars, license, etc.
  const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Authorization: `Bearer ${githubAuth.accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });
  const repoData = repoRes.ok ? await repoRes.json() : null;
  const repoStars = repoData?.stargazers_count ?? 0;
  const license = repoData?.license?.spdx_id ?? null;
  const defaultBranch = repoData?.default_branch ?? "main";
  const repoUrl = repoData?.html_url ?? `https://github.com/${repo}`;

  // Fetch the full tree to get blob SHAs for change detection
  const treeRes = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/${defaultBranch}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${githubAuth.accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  const treeData = treeRes.ok ? await treeRes.json() : { tree: [] };
  const blobShaMap = new Map<string, string>();
  for (const f of treeData.tree ?? []) {
    if (f.type === "blob") blobShaMap.set(f.path, f.sha);
  }

  let imported = 0;
  let skipped = 0;

  for (const path of paths) {
    try {
      const blobSha = blobShaMap.get(path) ?? null;

      // Check if the file has changed since last import
      if (blobSha) {
        const [existingPkg] = await db
          .select({ lastCommitSha: schema.packages.lastCommitSha, name: schema.packages.name })
          .from(schema.packages)
          .where(
            and(
              eq(schema.packages.scope, scopeName),
              eq(schema.packages.sourceRepo, repo)
            )
          )
          .limit(1);

        // If blob SHA matches, skip (no changes) — unless forced
        if (existingPkg?.lastCommitSha === blobSha && !body.force) {
          skipped++;
          continue;
        }
      }

      // Fetch the SKILL.md content
      const rawUrl = `https://raw.githubusercontent.com/${repo}/${defaultBranch}/${path}`;
      const fetchRes = await fetch(rawUrl);
      if (!fetchRes.ok) {
        skipped++;
        continue;
      }

      const skillMdRaw = await fetchRes.text();

      // Parse frontmatter
      let parsed: matter.GrayMatterFile<string>;
      try {
        parsed = matter(skillMdRaw);
      } catch {
        skipped++;
        continue;
      }

      const fm = parsed.data as Record<string, unknown>;
      const fmName = fm.name as string | undefined;
      const fmDescription = fm.description as string | undefined;

      if (!fmName || !fmDescription) {
        skipped++;
        continue;
      }

      const kind = (fm.kind as string) || "skill";
      const tags = Array.isArray(fm.tags) ? (fm.tags as string[]) : [];
      const category = (fm.category as string) || undefined;
      const language = (fm.language as string) || undefined;
      const compatibility = Array.isArray(fm.compatibility)
        ? (fm.compatibility as string[])
        : [];
      const allowedTools = Array.isArray(fm.allowed_tools)
        ? (fm.allowed_tools as string[])
        : [];

      // Derive source path (directory of SKILL.md)
      const sourcePath = path.includes("/")
        ? path.substring(0, path.lastIndexOf("/"))
        : ".";

      const packageData = {
        scope: scopeName,
        name: fmName,
        description: fmDescription,
        kind,
        category,
        tags,
        compatibility,
        language,
        allowedTools,
        sourceRepo: repo,
        sourcePath,
        sourceRef: defaultBranch,
        repoUrl,
        repoOwner: repo.split("/")[0],
        repoStars,
        license,
        author: (fm.author as string) || repo.split("/")[0],
        skillMdRaw,
        frontmatter: fm,
        scopeId: scope.id,
        tokenCount: countTokens(skillMdRaw),
        verified: scope.verified,
        lastCommitSha: blobSha,
        lastIndexedAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      // Upsert — check if package already exists under this scope
      const [existing] = await db
        .select({ id: schema.packages.id, version: schema.packages.version })
        .from(schema.packages)
        .where(
          and(
            eq(schema.packages.scope, scopeName),
            eq(schema.packages.name, fmName)
          )
        )
        .limit(1);

      // Determine version: frontmatter > auto-increment > 1.0.0
      const fmVersion = fm.version as string | undefined;
      let version: string;
      if (fmVersion) {
        version = fmVersion;
      } else if (existing?.version) {
        // Auto-increment patch: 1.0.0 → 1.0.1
        const parts = existing.version.split(".");
        const patch = parseInt(parts[2] || "0", 10) + 1;
        version = `${parts[0] || "1"}.${parts[1] || "0"}.${patch}`;
      } else {
        version = "1.0.0";
      }

      if (existing) {
        await db
          .update(schema.packages)
          .set({ ...packageData, version })
          .where(eq(schema.packages.id, existing.id));
      } else {
        await db
          .insert(schema.packages)
          .values({
            ...packageData,
            version,
            firstIndexedAt: new Date(),
          });
      }

      imported++;
    } catch {
      skipped++;
    }
  }

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "scope.sync",
    targetType: "scope",
    targetId: scope.id,
    metadata: {
      repo,
      scopeName,
      imported,
      skipped,
      totalPaths: paths.length,
    },
  });

  return NextResponse.json({ imported, skipped });
}
