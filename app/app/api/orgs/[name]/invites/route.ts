import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, orgMembers, orgInvites, auditLog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/** POST /api/orgs/:name/invites — create an invite link */
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

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.publisherId, publisher.id)))
    .limit(1);

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { maxUses, expiresInDays } = body;

  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt =
    expiresInDays && expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 86400000)
      : null;

  const [invite] = await db
    .insert(orgInvites)
    .values({
      orgId: org.id,
      token,
      role: "member",
      maxUses: maxUses && maxUses > 0 ? maxUses : null,
      expiresAt,
      createdBy: publisher.id,
    })
    .returning();

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "org.create_invite",
    targetType: "organization",
    targetId: org.id,
    metadata: { inviteId: invite.id, maxUses: invite.maxUses, expiresAt: invite.expiresAt },
  });

  const url = `${process.env.NEXT_PUBLIC_URL}/invite/${token}`;

  return NextResponse.json({ ...invite, url }, { status: 201 });
}

/** GET /api/orgs/:name/invites — list active invite links */
export async function GET(
  _req: NextRequest,
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

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.publisherId, publisher.id)))
    .limit(1);

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await db
    .select()
    .from(orgInvites)
    .where(eq(orgInvites.orgId, org.id))
    .orderBy(orgInvites.createdAt);

  const baseUrl = process.env.NEXT_PUBLIC_URL;
  const result = invites.map((inv) => ({
    ...inv,
    url: `${baseUrl}/invite/${inv.token}`,
  }));

  return NextResponse.json(result);
}
