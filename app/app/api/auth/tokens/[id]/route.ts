import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { personalAccessTokens, auditLog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/** DELETE /api/auth/tokens/:id — revoke a personal access token */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [token] = await db
    .select({ id: personalAccessTokens.id, name: personalAccessTokens.name })
    .from(personalAccessTokens)
    .where(
      and(
        eq(personalAccessTokens.id, id),
        eq(personalAccessTokens.publisherId, publisher.id)
      )
    )
    .limit(1);

  if (!token) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  await db
    .delete(personalAccessTokens)
    .where(eq(personalAccessTokens.id, id));

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "token.revoke",
    targetType: "publisher",
    targetId: publisher.id,
    metadata: { tokenId: id, tokenName: token.name },
  });

  return NextResponse.json({ ok: true });
}
