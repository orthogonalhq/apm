import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { scopes, organizations, orgMembers, auditLog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendRequestConfirmation } from "@/lib/email";

/** POST /api/scopes/:name/request-access — request a reserved namespace under an existing org */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Find the reserved scope
  const [scope] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.name, name))
    .limit(1);

  if (!scope) {
    return NextResponse.json({ error: "Namespace not found" }, { status: 404 });
  }

  if (scope.status !== "reserved") {
    return NextResponse.json({ error: "Namespace is not reserved" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { orgId, reason } = body;

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  // Verify the user is owner/admin of the target org
  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, orgId),
        eq(orgMembers.publisherId, publisher.id)
      )
    )
    .limit(1);

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "You must be an owner or admin of the target organization" }, { status: 403 });
  }

  // Get the org name for the audit log
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "scope.request_access",
    targetType: "scope",
    targetId: scope.id,
    metadata: {
      scopeName: name,
      orgId,
      orgName: org?.name ?? null,
      claimType: "namespace",
      publisherName: publisher.displayName,
      publisherEmail: publisher.email,
      reason: reason || null,
    },
  });

  // Send confirmation email
  try {
    if (publisher.email) {
      await sendRequestConfirmation(publisher.email, name, "namespace");
    }
  } catch {
    // Email failure should not block the request
  }

  return NextResponse.json({
    message: "Request submitted. We'll review and get back to you.",
    scopeName: name,
  });
}
