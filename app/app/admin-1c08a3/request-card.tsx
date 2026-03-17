import Image from "next/image";

type GHOrg = { login: string; avatar_url: string };

export interface RequestCardData {
  id: string;
  claimType: "org" | "namespace";
  orgName: string;
  orgDisplayName: string | null;
  orgStatus: string;
  orgVerified: boolean;
  targetOrgId?: string | null; // for namespace claims — the org it should be added under
  targetOrgName?: string | null;
  actorId: string;
  requesterName: string;
  requesterEmail: string;
  requesterAvatar: string | null;
  githubUsername: string | null;
  ghOrgs: GHOrg[];
  reason: string | null;
  memberCount: number;
  createdAt: Date;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectedBy?: string | null;
  rejectedAt?: Date | null;
  rejectReason?: string | null;
}

export function RequestCard({
  data,
  actions,
}: {
  data: RequestCardData;
  actions?: React.ReactNode;
}) {
  return (
    <div className="border border-white/[0.06] rounded-lg bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div>
          <p className="text-sm t-heading font-medium">@{data.orgName}</p>
          {data.orgDisplayName && (
            <p className="text-xs t-meta">{data.orgDisplayName}</p>
          )}
          {data.claimType === "namespace" && data.targetOrgName && (
            <p className="text-[10px] t-ghost mt-0.5">
              as namespace under <span className="font-mono t-meta">@{data.targetOrgName}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
            data.claimType === "namespace"
              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              : "bg-white/[0.04] t-ghost"
          }`}>
            {data.claimType}
          </span>
          {data.memberCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] t-ghost font-mono">
              {data.memberCount} members
            </span>
          )}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              data.orgStatus === "reserved"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : data.orgVerified
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : "bg-white/[0.04] t-ghost"
            }`}
          >
            {data.orgStatus}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Requester */}
        <div className="flex items-center gap-3">
          {data.requesterAvatar && (
            <Image
              src={data.requesterAvatar}
              alt=""
              width={32}
              height={32}
              className="w-8 h-8 rounded-full border border-white/[0.08]"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm t-heading">{data.requesterName}</p>
              {data.githubUsername && (
                <a
                  href={`https://github.com/${data.githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono t-meta hover:text-accent transition-colors"
                >
                  @{data.githubUsername}
                </a>
              )}
            </div>
            <p className="text-xs t-ghost">{data.requesterEmail}</p>
          </div>
          {data.githubUsername && (
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`https://github.com/${data.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 rounded text-[10px] font-mono t-ghost hover:t-meta hover:bg-white/[0.04] transition-colors border border-white/[0.06]"
              >
                GitHub Profile
              </a>
              <a
                href={`https://github.com/orgs/${data.orgName}/people`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 rounded text-[10px] font-mono t-ghost hover:t-meta hover:bg-white/[0.04] transition-colors border border-white/[0.06]"
              >
                GitHub Org
              </a>
            </div>
          )}
        </div>

        {/* Reason */}
        <div className="px-3 py-2 rounded bg-white/[0.02] border border-white/[0.04]">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mb-1">Reason</p>
          <p className="text-xs t-nav">{data.reason || "No reason provided"}</p>
        </div>

        {/* GitHub Orgs */}
        {data.ghOrgs.length > 0 && (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mb-2">
              GitHub Organizations ({data.ghOrgs.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.ghOrgs.map((go) => (
                <a
                  key={go.login}
                  href={`https://github.com/${go.login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                    go.login.toLowerCase() === data.orgName
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-white/[0.04] t-meta border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={go.avatar_url} alt="" className="w-3.5 h-3.5 rounded-full" />
                  {go.login}
                  {go.login.toLowerCase() === data.orgName && (
                    <span className="text-[9px]">✓ match</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Meta */}
        <p className="text-[10px] font-mono t-ghost">
          Requested {new Date(data.createdAt).toLocaleDateString()} at{" "}
          {new Date(data.createdAt).toLocaleTimeString()}
        </p>

        {/* Approved/Rejected info */}
        {data.approvedBy && (
          <p className="text-[10px] font-mono text-green-400">
            Approved by {data.approvedBy}
            {data.approvedAt && ` on ${new Date(data.approvedAt).toLocaleDateString()}`}
          </p>
        )}
        {data.rejectedBy && (
          <div>
            <p className="text-[10px] font-mono text-red-400">
              Rejected by {data.rejectedBy}
              {data.rejectedAt && ` on ${new Date(data.rejectedAt).toLocaleDateString()}`}
            </p>
            {data.rejectReason && (
              <p className="text-[10px] font-mono t-ghost mt-0.5">
                Reason: {data.rejectReason}
              </p>
            )}
          </div>
        )}

        {/* Actions slot */}
        {actions}
      </div>
    </div>
  );
}
