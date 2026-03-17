import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { organizations, orgMembers, scopes, auditLog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/** POST /api/admin/approve-org — approve a reserved org claim */
export async function POST(req: NextRequest) {
  const admin = await getPublisher();
  if (!admin || !isAdmin(admin.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { orgName, publisherId } = body;

  if (!orgName || !publisherId) {
    return NextResponse.json(
      { error: "orgName and publisherId are required" },
      { status: 400 }
    );
  }

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

  // Upgrade pending member to owner (or insert if somehow missing)
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
      approvedPublisherId: publisherId,
      approvedBy: admin.displayName,
    },
  });

  return NextResponse.json({
    ok: true,
    orgName,
    status: "active",
    verified: true,
  });
}
