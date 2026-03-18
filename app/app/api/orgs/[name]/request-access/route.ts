import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, orgMembers, scopes, publisherAuthMethods, auditLog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendRequestConfirmation } from "@/lib/email";

async function isGitHubOrgAdmin(orgName: string, publisherId: string): Promise<boolean> {
  const [githubAuth] = await db
    .select()
    .from(publisherAuthMethods)
    .where(and(eq(publisherAuthMethods.publisherId, publisherId), eq(publisherAuthMethods.provider, "github")))
    .limit(1);

  if (!githubAuth?.accessToken || !githubAuth.providerUsername) return false;

  const res = await fetch(
    `https://api.github.com/orgs/${orgName}/memberships/${githubAuth.providerUsername}`,
    { headers: { Authorization: `Bearer ${githubAuth.accessToken}`, Accept: "application/vnd.github+json" } }
  );
  if (!res.ok) return false;
  const data = await res.json();
  return data.role === "admin";
}

/** POST /api/orgs/:name/request-access — request manual verification for a reserved org */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (org.status !== "reserved") {
    return NextResponse.json({ error: "Organization is not reserved" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  // Check if requester is an admin of the matching GitHub org — auto-approve if so
  const githubOrgAdmin = await isGitHubOrgAdmin(name, publisher.id).catch(() => false);

  const [existingMember] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.publisherId, publisher.id)))
    .limit(1);

  if (githubOrgAdmin) {
    await db.update(organizations)
      .set({ status: "active", verified: true, verificationMethod: "github" })
      .where(eq(organizations.id, org.id));

    if (existingMember) {
      await db.update(orgMembers)
        .set({ role: "owner" })
        .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.publisherId, publisher.id)));
    } else {
      await db.insert(orgMembers).values({ orgId: org.id, publisherId: publisher.id, role: "owner" });
    }

    const [existingScope] = await db.select().from(scopes).where(eq(scopes.name, name)).limit(1);
    if (existingScope) {
      await db.update(scopes).set({ verified: true, status: "active" }).where(eq(scopes.id, existingScope.id));
    } else {
      await db.insert(scopes).values({ name, orgId: org.id, verified: true });
    }

    await db.insert(auditLog).values({
      actorId: publisher.id,
      actorType: "publisher",
      action: "org.approve",
      targetType: "organization",
      targetId: org.id,
      metadata: { orgName: name, claimType: "org", approvedPublisherId: publisher.id, approvedBy: publisher.displayName, autoApproved: true, method: "github" },
    });

    return NextResponse.json({ ok: true, autoApproved: true, orgName: name, orgId: org.id, status: "active", verified: true });
  }

  // Not a GitHub org admin — add as pending for manual review
  if (!existingMember) {
    await db.insert(orgMembers).values({
      orgId: org.id,
      publisherId: publisher.id,
      role: "pending",
    });
  }

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "org.request_access",
    targetType: "organization",
    targetId: org.id,
    metadata: {
      orgName: name,
      claimType: "org",
      publisherName: publisher.displayName,
      publisherEmail: publisher.email,
      reason: body.reason || null,
    },
  });

  try {
    if (publisher.email) {
      await sendRequestConfirmation(publisher.email, name, "org");
    }
  } catch {
    // Email failure should not block the request
  }

  return NextResponse.json({
    message: "Access request submitted. We'll review and get back to you.",
    orgName: name,
  });
}
