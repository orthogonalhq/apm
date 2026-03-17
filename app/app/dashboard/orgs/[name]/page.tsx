import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  organizations,
  orgMembers,
  scopes,
  packages,
  publishers,
  auditLog,
} from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { ScopeActions } from "../../scope-actions";
import { OrgSettingsMenu } from "./org-settings-menu";
import { InviteMember } from "./invite-member";
import { MemberActions } from "./member-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  return { title: `${name} — Dashboard` };
}

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const publisher = await getPublisher();
  if (!publisher) redirect("/login");

  // Fetch org + membership
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);

  if (!org) redirect("/dashboard");

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, org.id),
        eq(orgMembers.publisherId, publisher.id)
      )
    )
    .limit(1);

  if (!membership) redirect("/dashboard");

  // Fetch members
  const members = await db
    .select({
      publisherId: orgMembers.publisherId,
      role: orgMembers.role,
      joinedAt: orgMembers.createdAt,
      displayName: publishers.displayName,
      email: publishers.email,
      avatarUrl: publishers.avatarUrl,
    })
    .from(orgMembers)
    .innerJoin(publishers, eq(publishers.id, orgMembers.publisherId))
    .where(eq(orgMembers.orgId, org.id));

  // Fetch scopes
  const orgScopes = await db
    .select()
    .from(scopes)
    .where(eq(scopes.orgId, org.id));

  // Fetch package stats across all scopes
  const scopeNames = orgScopes.map((s) => s.name);
  const stats =
    scopeNames.length > 0
      ? await db
          .select({
            scope: packages.scope,
            count: sql<number>`count(*)`.as("count"),
            downloads: sql<number>`coalesce(sum(${packages.downloadCount}), 0)`.as("downloads"),
          })
          .from(packages)
          .where(inArray(packages.scope, scopeNames))
          .groupBy(packages.scope)
      : [];

  const totalPackages = stats.reduce((sum, s) => sum + Number(s.count), 0);
  const totalDownloads = stats.reduce((sum, s) => sum + Number(s.downloads), 0);
  const isOwnerOrAdmin = ["owner", "admin"].includes(membership.role);
  const maxNamespaces = org.verified ? 5 : 1;

  // Fetch pending namespace requests by this user (reserved orgs where they're a pending member)
  const pendingRequests = await db
    .select({
      orgName: organizations.name,
      orgDisplayName: organizations.displayName,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(organizations.id, orgMembers.orgId))
    .where(
      and(
        eq(orgMembers.publisherId, publisher.id),
        eq(orgMembers.role, "pending"),
        eq(organizations.status, "reserved")
      )
    );

  // Fetch pending scope/namespace requests for this org (tracked via audit log)
  const pendingScopeRows = await db
    .select({ scopeName: sql<string>`${auditLog.metadata}->>'scopeName'` })
    .from(auditLog)
    .innerJoin(scopes, eq(scopes.id, auditLog.targetId))
    .where(
      and(
        eq(auditLog.actorId, publisher.id),
        eq(auditLog.action, "scope.request_access"),
        sql`${auditLog.metadata}->>'orgId' = ${org.id}`,
        eq(scopes.status, "reserved")
      )
    );

  const pendingScopeNames = [...new Set(pendingScopeRows.map((r) => r.scopeName).filter(Boolean))];

  return (
    <div className="px-6 md:px-12 lg:px-20 py-12 max-w-7xl mx-auto">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-xs font-mono t-ghost hover:t-meta transition-colors mb-6"
      >
        &larr; Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div>
          <h1 className="text-lg t-heading font-medium">
            {org.displayName || org.name}
          </h1>
          <p className="text-xs font-mono t-meta">@{org.name}</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {org.verified && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              verified
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] t-ghost">
            {org.status}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] t-ghost">
            {membership.role}
          </span>
          <OrgSettingsMenu orgName={org.name} displayName={org.displayName || org.name} isOwner={membership.role === "owner"} />
        </div>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-4 mb-10">
        <div className="card-static p-4 text-center">
          <p className="text-xl t-heading font-medium">{totalPackages}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mt-1">
            Packages
          </p>
        </div>
        <div className="card-static p-4 text-center">
          <p className="text-xl t-heading font-medium">
            {totalDownloads.toLocaleString()}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mt-1">
            Downloads
          </p>
        </div>
        <div className="card-static p-4 text-center">
          <p className="text-xl t-heading font-medium">{members.length}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mt-1">
            Members
          </p>
        </div>
      </section>

      {/* Namespaces */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-sm tracking-[0.08em] uppercase t-meta">
            Namespaces
          </h2>
          <span className="text-[10px] font-mono t-ghost">
            {orgScopes.length}/{maxNamespaces}
          </span>
        </div>

        {orgScopes.length === 0 ? (
          <p className="text-xs t-nav">No namespaces yet.</p>
        ) : (
          <div className="space-y-2">
            {orgScopes.map((s) => {
              const scopeStats = stats.find((st) => st.scope === s.name);
              return (
                <Link
                  key={s.id}
                  href={`/dashboard/orgs/${org.name}/ns/${s.name}`}
                  className="flex items-center justify-between border border-white/[0.06] rounded-lg bg-surface px-4 py-3 hover:border-white/[0.12] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm t-heading">
                      @{s.name}
                    </span>
                    {s.verified && (
                      <span className="text-accent text-[9px]">✓</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono t-ghost">
                    <span>{Number(scopeStats?.count ?? 0)} pkgs</span>
                    <span>
                      {Number(scopeStats?.downloads ?? 0).toLocaleString()} dl
                    </span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pending namespace requests */}
        {(pendingRequests.length > 0 || pendingScopeNames.length > 0) && (
          <div className="space-y-2 mt-2">
            {pendingRequests.map((pr) => (
              <div
                key={pr.orgName}
                className="flex items-center justify-between border border-amber-500/20 rounded-lg bg-amber-500/3 px-4 py-3 opacity-70"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm t-heading">@{pr.orgName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    pending review
                  </span>
                </div>
              </div>
            ))}
            {pendingScopeNames.map((scopeName) => (
              <div
                key={scopeName}
                className="flex items-center justify-between border border-amber-500/20 rounded-lg bg-amber-500/3 px-4 py-3 opacity-70"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm t-heading">@{scopeName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    pending review
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add namespace — owner/admin, under limit */}
        {isOwnerOrAdmin && orgScopes.length < maxNamespaces && (
          <ScopeActions orgId={org.id} orgName={org.name} />
        )}
      </section>

      {/* Members */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-sm tracking-[0.08em] uppercase t-meta">
            Members
          </h2>
          {isOwnerOrAdmin && (
            <InviteMember orgId={org.id} />
          )}
        </div>

        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.publisherId}
              className="card-static flex items-center justify-between"
            >
              <div>
                <p className="text-sm t-heading">{m.displayName}</p>
                <p className="text-xs t-ghost">{m.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] t-ghost font-mono">
                  {m.role}
                </span>
                {isOwnerOrAdmin && (
                  <MemberActions
                    orgId={org.id}
                    publisherId={m.publisherId}
                    publisherName={m.displayName}
                    currentRole={m.role}
                    isCurrentUser={m.publisherId === publisher.id}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
