import { NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { publisherAuthMethods } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/** GET /api/auth/github-orgs — list the user's GitHub orgs + username */
export async function GET() {
  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [githubAuth] = await db
    .select()
    .from(publisherAuthMethods)
    .where(
      and(
        eq(publisherAuthMethods.publisherId, publisher.id),
        eq(publisherAuthMethods.provider, "github")
      )
    )
    .limit(1);

  if (!githubAuth || !githubAuth.accessToken) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions: { name: string; avatarUrl: string | null; type: "user" | "org" }[] = [];

  // Add the user's own GitHub username
  suggestions.push({
    name: githubAuth.providerUsername ?? "",
    avatarUrl: publisher.avatarUrl,
    type: "user",
  });

  // Fetch GitHub orgs
  try {
    const res = await fetch("https://api.github.com/user/orgs?per_page=50", {
      headers: {
        Authorization: `Bearer ${githubAuth.accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (res.ok) {
      const orgs = await res.json();
      for (const org of orgs) {
        suggestions.push({
          name: org.login,
          avatarUrl: org.avatar_url,
          type: "org",
        });
      }
    }
  } catch {
    // Silently fail — suggestions are best-effort
  }

  return NextResponse.json({ suggestions });
}
