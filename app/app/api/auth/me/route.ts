import { NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { publisherAuthMethods, scopeMembers, scopes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const authMethods = await db
    .select({
      provider: publisherAuthMethods.provider,
      providerUsername: publisherAuthMethods.providerUsername,
      createdAt: publisherAuthMethods.createdAt,
    })
    .from(publisherAuthMethods)
    .where(eq(publisherAuthMethods.publisherId, publisher.id));

  const memberships = await db
    .select({
      scopeName: scopes.name,
      scopeVerified: scopes.verified,
      role: scopeMembers.role,
    })
    .from(scopeMembers)
    .innerJoin(scopes, eq(scopes.id, scopeMembers.scopeId))
    .where(eq(scopeMembers.publisherId, publisher.id));

  return NextResponse.json({
    id: publisher.id,
    displayName: publisher.displayName,
    email: publisher.email,
    avatarUrl: publisher.avatarUrl,
    createdAt: publisher.createdAt,
    authMethods,
    scopes: memberships,
  });
}
