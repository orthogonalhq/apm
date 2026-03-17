import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, orgMembers, scopes, auditLog } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";

const NAME_REGEX = /^[a-z][a-z0-9-]{0,62}[a-z0-9]$/;
const NO_CONSECUTIVE_HYPHENS = /--/;

/** POST /api/orgs — create an organization */
export async function POST(req: NextRequest) {
  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const name = body.name?.toLowerCase?.();

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "Organization name is required" },
      { status: 400 }
    );
  }

  if (
    name.length < 2 ||
    name.length > 64 ||
    !NAME_REGEX.test(name) ||
    NO_CONSECUTIVE_HYPHENS.test(name)
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid name. Must be 2-64 chars, lowercase alphanumeric and hyphens, no leading/trailing/consecutive hyphens.",
      },
      { status: 400 }
    );
  }

  // Check if name is taken
  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);

  if (existing) {
    if (existing.status === "reserved") {
      return NextResponse.json(
        {
          error: "reserved",
          orgId: existing.id,
          orgName: existing.name,
          message: `The namespace '${name}' is reserved. You can claim it by verifying ownership of the matching GitHub organization, or request manual approval.`,
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: `Organization '${name}' already exists` },
      { status: 409 }
    );
  }

  // Check tier limits
  const [ownerCount] = await db
    .select({ count: count() })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.publisherId, publisher.id),
        eq(orgMembers.role, "owner")
      )
    );

  const maxOrgs = 3;
  if (ownerCount.count >= maxOrgs) {
    return NextResponse.json(
      { error: `You can own up to ${maxOrgs} organization(s).` },
      { status: 403 }
    );
  }

  const [org] = await db
    .insert(organizations)
    .values({
      name,
      displayName: body.displayName || name,
      description: body.description || null,
      avatarUrl: body.avatarUrl || null,
      url: body.url || null,
    })
    .returning();

  await db.insert(orgMembers).values({
    orgId: org.id,
    publisherId: publisher.id,
    role: "owner",
  });

  // Auto-create matching namespace
  const [existingScope] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.name, name))
    .limit(1);

  if (!existingScope) {
    await db.insert(scopes).values({
      name,
      orgId: org.id,
    });
  }

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "org.create",
    targetType: "organization",
    targetId: org.id,
    metadata: { name },
  });

  return NextResponse.json(org, { status: 201 });
}
