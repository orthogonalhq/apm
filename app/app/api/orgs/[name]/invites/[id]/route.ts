import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, orgMembers, orgInvites, auditLog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/** DELETE /api/orgs/:name/invites/:id — revoke an invite link */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string; id: string }> }
) {
  const { name, id } = await params;
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
    .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.publisherId, publisher.id)))
    .limit(1);

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .delete(orgInvites)
    .where(and(eq(orgInvites.id, id), eq(orgInvites.orgId, org.id)));

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "org.revoke_invite",
    targetType: "organization",
    targetId: org.id,
    metadata: { inviteId: id },
  });

  return NextResponse.json({ ok: true });
}
