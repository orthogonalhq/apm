import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { organizations, orgMembers, auditLog, publishers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendNamespaceRejected } from "@/lib/email";

/** POST /api/admin/reject-org — reject a reserved org claim */
export async function POST(req: NextRequest) {
  const admin = await getPublisher();
  if (!admin || !isAdmin(admin.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { orgName, publisherId, reason } = body;

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

  // Remove pending membership
  await db
    .delete(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, org.id),
        eq(orgMembers.publisherId, publisherId)
      )
    );

  await db.insert(auditLog).values({
    actorId: admin.id,
    actorType: "publisher",
    action: "org.reject",
    targetType: "organization",
    targetId: org.id,
    metadata: {
      orgName,
      rejectedPublisherId: publisherId,
      rejectedBy: admin.displayName,
      reason: reason || null,
    },
  });

  // Notify the publisher via email
  try {
    const [pub] = await db
      .select({ email: publishers.email })
      .from(publishers)
      .where(eq(publishers.id, publisherId))
      .limit(1);

    if (pub?.email) {
      await sendNamespaceRejected(pub.email, orgName, reason);
    }
  } catch {
    // Email failure should not block the rejection
  }

  return NextResponse.json({ ok: true, orgName });
}
