import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { personalAccessTokens, auditLog } from "@/lib/db/schema";
import { generateToken } from "@/lib/auth/tokens";
import { eq } from "drizzle-orm";

/** POST /api/auth/tokens — create a personal access token */
export async function POST(req: NextRequest) {
  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const name = body.name;

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "Token name is required" },
      { status: 400 }
    );
  }

  const { plain, hash } = generateToken();

  const [token] = await db
    .insert(personalAccessTokens)
    .values({
      publisherId: publisher.id,
      name,
      tokenHash: hash,
      scopeId: body.scopeId || null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .returning({
      id: personalAccessTokens.id,
      name: personalAccessTokens.name,
      createdAt: personalAccessTokens.createdAt,
    });

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "token.create",
    targetType: "publisher",
    targetId: publisher.id,
    metadata: { tokenId: token.id, tokenName: name },
  });

  // Plain token is only shown once
  return NextResponse.json({ ...token, token: plain }, { status: 201 });
}

/** GET /api/auth/tokens — list personal access tokens */
export async function GET() {
  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tokens = await db
    .select({
      id: personalAccessTokens.id,
      name: personalAccessTokens.name,
      scopeId: personalAccessTokens.scopeId,
      expiresAt: personalAccessTokens.expiresAt,
      lastUsedAt: personalAccessTokens.lastUsedAt,
      createdAt: personalAccessTokens.createdAt,
    })
    .from(personalAccessTokens)
    .where(eq(personalAccessTokens.publisherId, publisher.id));

  return NextResponse.json({ tokens });
}
