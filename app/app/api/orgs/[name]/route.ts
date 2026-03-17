import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, orgMembers, scopes, auditLog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
