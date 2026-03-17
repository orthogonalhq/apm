import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, orgMembers, scopes, auditLog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/** PATCH /api/orgs/:name — update organization details */
export async function PATCH(
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

  const body = await req.json();
  const updates: Record<string, string> = {};

  if (body.displayName && typeof body.displayName === "string") {
    updates.displayName = body.displayName.trim();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await db
    .update(organizations)
    .set(updates)
    .where(eq(organizations.id, org.id));

  return NextResponse.json({ ok: true, ...updates });
}

/** DELETE /api/orgs/:name — delete an organization */
export async function DELETE(
  _req: NextRequest,
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

  // Only owners can delete
  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, org.id),
        eq(orgMembers.publisherId, publisher.id),
        eq(orgMembers.role, "owner")
      )
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Only org owners can delete an organization" }, { status: 403 });
  }

  // Delete scopes, members, then org (cascades handle most, but be explicit)
  await db.delete(scopes).where(eq(scopes.orgId, org.id));
  await db.delete(orgMembers).where(eq(orgMembers.orgId, org.id));
  await db.delete(organizations).where(eq(organizations.id, org.id));

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "org.delete",
    targetType: "organization",
    targetId: org.id,
    metadata: { name: org.name, displayName: org.displayName },
  });

  return NextResponse.json({ ok: true });
}
