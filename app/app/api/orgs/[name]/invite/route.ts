import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  organizations,
  orgMembers,
  publishers,
  publisherAuthMethods,
  auditLog,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/** POST /api/orgs/:name/invite — invite a member by GitHub username */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Find org by name (the param is orgId from the client, but let's support both)
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, name))
    .limit(1);

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Verify requester is owner or admin
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
    return NextResponse.json(
      { error: "Only owners and admins can invite members" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { username, role } = body;

  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "GitHub username is required" }, { status: 400 });
  }

  const validRoles = ["member", "admin"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Find publisher by GitHub username
  const [authMethod] = await db
    .select({ publisherId: publisherAuthMethods.publisherId })
    .from(publisherAuthMethods)
    .where(
      and(
        eq(publisherAuthMethods.provider, "github"),
        eq(publisherAuthMethods.providerUsername, username.toLowerCase())
      )
    )
    .limit(1);

  if (!authMethod) {
    return NextResponse.json(
      { error: `User '${username}' hasn't signed up yet. They need to sign in with GitHub first.` },
      { status: 404 }
    );
  }

  // Check if already a member
  const [existing] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, org.id),
        eq(orgMembers.publisherId, authMethod.publisherId)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: `'${username}' is already a member of this organization` },
      { status: 409 }
    );
  }

  // Add member
  await db.insert(orgMembers).values({
    orgId: org.id,
    publisherId: authMethod.publisherId,
    role,
    invitedBy: publisher.id,
  });

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "org.invite",
    targetType: "organization",
    targetId: org.id,
    metadata: {
      invitedUsername: username,
      invitedPublisherId: authMethod.publisherId,
      role,
    },
  });

  return NextResponse.json({ ok: true, username, role }, { status: 201 });
}
