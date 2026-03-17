import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { scopes, orgMembers, packages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/** DELETE /api/scopes/:name — delete a namespace and its packages */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [scope] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.name, name))
    .limit(1);

  if (!scope) {
    return NextResponse.json({ error: "Namespace not found" }, { status: 404 });
  }

  // Only org owners can delete a namespace
  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, scope.orgId),
        eq(orgMembers.publisherId, publisher.id),
        eq(orgMembers.role, "owner")
      )
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Only org owners can delete a namespace" }, { status: 403 });
  }

  // Delete packages, then the scope
  await db.delete(packages).where(eq(packages.scope, name));
  await db.delete(scopes).where(eq(scopes.id, scope.id));

  return NextResponse.json({ ok: true });
}
