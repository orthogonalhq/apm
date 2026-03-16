import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  scopes,
  scopeMembers,
  publisherAuthMethods,
  auditLog,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/scopes/:name/verify
 *
 * Verify a scope via github_org method.
 * For reserved scopes: checks the publisher admins the GitHub org in `reserved_for`.
 * For claimed scopes: checks the publisher admins a GitHub org matching the scope name.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Find the scope
  const [scope] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.name, name))
    .limit(1);

  if (!scope) {
    return NextResponse.json(
      { error: `Scope '${name}' not found` },
      { status: 404 }
    );
  }

  if (scope.verified) {
    return NextResponse.json(
      { error: "Scope is already verified" },
      { status: 400 }
    );
  }

  // Get publisher's GitHub auth method
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

  if (!githubAuth || !githubAuth.accessToken) {
    return NextResponse.json(
      {
        error:
          "No GitHub account linked, or GitHub token is missing. Log in with GitHub first.",
      },
      { status: 400 }
    );
  }

  // Determine which GitHub org to verify against
  const targetOrg = scope.reservedFor || scope.name;

  // Check if the publisher is an admin of the target org
  const membershipRes = await fetch(
    `https://api.github.com/orgs/${targetOrg}/memberships/${githubAuth.providerUsername}`,
    {
      headers: {
        Authorization: `Bearer ${githubAuth.accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!membershipRes.ok) {
    const status = membershipRes.status;
    if (status === 404) {
      return NextResponse.json(
        {
          error: `You are not a member of the GitHub organization '${targetOrg}'.`,
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      {
        error: `Failed to verify GitHub org membership. GitHub API returned ${status}.`,
      },
      { status: 400 }
    );
  }

  const membership = await membershipRes.json();

  if (membership.role !== "admin") {
    return NextResponse.json(
      {
        error: `You are a member of '${targetOrg}' but not an admin. Scope verification requires admin access.`,
      },
      { status: 403 }
    );
  }

  // Verification passed — update the scope
  const isReserved = scope.status === "reserved";

  await db
    .update(scopes)
    .set({
      verified: true,
      verificationMethod: "github_org",
      status: "active",
    })
    .where(eq(scopes.id, scope.id));

  // If reserved scope, add the publisher as owner
  if (isReserved) {
    await db.insert(scopeMembers).values({
      scopeId: scope.id,
      publisherId: publisher.id,
      role: "owner",
    });
  }

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "scope.verify",
    targetType: "scope",
    targetId: scope.id,
    metadata: {
      method: "github_org",
      org: targetOrg,
      wasReserved: isReserved,
    },
  });

  return NextResponse.json({
    scope: name,
    verified: true,
    verificationMethod: "github_org",
    status: "active",
  });
}
