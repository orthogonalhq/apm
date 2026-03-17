import { db } from "@/lib/db";
import {
  auditLog,
  organizations,
  publishers,
  publisherAuthMethods,
  orgMembers,
} from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import type { RequestCardData } from "./request-card";

type GHOrg = { login: string; avatar_url: string };

export async function getRequests(
  filter: "pending" | "approved" | "rejected"
): Promise<RequestCardData[]> {
  // Pending = org is reserved + member has role "pending"
  // Approved = org is active + has org.approve in audit log
  // Rejected = has org.reject in audit log

  if (filter === "pending") {
    return getPendingRequests();
  }

  // For approved/rejected, query by audit log action
  const action = filter === "approved" ? "org.approve" : "org.reject";
  const actionEntries = await db
    .select({
      id: auditLog.id,
      targetId: auditLog.targetId,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(eq(auditLog.action, action))
    .orderBy(sql`${auditLog.createdAt} desc`);

  if (actionEntries.length === 0) return [];

  // Get the original request for each org
  const orgIds = [...new Set(actionEntries.map((a) => a.targetId))];
  const originalRequests = await db
    .select({
      targetId: auditLog.targetId,
      actorId: auditLog.actorId,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.action, "org.request_access"),
        inArray(auditLog.targetId, orgIds)
      )
    )
    .orderBy(sql`${auditLog.createdAt} desc`);

  // Dedupe — most recent request per org
  const requestMap = new Map<string, (typeof originalRequests)[number]>();
  for (const r of originalRequests) {
    if (!requestMap.has(r.targetId)) requestMap.set(r.targetId, r);
  }

  const { orgMap, requesterMap, githubMap, memberCountMap } =
    await getSharedData(orgIds, originalRequests.map((r) => r.actorId).filter(Boolean) as string[]);

  return actionEntries.map((entry) => {
    const request = requestMap.get(entry.targetId);
    const meta = request?.metadata as Record<string, string> | null;
    const actionMeta = entry.metadata as Record<string, string> | null;
    const org = orgMap.get(entry.targetId);
    const actorId = request?.actorId ?? actionMeta?.approvedPublisherId ?? actionMeta?.rejectedPublisherId ?? "";
    const requester = actorId ? requesterMap.get(actorId) : null;

    return {
      id: entry.id,
      claimType: (meta?.claimType as "org" | "namespace") ?? "org",
      orgName: org?.name ?? actionMeta?.orgName ?? "unknown",
      orgDisplayName: org?.displayName ?? null,
      orgStatus: org?.status ?? "unknown",
      orgVerified: org?.verified ?? false,
      targetOrgId: meta?.orgId ?? null,
      targetOrgName: meta?.orgName ?? null,
      actorId,
      requesterName: requester?.displayName ?? meta?.publisherName ?? "Unknown",
      requesterEmail: requester?.email ?? meta?.publisherEmail ?? "",
      requesterAvatar: requester?.avatarUrl ?? null,
      githubUsername: actorId ? githubMap.get(actorId) ?? null : null,
      ghOrgs: [],
      reason: meta?.reason ?? null,
      memberCount: memberCountMap.get(entry.targetId) ?? 0,
      createdAt: request?.createdAt ?? entry.createdAt,
      approvedBy: filter === "approved" ? actionMeta?.approvedBy ?? null : null,
      approvedAt: filter === "approved" ? entry.createdAt : null,
      rejectedBy: filter === "rejected" ? actionMeta?.rejectedBy ?? null : null,
      rejectedAt: filter === "rejected" ? entry.createdAt : null,
      rejectReason: filter === "rejected" ? actionMeta?.reason ?? null : null,
    };
  });
}

async function getPendingRequests(): Promise<RequestCardData[]> {
  const results: RequestCardData[] = [];

  // === 1. Org claims: orgs with pending members ===
  const pendingMembers = await db
    .select({
      orgId: orgMembers.orgId,
      publisherId: orgMembers.publisherId,
      joinedAt: orgMembers.createdAt,
    })
    .from(orgMembers)
    .where(eq(orgMembers.role, "pending"));

  const orgIds = [...new Set(pendingMembers.map((m) => m.orgId))];
  const orgActorIds = [...new Set(pendingMembers.map((m) => m.publisherId))];

  // Get org request reasons from audit log
  const orgRequestLogs = orgIds.length > 0
    ? await db
        .select({
          actorId: auditLog.actorId,
          targetId: auditLog.targetId,
          metadata: auditLog.metadata,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .where(
          and(
            eq(auditLog.action, "org.request_access"),
            inArray(auditLog.targetId, orgIds)
          )
        )
        .orderBy(sql`${auditLog.createdAt} desc`)
    : [];

  const orgRequestLogMap = new Map<string, (typeof orgRequestLogs)[number]>();
  for (const r of orgRequestLogs) {
    const key = `${r.targetId}:${r.actorId}`;
    if (!orgRequestLogMap.has(key)) orgRequestLogMap.set(key, r);
  }

  // === 2. Namespace claims: scope.request_access audit entries with no corresponding approve/reject ===
  const nsRequestLogs = await db
    .select({
      id: auditLog.id,
      actorId: auditLog.actorId,
      targetId: auditLog.targetId,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(eq(auditLog.action, "scope.request_access"))
    .orderBy(sql`${auditLog.createdAt} desc`);

  // Check which scope requests have been approved/rejected
  const scopeApprovals = await db
    .select({ targetId: auditLog.targetId })
    .from(auditLog)
    .where(eq(auditLog.action, "scope.approve"));
  const scopeRejections = await db
    .select({ targetId: auditLog.targetId })
    .from(auditLog)
    .where(eq(auditLog.action, "scope.reject"));
  const approvedScopeIds = new Set(scopeApprovals.map((a) => a.targetId));
  const rejectedScopeIds = new Set(scopeRejections.map((r) => r.targetId));

  // Dedupe namespace requests by scope
  const seenScopes = new Set<string>();
  const pendingNsRequests = nsRequestLogs.filter((r) => {
    if (seenScopes.has(r.targetId)) return false;
    if (approvedScopeIds.has(r.targetId) || rejectedScopeIds.has(r.targetId)) return false;
    seenScopes.add(r.targetId);
    return true;
  });

  const nsActorIds = pendingNsRequests.map((r) => r.actorId).filter(Boolean) as string[];

  // === Combine all actor IDs and fetch shared data ===
  const allActorIds = [...new Set([...orgActorIds, ...nsActorIds])];
  const allOrgIds = [...new Set([...orgIds])];

  const { orgMap, requesterMap, githubMap, memberCountMap } =
    await getSharedData(allOrgIds, allActorIds);

  // Fetch GitHub orgs for all pending requesters
  const githubAuths = allActorIds.length > 0
    ? await db
        .select({
          publisherId: publisherAuthMethods.publisherId,
          accessToken: publisherAuthMethods.accessToken,
        })
        .from(publisherAuthMethods)
        .where(inArray(publisherAuthMethods.publisherId, allActorIds))
    : [];

  const ghOrgsMap = new Map<string, GHOrg[]>();
  await Promise.all(
    githubAuths
      .filter((a) => a.accessToken)
      .map(async (a) => {
        try {
          const res = await fetch(
            "https://api.github.com/user/orgs?per_page=100",
            {
              headers: {
                Authorization: `Bearer ${a.accessToken}`,
                Accept: "application/vnd.github+json",
              },
            }
          );
          if (res.ok) {
            const fetchedOrgs = await res.json();
            ghOrgsMap.set(
              a.publisherId,
              fetchedOrgs.map((o: { login: string; avatar_url: string }) => ({
                login: o.login,
                avatar_url: o.avatar_url,
              }))
            );
          }
        } catch {
          // silently fail
        }
      })
  );

  // Build org claim results
  for (const m of pendingMembers) {
    const org = orgMap.get(m.orgId);
    const requester = requesterMap.get(m.publisherId);
    const logEntry = orgRequestLogMap.get(`${m.orgId}:${m.publisherId}`);
    const meta = logEntry?.metadata as Record<string, string> | null;

    results.push({
      id: `org:${m.orgId}:${m.publisherId}`,
      claimType: "org",
      orgName: org?.name ?? "unknown",
      orgDisplayName: org?.displayName ?? null,
      orgStatus: org?.status ?? "unknown",
      orgVerified: org?.verified ?? false,
      actorId: m.publisherId,
      requesterName: requester?.displayName ?? meta?.publisherName ?? "Unknown",
      requesterEmail: requester?.email ?? meta?.publisherEmail ?? "",
      requesterAvatar: requester?.avatarUrl ?? null,
      githubUsername: githubMap.get(m.publisherId) ?? null,
      ghOrgs: ghOrgsMap.get(m.publisherId) ?? [],
      reason: meta?.reason ?? null,
      memberCount: memberCountMap.get(m.orgId) ?? 0,
      createdAt: logEntry?.createdAt ?? m.joinedAt,
    });
  }

  // Build namespace claim results
  for (const r of pendingNsRequests) {
    const meta = r.metadata as Record<string, string> | null;
    const requester = r.actorId ? requesterMap.get(r.actorId) : null;

    results.push({
      id: `ns:${r.targetId}:${r.actorId}`,
      claimType: "namespace",
      orgName: meta?.scopeName ?? "unknown",
      orgDisplayName: null,
      orgStatus: "reserved",
      orgVerified: false,
      targetOrgId: meta?.orgId ?? null,
      targetOrgName: meta?.orgName ?? null,
      actorId: r.actorId ?? "",
      requesterName: requester?.displayName ?? meta?.publisherName ?? "Unknown",
      requesterEmail: requester?.email ?? meta?.publisherEmail ?? "",
      requesterAvatar: requester?.avatarUrl ?? null,
      githubUsername: r.actorId ? githubMap.get(r.actorId) ?? null : null,
      ghOrgs: r.actorId ? ghOrgsMap.get(r.actorId) ?? [] : [],
      reason: meta?.reason ?? null,
      memberCount: 0,
      createdAt: r.createdAt,
    });
  }

  return results;
}

async function getSharedData(orgIds: string[], actorIds: string[]) {
  const orgs = orgIds.length > 0
    ? await db.select().from(organizations).where(inArray(organizations.id, orgIds))
    : [];
  const orgMap = new Map(orgs.map((o) => [o.id, o]));

  const requesters = actorIds.length > 0
    ? await db.select().from(publishers).where(inArray(publishers.id, actorIds))
    : [];
  const requesterMap = new Map(requesters.map((p) => [p.id, p]));

  const githubAuths = actorIds.length > 0
    ? await db
        .select({
          publisherId: publisherAuthMethods.publisherId,
          providerUsername: publisherAuthMethods.providerUsername,
        })
        .from(publisherAuthMethods)
        .where(inArray(publisherAuthMethods.publisherId, actorIds))
    : [];
  const githubMap = new Map(githubAuths.map((a) => [a.publisherId, a.providerUsername]));

  const memberCounts = orgIds.length > 0
    ? await db
        .select({
          orgId: orgMembers.orgId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(orgMembers)
        .where(inArray(orgMembers.orgId, orgIds))
        .groupBy(orgMembers.orgId)
    : [];
  const memberCountMap = new Map(memberCounts.map((m) => [m.orgId, Number(m.count)]));

  return { orgMap, requesterMap, githubMap, memberCountMap };
}
