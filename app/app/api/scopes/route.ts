import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { scopes, scopeMembers, auditLog } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";

const SCOPE_NAME_REGEX = /^[a-z][a-z0-9-]{0,62}[a-z0-9]$/;
const NO_CONSECUTIVE_HYPHENS = /--/;

/** POST /api/scopes — claim a scope */
export async function POST(req: NextRequest) {
  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const name = body.name?.toLowerCase?.();

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "Scope name is required" },
      { status: 400 }
    );
  }

  // Validate naming rules
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

  // Check if scope already exists
  const [existing] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.name, name))
    .limit(1);

  if (existing) {
    if (existing.status === "reserved") {
      return NextResponse.json(
        {
          error: `Scope '${name}' is reserved. Contact support to claim it.`,
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: `Scope '${name}' is already claimed` },
      { status: 409 }
    );
  }

  // Check tier limits
  const [ownerCount] = await db
    .select({ count: count() })
    .from(scopeMembers)
    .where(
      and(
        eq(scopeMembers.publisherId, publisher.id),
        eq(scopeMembers.role, "owner")
      )
    );

  // TODO: check verified status for higher limit
  const maxScopes = 1;
  if (ownerCount.count >= maxScopes) {
    return NextResponse.json(
      {
        error: `You can own up to ${maxScopes} scope(s). Verify a scope to increase your limit.`,
      },
      { status: 403 }
    );
  }

  // Create scope + membership
  const [scope] = await db
    .insert(scopes)
    .values({
      name,
      displayName: body.displayName || name,
      description: body.description || null,
      url: body.url || null,
    })
    .returning();

  await db.insert(scopeMembers).values({
    scopeId: scope.id,
    publisherId: publisher.id,
    role: "owner",
  });

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "scope.claim",
    targetType: "scope",
    targetId: scope.id,
    metadata: { name },
  });

  return NextResponse.json(scope, { status: 201 });
}
