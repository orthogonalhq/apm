import { NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { publisherAuthMethods, orgMembers, organizations } from "@/lib/db/schema";
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
      orgName: organizations.name,
      orgVerified: organizations.verified,
      role: orgMembers.role,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(organizations.id, orgMembers.orgId))
    .where(eq(orgMembers.publisherId, publisher.id));

  return NextResponse.json({
    id: publisher.id,
    displayName: publisher.displayName,
    email: publisher.email,
    avatarUrl: publisher.avatarUrl,
    createdAt: publisher.createdAt,
    authMethods,
    organizations: memberships,
  });
}
