import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, orgMembers, auditLog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

async function getOrgAndMembership(orgIdOrName: string, publisherId: string) {
  // orgIdOrName could be a UUID (orgId) passed from client
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgIdOrName))
    .limit(1);

  if (!org) return null;

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, org.id),
        eq(orgMembers.publisherId, publisherId)
      )
    )
    .limit(1);

  if (!membership || !["owner", "admin"].includes(membership.role)) return null;

  return { org, membership };
}

/** PATCH /api/orgs/:name/members — change a member's role */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const ctx = await getOrgAndMembership(name, publisher.id);
  if (!ctx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { publisherId, role } = body;

  if (!publisherId || !["member", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Can't change owner role
  const [target] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, ctx.org.id),
        eq(orgMembers.publisherId, publisherId)
      )
    )
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (target.role === "owner") {
    return NextResponse.json({ error: "Cannot change owner's role" }, { status: 403 });
  }

  // Only owners can promote to admin
  if (role === "admin" && ctx.membership.role !== "owner") {
    return NextResponse.json({ error: "Only owners can promote to admin" }, { status: 403 });
  }

  await db
    .update(orgMembers)
    .set({ role })
    .where(
      and(
        eq(orgMembers.orgId, ctx.org.id),
        eq(orgMembers.publisherId, publisherId)
      )
    );

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "org.change_role",
    targetType: "organization",
    targetId: ctx.org.id,
    metadata: { publisherId, newRole: role },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/orgs/:name/members — remove a member */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const ctx = await getOrgAndMembership(name, publisher.id);
  if (!ctx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { publisherId } = body;

  if (!publisherId) {
    return NextResponse.json({ error: "publisherId required" }, { status: 400 });
  }

  // Can't remove the last owner
  const [target] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, ctx.org.id),
        eq(orgMembers.publisherId, publisherId)
      )
    )
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (target.role === "owner" && publisherId !== publisher.id) {
    return NextResponse.json({ error: "Cannot remove another owner" }, { status: 403 });
  }

  await db
    .delete(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, ctx.org.id),
        eq(orgMembers.publisherId, publisherId)
      )
    );

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "org.remove_member",
    targetType: "organization",
    targetId: ctx.org.id,
    metadata: { removedPublisherId: publisherId },
  });

  return NextResponse.json({ ok: true });
}
