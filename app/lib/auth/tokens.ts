import crypto from "crypto";
import { db } from "@/lib/db";
import {
  personalAccessTokens,
  scopeTokens,
  scopeMembers,
  publishers,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export function generateToken(): { plain: string; hash: string } {
  const plain = `apm_${crypto.randomBytes(24).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(plain).digest("hex");
  return { plain, hash };
}

export function hashToken(plain: string): string {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

type ResolvedAuth =
  | { type: "personal"; publisherId: string; scopeId: string | null }
  | { type: "scope"; scopeId: string };

/**
 * Resolve a bearer token to an identity.
 * Returns the publisher ID and optional scope restriction.
 */
export async function resolveToken(
  bearer: string
): Promise<ResolvedAuth | null> {
  const hash = hashToken(bearer);

  // Check personal access tokens
  const [pat] = await db
    .select()
    .from(personalAccessTokens)
    .where(eq(personalAccessTokens.tokenHash, hash))
    .limit(1);

  if (pat) {
    if (pat.expiresAt && pat.expiresAt < new Date()) return null;

    // Update last_used_at
    await db
      .update(personalAccessTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(personalAccessTokens.id, pat.id));

    // Verify publisher is active
    const [publisher] = await db
      .select()
      .from(publishers)
      .where(eq(publishers.id, pat.publisherId))
      .limit(1);
    if (!publisher || publisher.status !== "active") return null;

    return {
      type: "personal",
      publisherId: pat.publisherId,
      scopeId: pat.scopeId,
    };
  }

  // Check scope tokens
  const [st] = await db
    .select()
    .from(scopeTokens)
    .where(eq(scopeTokens.tokenHash, hash))
    .limit(1);

  if (st) {
    if (st.expiresAt && st.expiresAt < new Date()) return null;

    await db
      .update(scopeTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(scopeTokens.id, st.id));

    return { type: "scope", scopeId: st.scopeId };
  }

  return null;
}

/**
 * Check if a resolved auth has permission to publish to a scope.
 */
export async function canPublishToScope(
  auth: ResolvedAuth,
  scopeId: string
): Promise<boolean> {
  if (auth.type === "scope") {
    return auth.scopeId === scopeId;
  }

  // Personal token with scope restriction
  if (auth.scopeId && auth.scopeId !== scopeId) return false;

  // Check scope membership
  const [member] = await db
    .select()
    .from(scopeMembers)
    .where(
      and(
        eq(scopeMembers.scopeId, scopeId),
        eq(scopeMembers.publisherId, auth.publisherId)
      )
    )
    .limit(1);

  return !!member;
}
