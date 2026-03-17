import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, orgMembers, scopes, auditLog } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";

const SCOPE_NAME_REGEX = /^[a-z][a-z0-9-]{0,62}[a-z0-9]$/;
const NO_CONSECUTIVE_HYPHENS = /--/;

/** POST /api/scopes — create a scope under an org */
export async function POST(req: NextRequest) {
  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const name = body.name?.toLowerCase?.();
  const orgId = body.orgId;

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "Scope name is required" },
      { status: 400 }
    );
  }

  if (!orgId || typeof orgId !== "string") {
    return NextResponse.json(
      { error: "orgId is required" },
      { status: 400 }
    );
  }

  if (
    name.length < 2 ||
    name.length > 64 ||
    !SCOPE_NAME_REGEX.test(name) ||
    NO_CONSECUTIVE_HYPHENS.test(name)
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid scope name. Must be 2-64 chars, lowercase alphanumeric and hyphens, no leading/trailing/consecutive hyphens.",
      },
      { status: 400 }
    );
  }

  // Verify the org exists
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  // Verify the user is an owner or admin of the org
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
    return NextResponse.json(
      { error: "You must be an owner or admin of this organization" },
      { status: 403 }
    );
  }

  // Check namespace limit
  const maxNamespaces = org.verified ? 5 : 1;
  const [scopeCount] = await db
    .select({ count: count() })
    .from(scopes)
    .where(eq(scopes.orgId, orgId));

  if (scopeCount.count >= maxNamespaces) {
    return NextResponse.json(
      { error: `Namespace limit reached (${maxNamespaces}). ${org.verified ? "" : "Verify your organization to unlock more."}`.trim() },
      { status: 403 }
    );
  }

  // Check if scope name already exists
  const [existing] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.name, name))
    .limit(1);

  if (existing) {
    if (existing.status === "reserved") {
      return NextResponse.json(
        {
          error: "reserved",
          scopeId: existing.id,
          scopeName: existing.name,
          message: `The namespace '${name}' is reserved. You can claim it by verifying ownership of the matching GitHub organization, or request manual approval.`,
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: `Scope '${name}' is already claimed` },
      { status: 409 }
    );
  }

  const [scope] = await db
    .insert(scopes)
    .values({
      orgId,
      name,
    })
    .returning();

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "scope.create",
    targetType: "scope",
    targetId: scope.id,
    metadata: { name, orgId },
  });

  return NextResponse.json(scope, { status: 201 });
}
