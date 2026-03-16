import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  publishers,
  publisherAuthMethods,
  sessions,
} from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

const SESSION_COOKIE = "apm_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function createSession(publisherId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await db.insert(sessions).values({
    token,
    publisherId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<{
  publisherId: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.token, token),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!session) return null;

  return { publisherId: session.publisherId };
}

export async function getPublisher() {
  const session = await getSession();
  if (!session) return null;

  const [publisher] = await db
    .select()
    .from(publishers)
    .where(eq(publishers.id, session.publisherId))
    .limit(1);

  if (!publisher || publisher.status !== "active") return null;
  return publisher;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Find or create a publisher from an OAuth provider callback.
 */
export async function findOrCreatePublisher(opts: {
  provider: string;
  providerId: string;
  providerUsername: string;
  providerEmail: string | null;
  displayName: string;
  avatarUrl: string | null;
  accessToken: string | null;
}): Promise<string> {
  // Check if this provider account is already linked
  const [existing] = await db
    .select()
    .from(publisherAuthMethods)
    .where(eq(publisherAuthMethods.providerId, opts.providerId))
    .limit(1);

  if (existing && existing.provider === opts.provider) {
    // Update access token on each login
    if (opts.accessToken) {
      await db
        .update(publisherAuthMethods)
        .set({ accessToken: opts.accessToken })
        .where(eq(publisherAuthMethods.id, existing.id));
    }
    return existing.publisherId;
  }

  // Create new publisher + auth method
  const [publisher] = await db
    .insert(publishers)
    .values({
      displayName: opts.displayName,
      email: opts.providerEmail,
      avatarUrl: opts.avatarUrl,
    })
    .returning({ id: publishers.id });

  await db.insert(publisherAuthMethods).values({
    publisherId: publisher.id,
    provider: opts.provider,
    providerId: opts.providerId,
    providerUsername: opts.providerUsername,
    providerEmail: opts.providerEmail,
    accessToken: opts.accessToken,
  });

  return publisher.id;
}
