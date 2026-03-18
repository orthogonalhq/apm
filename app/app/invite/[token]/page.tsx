import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, orgMembers, orgInvites, auditLog } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const metadata: Metadata = { title: "Accept Invite" };

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Look up invite
  const [invite] = await db
    .select()
    .from(orgInvites)
    .where(eq(orgInvites.token, token))
    .limit(1);

  if (!invite) {
    return <ErrorCard message="This invite link is invalid or has been revoked." />;
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return <ErrorCard message="This invite link has expired." />;
  }

  if (invite.maxUses && invite.useCount >= invite.maxUses) {
    return <ErrorCard message="This invite link has reached its maximum number of uses." />;
  }

  // Auth check
  const publisher = await getPublisher();
  if (!publisher) {
    redirect(`/login?redirect=/invite/${token}`);
  }

  // Look up org
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, invite.orgId))
    .limit(1);

  if (!org) {
    return <ErrorCard message="The organization for this invite no longer exists." />;
  }

  // Already a member?
  const [existing] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.publisherId, publisher.id)))
    .limit(1);

  if (existing) {
    redirect(`/dashboard/orgs/${org.name}`);
  }

  // Join the org — atomic useCount increment to prevent race conditions
  const [updated] = await db
    .update(orgInvites)
    .set({ useCount: sql`${orgInvites.useCount} + 1` })
    .where(
      and(
        eq(orgInvites.id, invite.id),
        sql`(${orgInvites.maxUses} IS NULL OR ${orgInvites.useCount} < ${orgInvites.maxUses})`
      )
    )
    .returning();

  if (!updated) {
    return <ErrorCard message="This invite link has reached its maximum number of uses." />;
  }

  await db.insert(orgMembers).values({
    orgId: org.id,
    publisherId: publisher.id,
    role: invite.role,
    invitedBy: invite.createdBy,
  });

  await db.insert(auditLog).values({
    actorId: publisher.id,
    actorType: "publisher",
    action: "org.accept_invite",
    targetType: "organization",
    targetId: org.id,
    metadata: { inviteId: invite.id, role: invite.role },
  });

  redirect(`/dashboard/orgs/${org.name}`);
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="border border-white/6 rounded-lg bg-surface p-6 space-y-3">
          <svg className="w-8 h-8 text-red-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm t-heading font-mono">{message}</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-block text-xs font-mono t-ghost hover:t-meta transition-colors"
        >
          &larr; Go to dashboard
        </Link>
      </div>
    </div>
  );
}
