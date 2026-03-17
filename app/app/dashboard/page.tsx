import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  publisherAuthMethods,
  organizations,
  orgMembers,
  scopes,
  packages,
  personalAccessTokens,
} from "@/lib/db/schema";
import { eq, inArray, sql, count as countFn } from "drizzle-orm";
import Link from "next/link";
import { CreateOrg } from "./create-org";
import { TokenActions } from "./token-actions";
import { RevokeToken } from "./revoke-token";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function SettingsPage() {
  const publisher = await getPublisher();
  if (!publisher) redirect("/login");

  const authMethods = await db
    .select()
    .from(publisherAuthMethods)
    .where(eq(publisherAuthMethods.publisherId, publisher.id));

  const memberships = await db
    .select({
      orgId: organizations.id,
      orgName: organizations.name,
      orgDisplayName: organizations.displayName,
      orgStatus: organizations.status,
      orgVerified: organizations.verified,
      orgVerificationMethod: organizations.verificationMethod,
      role: orgMembers.role,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(organizations.id, orgMembers.orgId))
    .where(eq(orgMembers.publisherId, publisher.id));

  // Fetch scopes, package stats, and member counts per org
  const orgIds = memberships.map((m) => m.orgId);

  const orgScopes = orgIds.length > 0
    ? await db
        .select({ name: scopes.name, orgId: scopes.orgId })
        .from(scopes)
        .where(inArray(scopes.orgId, orgIds))
    : [];

  const scopeNames = orgScopes.map((s) => s.name);
  const pkgStats = scopeNames.length > 0
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

  const memberCounts = orgIds.length > 0
    ? await db
        .select({
          orgId: orgMembers.orgId,
          count: countFn(),
        })
        .from(orgMembers)
        .where(inArray(orgMembers.orgId, orgIds))
        .groupBy(orgMembers.orgId)
    : [];

  // Build per-org stats map
  const orgStatsMap = new Map<string, { scopes: string[]; packages: number; downloads: number; members: number }>();
  for (const m of memberships) {
    const myScopes = orgScopes.filter((s) => s.orgId === m.orgId);
    const myScopeNames = myScopes.map((s) => s.name);
    const myPkgStats = pkgStats.filter((p) => myScopeNames.includes(p.scope));
    const totalPkgs = myPkgStats.reduce((sum, s) => sum + Number(s.count), 0);
    const totalDl = myPkgStats.reduce((sum, s) => sum + Number(s.downloads), 0);
    const mc = memberCounts.find((c) => c.orgId === m.orgId);
    orgStatsMap.set(m.orgId, {
      scopes: myScopeNames,
      packages: totalPkgs,
      downloads: totalDl,
      members: Number(mc?.count ?? 1),
    });
  }

  const tokens = await db
    .select({
      id: personalAccessTokens.id,
      name: personalAccessTokens.name,
      description: personalAccessTokens.description,
      tokenHint: personalAccessTokens.tokenHint,
      lastUsedAt: personalAccessTokens.lastUsedAt,
      createdAt: personalAccessTokens.createdAt,
    })
    .from(personalAccessTokens)
    .where(eq(personalAccessTokens.publisherId, publisher.id));

  return (
    <div className="px-6 md:px-12 lg:px-20 py-12 max-w-3xl">
      {/* Profile */}
      <section className="mb-12">
        <h1 className="font-mono text-sm tracking-[0.08em] uppercase t-meta mb-6">
          Profile
        </h1>
        <div className="flex items-center gap-4">
          {publisher.avatarUrl && (
            <Image
              src={publisher.avatarUrl}
              alt=""
              width={48}
              height={48}
              className="w-12 h-12 rounded-full border border-white/[0.08]"
            />
          )}
          <div>
            <p className="text-sm t-heading font-medium">
              {publisher.displayName}
            </p>
            <p className="text-xs t-meta">{publisher.email}</p>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          {authMethods.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 text-xs t-nav"
            >
              <span className="capitalize">{m.provider}</span>
              <span className="t-ghost">—</span>
              <span className="t-meta">{m.providerUsername}</span>
              <a
                href={`https://github.com/settings/connections/applications/${process.env.GITHUB_CLIENT_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 px-2.5 py-1 rounded text-[10px] font-mono t-ghost hover:t-meta hover:bg-white/[0.04] transition-colors border border-white/[0.06] inline-flex items-center gap-1.5"
              >
                <svg className="w-[10px] h-[10px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Manage repos
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Organizations */}
      <section className="mb-12">
        <div className="relative flex items-center justify-between mb-6">
          <h2 className="font-mono text-sm tracking-[0.08em] uppercase t-meta">
            Organizations
          </h2>
          <CreateOrg />
        </div>

        {memberships.length === 0 ? (
          <p className="text-sm t-nav">
            No organizations yet. Create one to start publishing.
          </p>
        ) : (
          <div className="space-y-2">
            {memberships.map((m) => {
              const stats = orgStatsMap.get(m.orgId);
              const isPending = m.role === "pending";

              return (
                <div key={m.orgId}>
                  <Link
                    href={isPending ? "#" : `/dashboard/orgs/${m.orgName}`}
                    className={`flex items-center justify-between border border-white/[0.06] rounded-lg bg-surface px-4 py-3 transition-colors ${isPending ? "opacity-70" : "hover:border-white/[0.12]"}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-sm t-heading truncate">
                        {m.orgDisplayName || m.orgName}
                      </span>
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] t-ghost font-mono">
                        @{m.orgName}
                      </span>
                      {m.orgVerified && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                          verified
                        </span>
                      )}
                      {isPending ? (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                          pending
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] t-ghost">
                          {m.role}
                        </span>
                      )}
                    </div>
                    {!isPending && (
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="flex items-center gap-1 text-[11px] font-mono t-ghost" title="Packages">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          {stats?.packages ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-mono t-ghost" title="Downloads">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                          </svg>
                          {(stats?.downloads ?? 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-mono t-ghost" title="Members">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {stats?.members ?? 1}
                        </span>
                        <svg className="w-4 h-4 t-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </Link>
                  {isPending && (
                    <div className="mx-3 border border-t-0 border-amber-500/20 rounded-b-lg bg-amber-500/5 px-3 py-2 flex items-center gap-2">
                      <span className="text-amber-400 text-[11px]">&#9203;</span>
                      <p className="text-[11px] t-nav">
                        We&apos;re reviewing your request for <span className="font-mono text-accent">@{m.orgName}</span>.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tokens */}
      <section className="mb-12">
        <div className="relative flex items-center justify-between mb-6">
          <h2 className="font-mono text-sm tracking-[0.08em] uppercase t-meta">
            Access Tokens
          </h2>
          <TokenActions mode="button" />
        </div>

        {tokens.length > 0 && (
          <div className="space-y-2 mb-4">
            {tokens.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border border-white/[0.06] rounded-lg bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm t-heading">{t.name}</p>
                    {t.tokenHint && (
                      <code className="text-[10px] font-mono t-ghost px-1.5 py-0.5 rounded bg-white/[0.04]">{t.tokenHint}</code>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs t-nav truncate">{t.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-[11px] font-mono t-ghost">
                    {t.lastUsedAt
                      ? `Used ${new Date(t.lastUsedAt).toLocaleDateString()}`
                      : "Never used"}
                  </span>
                  <RevokeToken tokenId={t.id} tokenName={t.name} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sign out */}
      <section>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-xs t-meta hover:t-nav transition-colors underline underline-offset-2"
          >
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
