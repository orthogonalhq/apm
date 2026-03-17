import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, orgMembers, publisherAuthMethods, scopes } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";

/** GET /api/orgs/:name/github-repos — list repos accessible to the user */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: orgName } = await params;

  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Find org
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, orgName))
    .limit(1);

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Verify membership
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

  // Get GitHub token
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

  // Fetch user's repos (including org repos they have access to)
  const allRepos: { name: string; full_name: string; description: string | null; html_url: string }[] = [];

  // Fetch personal repos
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&type=all`,
      {
        headers: {
          Authorization: `Bearer ${githubAuth.accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );
    if (!res.ok) break;
    const repos = await res.json();
    if (repos.length === 0) break;
    allRepos.push(
      ...repos.map((r: { name: string; full_name: string; description: string | null; html_url: string }) => ({
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        html_url: r.html_url,
      }))
    );
  }

  // Build a map of repo → { scope, org } for repos already connected
  const connectedScopes = await db
    .select({ webhookRepo: scopes.webhookRepo, scopeName: scopes.name, orgName: organizations.name })
    .from(scopes)
    .innerJoin(organizations, eq(organizations.id, scopes.orgId))
    .where(isNotNull(scopes.webhookRepo));

  const connectedRepos: Record<string, { scope: string; org: string }> = {};
  for (const s of connectedScopes) {
    if (s.webhookRepo) connectedRepos[s.webhookRepo] = { scope: s.scopeName, org: s.orgName };
  }

  return NextResponse.json({ repos: allRepos, connectedRepos });
}

/** DELETE /api/orgs/:name/github-repos — unlink the connected repo from a scope */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: orgName } = await params;

  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { scope: scopeName } = await req.json();
  if (!scopeName) {
    return NextResponse.json({ error: "scope is required" }, { status: 400 });
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, orgName))
    .limit(1);

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.publisherId, publisher.id)))
    .limit(1);

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [scope] = await db
    .select()
    .from(scopes)
    .where(and(eq(scopes.name, scopeName), eq(scopes.orgId, org.id)))
    .limit(1);

  if (!scope) return NextResponse.json({ error: "Scope not found" }, { status: 404 });

  // Best-effort: delete the GitHub webhook if we have a token and repo
  if (scope.webhookRepo) {
    const [githubAuth] = await db
      .select({ accessToken: publisherAuthMethods.accessToken })
      .from(publisherAuthMethods)
      .where(and(eq(publisherAuthMethods.publisherId, publisher.id), eq(publisherAuthMethods.provider, "github")))
      .limit(1);

    if (githubAuth?.accessToken) {
      const webhookUrl = `${process.env.NEXT_PUBLIC_URL ?? ""}/api/webhooks/github`;
      const hooksRes = await fetch(`https://api.github.com/repos/${scope.webhookRepo}/hooks`, {
        headers: { Authorization: `Bearer ${githubAuth.accessToken}`, Accept: "application/vnd.github+json" },
      }).catch(() => null);

      if (hooksRes?.ok) {
        const hooks = await hooksRes.json().catch(() => []);
        const ourHook = hooks.find(
          (h: { config: { url: string }; id: number }) => h.config?.url === webhookUrl
        );
        if (ourHook) {
          await fetch(`https://api.github.com/repos/${scope.webhookRepo}/hooks/${ourHook.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${githubAuth.accessToken}`, Accept: "application/vnd.github+json" },
          }).catch(() => {});
        }
      }
    }
  }

  await db
    .update(scopes)
    .set({ webhookRepo: null, webhookSecret: null })
    .where(eq(scopes.id, scope.id));

  return NextResponse.json({ ok: true });
}
