import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  organizations,
  orgMembers,
  scopes,
  publisherAuthMethods,
  auditLog,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/scopes/:name/verify
 *
 * Verify an organization via github_org method.
 * Checks the publisher is an admin of the matching GitHub org.
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

  // Find the org
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);

  if (!org) {
    return NextResponse.json(
      { error: `Organization '${name}' not found` },
      { status: 404 }
    );
  }

  const isReservedClaim = org.status === "reserved";

  if (org.verified && !isReservedClaim) {
    return NextResponse.json(
      { error: "Organization is already verified" },
      { status: 400 }
    );
  }

  // For active orgs, check the publisher is an owner or admin
  // For reserved orgs, skip — GitHub verification is the proof of ownership
  if (!isReservedClaim) {
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
      return NextResponse.json(
        { error: "Only organization owners and admins can verify" },
        { status: 403 }
      );
    }
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

  // Check if the publisher is an admin of the GitHub org
  const targetOrg = org.name;
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

  const ghMembership = await membershipRes.json();

  if (ghMembership.role !== "admin") {
    return NextResponse.json(
      {
        error: `You are a member of '${targetOrg}' but not an owner or admin. Verification requires admin access.`,
      },
      { status: 403 }
    );
  }

  // Verification passed — update the org
  await db
    .update(organizations)
    .set({
      verified: true,
      verificationMethod: "github_org",
      ...(isReservedClaim ? { status: "active" } : {}),
    })
    .where(eq(organizations.id, org.id));

  // For reserved claims, make the verifying user the owner + ensure scope exists
  if (isReservedClaim) {
    await db.insert(orgMembers).values({
      orgId: org.id,
      publisherId: publisher.id,
      role: "owner",
    });

    // Auto-create matching namespace if not already seeded
    const [existingScope] = await db
      .select()
      .from(scopes)
      .where(eq(scopes.name, org.name))
      .limit(1);

    if (!existingScope) {
      await db.insert(scopes).values({
        name: org.name,
        orgId: org.id,
        verified: true,
      });
    } else {
      // Mark pre-seeded scope as verified too
      await db
        .update(scopes)
        .set({ verified: true })
        .where(eq(scopes.id, existingScope.id));
    }
  }

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "org.verify",
    targetType: "organization",
    targetId: org.id,
    metadata: {
      method: "github_org",
      org: targetOrg,
    },
  });

  return NextResponse.json({
    organization: name,
    verified: true,
    verificationMethod: "github_org",
  });
}
