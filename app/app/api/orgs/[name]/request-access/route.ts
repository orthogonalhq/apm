import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, orgMembers, auditLog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendRequestConfirmation } from "@/lib/email";

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

  // Add user as pending member (idempotent — skip if already pending)
  const [existingMember] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, org.id),
        eq(orgMembers.publisherId, publisher.id)
      )
    )
    .limit(1);

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

  // Send confirmation email
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
