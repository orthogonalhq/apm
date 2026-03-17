import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import matter from "gray-matter";
import { db, schema } from "@/lib/db";
import { scopes, auditLog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;
  const expected = `sha256=${crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex")}`;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

/** POST /api/webhooks/github — handle push events */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const event = req.headers.get("x-github-event");

  // Verify webhook signature
  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Only handle push events
  if (event !== "push") {
    return NextResponse.json({ ok: true, skipped: event });
  }

  const payload = JSON.parse(body);
  const repo = payload.repository?.full_name;
  const ref = payload.ref; // e.g. "refs/heads/main"
  const defaultBranch = payload.repository?.default_branch ?? "main";

  // Only process pushes to the default branch
  if (ref !== `refs/heads/${defaultBranch}`) {
    return NextResponse.json({ ok: true, skipped: "not default branch" });
  }

  if (!repo) {
    return NextResponse.json({ error: "No repository in payload" }, { status: 400 });
  }

  // Collect all SKILL.md files that were added or modified
  const changedSkillPaths = new Set<string>();
  for (const commit of payload.commits ?? []) {
    for (const path of [...(commit.added ?? []), ...(commit.modified ?? [])]) {
      if (path.endsWith("/SKILL.md") || path === "SKILL.md") {
        changedSkillPaths.add(path);
      }
    }
  }

  if (changedSkillPaths.size === 0) {
    return NextResponse.json({ ok: true, skipped: "no SKILL.md changes" });
  }

  // Find all packages in our DB from this repo to determine the scope
  const existingPackages = await db
    .select({
      id: schema.packages.id,
      scope: schema.packages.scope,
      name: schema.packages.name,
      sourcePath: schema.packages.sourcePath,
      scopeId: schema.packages.scopeId,
    })
    .from(schema.packages)
    .where(eq(schema.packages.sourceRepo, repo));

  // Build a map of sourcePath → package for quick lookup
  const pathToPackage = new Map(
    existingPackages.map((p) => [p.sourcePath, p])
  );

  // Also find scopes linked to this repo (from any existing package)
  const scopeIds = [...new Set(existingPackages.map((p) => p.scopeId).filter(Boolean))] as string[];
  const linkedScopes = scopeIds.length > 0
    ? await db.select().from(scopes).where(
        eq(scopes.id, scopeIds[0])
      )
    : [];
  const defaultScope = linkedScopes[0] ?? null;

  // Use the system GitHub token for fetching (webhook doesn't have user context)
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return NextResponse.json({ error: "No GitHub token configured" }, { status: 500 });
  }

  // Fetch the tree to get blob SHAs
  const treeRes = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/${defaultBranch}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  const treeData = treeRes.ok ? await treeRes.json() : { tree: [] };
  const blobShaMap = new Map<string, string>();
  for (const f of treeData.tree ?? []) {
    if (f.type === "blob") blobShaMap.set(f.path, f.sha);
  }

  // Get repo details
  const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
    },
  });
  const repoData = repoRes.ok ? await repoRes.json() : null;
  const repoStars = repoData?.stargazers_count ?? 0;
  const license = repoData?.license?.spdx_id ?? null;
  const repoUrl = repoData?.html_url ?? `https://github.com/${repo}`;

  let updated = 0;
  let created = 0;
  let skipped = 0;

  for (const path of changedSkillPaths) {
    try {
      const blobSha = blobShaMap.get(path) ?? null;
      const sourcePath = path.includes("/")
        ? path.substring(0, path.lastIndexOf("/"))
        : ".";

      // Check if this skill already exists
      const existingPkg = pathToPackage.get(sourcePath);

      // Skip if blob SHA hasn't changed
      if (existingPkg && blobSha && existingPkg.id) {
        const [fullPkg] = await db
          .select({ lastCommitSha: schema.packages.lastCommitSha })
          .from(schema.packages)
          .where(eq(schema.packages.id, existingPkg.id))
          .limit(1);

        if (fullPkg?.lastCommitSha === blobSha) {
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

      // Determine scope — from existing package or default scope for this repo
      const scopeName = existingPkg?.scope ?? defaultScope?.name;
      const scopeId = existingPkg?.scopeId ?? defaultScope?.id;

      if (!scopeName) {
        skipped++; // Can't determine scope
        continue;
      }

      const kind = (fm.kind as string) || "skill";
      const tags = Array.isArray(fm.tags) ? (fm.tags as string[]) : [];

      const packageData = {
        scope: scopeName,
        name: fmName,
        description: fmDescription,
        kind,
        category: (fm.category as string) || undefined,
        tags,
        compatibility: Array.isArray(fm.compatibility) ? (fm.compatibility as string[]) : [],
        language: (fm.language as string) || undefined,
        allowedTools: Array.isArray(fm.allowed_tools) ? (fm.allowed_tools as string[]) : [],
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
        tokenCount: countTokens(skillMdRaw),
        scopeId,
        lastCommitSha: blobSha,
        lastIndexedAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      if (existingPkg) {
        await db
          .update(schema.packages)
          .set(packageData)
          .where(eq(schema.packages.id, existingPkg.id));
        updated++;
      } else {
        await db
          .insert(schema.packages)
          .values({
            ...packageData,
            firstIndexedAt: new Date(),
          });
        created++;
      }
    } catch {
      skipped++;
    }
  }

  // Log the sync
  if (updated > 0 || created > 0) {
    await db.insert(auditLog).values({
      actorId: null,
      actorType: "system",
      action: "webhook.sync",
      targetType: "scope",
      targetId: defaultScope?.id ?? "unknown",
      metadata: {
        repo,
        ref,
        updated,
        created,
        skipped,
        changedPaths: Array.from(changedSkillPaths),
      },
    });
  }

  return NextResponse.json({ ok: true, updated, created, skipped });
}
