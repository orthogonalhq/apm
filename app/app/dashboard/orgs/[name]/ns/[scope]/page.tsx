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
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { SyncFromGitHub } from "./sync-github";
import { WebhookStatus } from "./webhook-status";
import { DeletePackage } from "./delete-package";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string; scope: string }>;
}): Promise<Metadata> {
  const { scope } = await params;
  return { title: `@${scope} — Namespace` };
}

export default async function NamespacePage({
  params,
}: {
  params: Promise<{ name: string; scope: string }>;
}) {
  const { name, scope: scopeName } = await params;
  const publisher = await getPublisher();
  if (!publisher) redirect("/login");

  // Verify org membership
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

  // Fetch scope
  const [scope] = await db
    .select()
    .from(scopes)
    .where(
      and(
        eq(scopes.name, scopeName),
        eq(scopes.orgId, org.id)
      )
    )
    .limit(1);

  if (!scope) redirect(`/dashboard/orgs/${name}`);

  // Fetch packages under this scope
  const scopePackages = await db
    .select({
      id: packages.id,
      name: packages.name,
      description: packages.description,
      kind: packages.kind,
      version: packages.version,
      lastCommitSha: packages.lastCommitSha,
      downloadCount: packages.downloadCount,
      verified: packages.verified,
      status: packages.status,
      lastUpdatedAt: packages.lastUpdatedAt,
      sourceRepo: packages.sourceRepo,
    })
    .from(packages)
    .where(eq(packages.scope, scopeName))
    .orderBy(sql`${packages.name} asc`);

  const totalDownloads = scopePackages.reduce(
    (sum, p) => sum + (p.downloadCount ?? 0),
    0
  );

  const isOwnerOrAdmin = ["owner", "admin"].includes(membership.role);

  // Find the connected repo (from the first package's sourceRepo)
  const connectedRepo = scopePackages.find((p) => p.sourceRepo)?.sourceRepo ?? null;

  return (
    <div className="px-6 md:px-12 lg:px-20 py-12 max-w-3xl">
      {/* Back */}
      <Link
        href={`/dashboard/orgs/${name}`}
        className="inline-flex items-center gap-1 text-xs font-mono t-ghost hover:t-meta transition-colors mb-6"
      >
        &larr; {org.displayName || org.name}
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div>
          <h1 className="text-lg t-heading font-medium font-mono">
            @{scopeName}
          </h1>
          <p className="text-xs t-meta">
            Namespace under {org.displayName || org.name}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {scope.verified && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              verified
            </span>
          )}
          <Link
            href={`/packages/@${scopeName}`}
            className="px-2 py-1 rounded text-[10px] font-mono t-ghost hover:t-meta hover:bg-white/[0.04] transition-colors border border-white/[0.06]"
          >
            Public page
          </Link>
        </div>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 mb-10">
        <div className="border border-white/[0.06] rounded-lg bg-surface p-4 text-center">
          <p className="text-xl t-heading font-medium">{scopePackages.length}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mt-1">
            Packages
          </p>
        </div>
        <div className="border border-white/[0.06] rounded-lg bg-surface p-4 text-center">
          <p className="text-xl t-heading font-medium">
            {totalDownloads.toLocaleString()}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mt-1">
            Downloads
          </p>
        </div>
      </section>

      {/* GitHub Sync */}
      {isOwnerOrAdmin && (
        <section className="mb-10">
          <h2 className="font-mono text-sm tracking-[0.08em] uppercase t-meta mb-4">
            Sync from GitHub
          </h2>
          <SyncFromGitHub orgName={name} scopeName={scopeName} />
        </section>
      )}

      {/* Auto-sync Webhook */}
      {isOwnerOrAdmin && connectedRepo && (
        <section className="mb-10">
          <h2 className="font-mono text-sm tracking-[0.08em] uppercase t-meta mb-4">
            Auto-sync
          </h2>
          <WebhookStatus orgName={name} scopeName={scopeName} repo={connectedRepo} />
        </section>
      )}

      {/* Packages */}
      <section className="mb-10">
        <h2 className="font-mono text-sm tracking-[0.08em] uppercase t-meta mb-4">
          Packages ({scopePackages.length})
        </h2>

        {scopePackages.length === 0 ? (
          <p className="text-xs t-nav">
            No packages yet. Sync from GitHub to import skills.
          </p>
        ) : (
          <div className="space-y-2">
            {scopePackages.map((pkg) => (
              <Link
                key={pkg.id}
                href={`/packages/@${scopeName}/${pkg.name}`}
                className="flex items-center justify-between border border-white/[0.06] rounded-lg bg-surface px-4 py-3 hover:border-white/[0.12] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm t-heading font-mono">{pkg.name}</span>
                    {pkg.version && (
                      <span className="text-[10px] font-mono t-ghost">v{pkg.version}</span>
                    )}
                    {pkg.kind && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase bg-white/[0.04] t-ghost">
                        {pkg.kind}
                      </span>
                    )}
                  </div>
                  {pkg.description && (
                    <p className="text-xs t-nav truncate mt-0.5">{pkg.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="flex items-center gap-1 text-[11px] font-mono t-ghost" title="Downloads">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    {(pkg.downloadCount ?? 0).toLocaleString()}
                  </span>
                  {isOwnerOrAdmin && (
                    <DeletePackage
                      packageId={pkg.id}
                      packageName={pkg.name}
                      scopeName={scopeName}
                    />
                  )}
                  <svg className="w-4 h-4 t-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
