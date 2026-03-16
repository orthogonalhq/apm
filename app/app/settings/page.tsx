import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPublisher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  publisherAuthMethods,
  scopeMembers,
  scopes,
  personalAccessTokens,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ScopeActions } from "./scope-actions";
import { TokenActions } from "./token-actions";

export const metadata: Metadata = {
  title: "Settings",
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
      scopeId: scopes.id,
      scopeName: scopes.name,
      scopeStatus: scopes.status,
      scopeVerified: scopes.verified,
      scopeVerificationMethod: scopes.verificationMethod,
      role: scopeMembers.role,
    })
    .from(scopeMembers)
    .innerJoin(scopes, eq(scopes.id, scopeMembers.scopeId))
    .where(eq(scopeMembers.publisherId, publisher.id));

  const tokens = await db
    .select({
      id: personalAccessTokens.id,
      name: personalAccessTokens.name,
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
            <img
              src={publisher.avatarUrl}
              alt=""
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
            </div>
          ))}
        </div>
      </section>

      {/* Scopes */}
      <section className="mb-12">
        <h2 className="font-mono text-sm tracking-[0.08em] uppercase t-meta mb-6">
          Scopes
        </h2>

        {memberships.length === 0 ? (
          <p className="text-sm t-nav">
            No scopes yet. Claim one to start publishing.
          </p>
        ) : (
          <div className="space-y-3">
            {memberships.map((m) => (
              <div
                key={m.scopeId}
                className="border border-white/[0.06] rounded-lg bg-surface p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm t-heading">
                      @{m.scopeName}
                    </span>
                    {m.scopeVerified && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                        verified
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] t-ghost">
                      {m.role}
                    </span>
                  </div>
                </div>

                {!m.scopeVerified && m.role === "owner" && (
                  <ScopeActions scopeName={m.scopeName} />
                )}
              </div>
            ))}
          </div>
        )}

        <ScopeActions mode="claim" />
      </section>

      {/* Tokens */}
      <section className="mb-12">
        <h2 className="font-mono text-sm tracking-[0.08em] uppercase t-meta mb-6">
          Access Tokens
        </h2>

        {tokens.length > 0 && (
          <div className="space-y-2 mb-4">
            {tokens.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border border-white/[0.06] rounded-lg bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-sm t-heading">{t.name}</p>
                  <p className="text-xs t-ghost">
                    {t.lastUsedAt
                      ? `Last used ${new Date(t.lastUsedAt).toLocaleDateString()}`
                      : "Never used"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <TokenActions />
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
