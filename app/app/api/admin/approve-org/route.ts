import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { organizations, orgMembers, scopes, auditLog, publishers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendNamespaceApproved } from "@/lib/email";

/** POST /api/admin/approve-org — approve a reserved org or namespace claim */
export async function POST(req: NextRequest) {
  const admin = await getPublisher();
  if (!admin || !isAdmin(admin.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { orgName, publisherId, claimType, targetOrgId } = body;

  if (!orgName || !publisherId) {
    return NextResponse.json(
      { error: "orgName and publisherId are required" },
      { status: 400 }
    );
  }

  if (claimType === "namespace" && targetOrgId) {
    // === Namespace claim: add reserved scope to an existing org ===
    const [scope] = await db
      .select()
      .from(scopes)
      .where(eq(scopes.name, orgName))
      .limit(1);

    if (!scope) {
      return NextResponse.json({ error: "Scope not found" }, { status: 404 });
    }

    // Verify the target org exists
    const [targetOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, targetOrgId))
      .limit(1);

    if (!targetOrg) {
      return NextResponse.json({ error: "Target organization not found" }, { status: 404 });
    }

    // Reassign the scope to the target org and activate it
    await db
      .update(scopes)
      .set({
        orgId: targetOrgId,
        verified: true,
        status: "active",
      })
      .where(eq(scopes.id, scope.id));

    await db.insert(auditLog).values({
      actorId: admin.id,
      actorType: "publisher",
      action: "scope.approve",
      targetType: "scope",
      targetId: scope.id,
      metadata: {
        scopeName: orgName,
        targetOrgId,
        targetOrgName: targetOrg.name,
        claimType: "namespace",
        approvedPublisherId: publisherId,
        approvedBy: admin.displayName,
      },
    });

    // Notify the publisher
    try {
      const [pub] = await db
        .select({ email: publishers.email })
        .from(publishers)
        .where(eq(publishers.id, publisherId))
        .limit(1);
      if (pub?.email) {
        await sendNamespaceApproved(pub.email, orgName, "namespace");
      }
    } catch {}

    return NextResponse.json({
      ok: true,
      claimType: "namespace",
      scopeName: orgName,
      orgName: targetOrg.name,
    });
  }

  // === Org claim: activate reserved org ===
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, orgName))
    .limit(1);

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (org.status !== "reserved") {
    return NextResponse.json(
      { error: `Organization is '${org.status}', not reserved` },
      { status: 400 }
    );
  }

  // Activate the org and mark as verified (admin-approved)
  await db
    .update(organizations)
    .set({
      status: "active",
      verified: true,
      verificationMethod: "admin",
    })
    .where(eq(organizations.id, org.id));

  // Upgrade pending member to owner (or insert if missing)
  const [existingMember] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, org.id),
        eq(orgMembers.publisherId, publisherId)
      )
    )
    .limit(1);

  if (existingMember) {
    await db
      .update(orgMembers)
      .set({ role: "owner" })
      .where(
        and(
          eq(orgMembers.orgId, org.id),
          eq(orgMembers.publisherId, publisherId)
        )
      );
  } else {
    await db.insert(orgMembers).values({
      orgId: org.id,
      publisherId,
      role: "owner",
    });
  }

  // Ensure matching scope exists and is verified
  const [existingScope] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.name, orgName))
    .limit(1);

  if (existingScope) {
    await db
      .update(scopes)
      .set({ verified: true, status: "active" })
      .where(eq(scopes.id, existingScope.id));
  } else {
    await db.insert(scopes).values({
      name: orgName,
      orgId: org.id,
      verified: true,
    });
  }

  await db.insert(auditLog).values({
    actorId: admin.id,
    actorType: "publisher",
    action: "org.approve",
    targetType: "organization",
    targetId: org.id,
    metadata: {
      orgName,
      claimType: "org",
      approvedPublisherId: publisherId,
      approvedBy: admin.displayName,
    },
  });

  // Notify the publisher
  try {
    const [pub] = await db
      .select({ email: publishers.email })
      .from(publishers)
      .where(eq(publishers.id, publisherId))
      .limit(1);
    if (pub?.email) {
      await sendNamespaceApproved(pub.email, orgName, "org");
    }
  } catch {}

  return NextResponse.json({
    ok: true,
    claimType: "org",
    orgName,
    status: "active",
    verified: true,
  });
}
