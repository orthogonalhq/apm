import { NextRequest, NextResponse } from "next/server";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, orgMembers, publisherAuthMethods } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET ?? "";
const APP_URL = process.env.NEXT_PUBLIC_URL ?? "";

async function getGitHubToken(publisherId: string) {
  const [auth] = await db
    .select({ accessToken: publisherAuthMethods.accessToken })
    .from(publisherAuthMethods)
    .where(
      and(
        eq(publisherAuthMethods.publisherId, publisherId),
        eq(publisherAuthMethods.provider, "github")
      )
    )
    .limit(1);
  return auth?.accessToken ?? null;
}

async function verifyOrgAccess(orgName: string, publisherId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, orgName))
    .limit(1);

  if (!org) return null;

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, org.id),
        eq(orgMembers.publisherId, publisherId)
      )
    )
    .limit(1);

  if (!membership || !["owner", "admin"].includes(membership.role)) return null;
  return org;
}

/** GET /api/orgs/:name/webhook?repo=owner/repo — check webhook status */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const repo = req.nextUrl.searchParams.get("repo");

  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!await verifyOrgAccess(name, publisher.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!repo) {
    return NextResponse.json({ error: "repo param required" }, { status: 400 });
  }

  const token = await getGitHubToken(publisher.id);
  if (!token) {
    return NextResponse.json({ error: "No GitHub token" }, { status: 400 });
  }

  const webhookUrl = `${APP_URL}/api/webhooks/github`;

  // List webhooks on the repo
  const res = await fetch(`https://api.github.com/repos/${repo}/hooks`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    return NextResponse.json({
      connected: false,
      error: res.status === 404 ? "No admin access to repo" : `GitHub API error (${res.status})`,
    });
  }

  const hooks = await res.json();
  const ourHook = hooks.find(
    (h: { config: { url: string } }) => h.config?.url === webhookUrl
  );

  if (!ourHook) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    hookId: ourHook.id,
    active: ourHook.active,
    lastDelivery: ourHook.last_response?.code ?? null,
    lastDeliveryAt: ourHook.updated_at ?? null,
    createdAt: ourHook.created_at,
  });
}

/** POST /api/orgs/:name/webhook — create webhook on a GitHub repo */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!await verifyOrgAccess(name, publisher.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { repo } = body;

  if (!repo) {
    return NextResponse.json({ error: "repo is required" }, { status: 400 });
  }

  const token = await getGitHubToken(publisher.id);
  if (!token) {
    return NextResponse.json({ error: "No GitHub token" }, { status: 400 });
  }

  const webhookUrl = `${APP_URL}/api/webhooks/github`;

  // Check if already exists
  const listRes = await fetch(`https://api.github.com/repos/${repo}/hooks`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (listRes.ok) {
    const hooks = await listRes.json();
    const existing = hooks.find(
      (h: { config: { url: string } }) => h.config?.url === webhookUrl
    );
    if (existing) {
      return NextResponse.json({
        ok: true,
        hookId: existing.id,
        message: "Webhook already exists",
      });
    }
  }

  // Create the webhook
  const createRes = await fetch(
    `https://api.github.com/repos/${repo}/hooks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["push"],
        config: {
          url: webhookUrl,
          content_type: "json",
          secret: WEBHOOK_SECRET,
          insecure_ssl: "0",
        },
      }),
    }
  );

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.message || `Failed to create webhook (${createRes.status})` },
      { status: 400 }
    );
  }

  const hook = await createRes.json();
  return NextResponse.json({ ok: true, hookId: hook.id }, { status: 201 });
}

/** DELETE /api/orgs/:name/webhook — remove webhook from a GitHub repo */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  const publisher = await getPublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!await verifyOrgAccess(name, publisher.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { repo, hookId } = await req.json();

  if (!repo || !hookId) {
    return NextResponse.json({ error: "repo and hookId required" }, { status: 400 });
  }

  const token = await getGitHubToken(publisher.id);
  if (!token) {
    return NextResponse.json({ error: "No GitHub token" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/hooks/${hookId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!res.ok && res.status !== 404) {
    return NextResponse.json(
      { error: `Failed to delete webhook (${res.status})` },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
