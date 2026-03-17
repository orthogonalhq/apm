import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, orgMembers, publisherAuthMethods, scopes } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";

/** POST /api/orgs/:name/github-repos/scan — scan a repo for SKILL.md files */
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
  const { repo, scope: scopeName } = body;

  if (!repo) {
    return NextResponse.json({ error: "repo is required" }, { status: 400 });
  }

  // Soft block: repo already connected to a different scope
  if (scopeName) {
    const [currentScope] = await db
      .select({ id: scopes.id })
      .from(scopes)
      .where(and(eq(scopes.name, scopeName), eq(scopes.orgId, org.id)))
      .limit(1);

    if (currentScope) {
      const [conflict] = await db
        .select({ name: scopes.name })
        .from(scopes)
        .where(and(eq(scopes.webhookRepo, repo), ne(scopes.id, currentScope.id)))
        .limit(1);

      if (conflict) {
        return NextResponse.json(
          { error: `This repository is already connected to @${conflict.name}` },
          { status: 409 }
        );
      }
    }
  }

  // Get the default branch first
  const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Authorization: `Bearer ${githubAuth.accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!repoRes.ok) {
    return NextResponse.json(
      { error: `Failed to fetch repo details (${repoRes.status})` },
      { status: 400 }
    );
  }

  const repoData = await repoRes.json();
  const branch = repoData.default_branch ?? "main";

  // Use the Git tree API to list all files recursively (works immediately, no index delay)
  const treeRes = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${githubAuth.accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!treeRes.ok) {
    return NextResponse.json(
      { error: `Failed to fetch repo tree (${treeRes.status})` },
      { status: 400 }
    );
  }

  const treeData = await treeRes.json();
  const allFiles: { path: string }[] = treeData.tree ?? [];

  // Filter for SKILL.md files
  const skillFiles = allFiles.filter(
    (f) => f.path.endsWith("/SKILL.md") || f.path === "SKILL.md"
  );

  // Extract skill info from paths
  const skills = skillFiles.map((item) => {
    const parts = item.path.split("/");
    const dirName = parts.length > 1 ? parts[parts.length - 2] : "root";
    return {
      path: item.path,
      name: dirName,
      repo,
    };
  });

  return NextResponse.json({ skills });
}
