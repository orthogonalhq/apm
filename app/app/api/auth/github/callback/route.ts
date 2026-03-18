import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession, findOrCreatePublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { orgMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;
  const savedRedirect = cookieStore.get("oauth_redirect")?.value;
  cookieStore.delete("oauth_state");
  cookieStore.delete("oauth_redirect");

  if (!code || !state || state !== savedState) {
    return NextResponse.json(
      { error: "Invalid OAuth callback" },
      { status: 400 }
    );
  }

  // Exchange code for access token
  const tokenRes = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    }
  );

  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    return NextResponse.json(
      { error: tokenData.error_description || "OAuth token exchange failed" },
      { status: 400 }
    );
  }

  const accessToken = tokenData.access_token;

  // Fetch user profile
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const user = await userRes.json();

  // Fetch primary email
  const emailsRes = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const emails = await emailsRes.json();
  const primaryEmail =
    emails.find((e: { primary: boolean }) => e.primary)?.email ?? null;

  // Find or create publisher
  const publisherId = await findOrCreatePublisher({
    provider: "github",
    providerId: String(user.id),
    providerUsername: user.login,
    providerEmail: primaryEmail,
    displayName: user.name || user.login,
    avatarUrl: user.avatar_url,
    accessToken: accessToken,
  });

  await createSession(publisherId);

  // Check if user has any org memberships — if not, onboard them
  const memberships = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.publisherId, publisherId))
    .limit(1);

  // Priority: saved redirect (invite link) > onboarding > home
  const redirectTo = (savedRedirect && savedRedirect.startsWith("/") && !savedRedirect.includes("//"))
    ? savedRedirect
    : memberships.length === 0
      ? "/onboarding"
      : "/";
  return NextResponse.redirect(new URL(redirectTo, req.url));
}
