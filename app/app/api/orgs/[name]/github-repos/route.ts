import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, orgMembers, publisherAuthMethods } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

  return NextResponse.json({ repos: allRepos });
}
