"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Suggestion {
  name: string;
  avatarUrl: string | null;
  type: "user" | "org";
}

type Step = "org" | "invite";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("org");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Org step
  const [orgName, setOrgName] = useState("");
  const [orgDisplayName, setOrgDisplayName] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);

  // Reserved flow
  const [reserved, setReserved] = useState<{ orgName: string; message: string } | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // Invite step
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [invitedUsers, setInvitedUsers] = useState<
    { username: string; role: string }[]
  >([]);

  // Fetch GitHub suggestions on mount
  useEffect(() => {
    fetch("/api/auth/github-orgs")
      .then((r) => r.json())
      .then((data) => setSuggestions(data.suggestions ?? []))
      .catch(() => {});
  }, []);

  const selectSuggestion = useCallback((s: Suggestion) => {
    setOrgName(s.name.toLowerCase());
    setOrgDisplayName(s.name);
    setError("");
    setReserved(null);
  }, []);

  const createOrg = useCallback(async () => {
    setLoading(true);
    setError("");
    setReserved(null);
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgName,
          displayName: orgDisplayName || orgName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "reserved") {
          setReserved({ orgName: data.orgName, message: data.message });
          return;
        }
        setError(data.error || "Failed to create organization");
        return;
      }
      setOrgId(data.id);
      setStep("invite");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [orgName, orgDisplayName]);

  const handleRequestAccess = useCallback(async () => {
    if (!reserved || !requestReason.trim()) return;
    setRequesting(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${reserved.orgName}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: requestReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Request failed");
        return;
      }
      setRequestSent(true);
    } catch {
      setError("Network error");
    } finally {
      setRequesting(false);
    }
  }, [reserved, requestReason]);

  const addInvite = useCallback(() => {
    if (!inviteUsername.trim()) return;
    if (invitedUsers.some((u) => u.username === inviteUsername.trim())) return;
    setInvitedUsers((prev) => [
      ...prev,
      { username: inviteUsername.trim(), role: inviteRole },
    ]);
    setInviteUsername("");
  }, [inviteUsername, inviteRole, invitedUsers]);

  const finish = useCallback(async () => {
    if (orgId && invitedUsers.length > 0) {
      for (const u of invitedUsers) {
        await fetch(`/api/orgs/${orgId}/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: u.username, role: u.role }),
        }).catch(() => {});
      }
    }
    router.push("/dashboard");
  }, [router, orgId, invitedUsers]);

  return (
    <div className="border border-white/[0.06] rounded-lg bg-surface">
      {/* Step indicator */}
      <div className="flex border-b border-white/[0.06]">
        {(["org", "invite"] as const).map((s, i) => (
          <div
            key={s}
            className={`flex-1 py-3 text-center font-mono text-[10px] uppercase tracking-[0.15em] transition-colors ${
              step === s
                ? "t-heading bg-white/[0.04]"
                : i < (["org", "invite"] as const).indexOf(step)
                  ? "text-accent"
                  : "t-ghost"
            }`}
          >
            {i + 1}. {s === "org" ? "Organization" : "Invite"}
          </div>
        ))}
      </div>

      <div className="p-6">
        {/* Step 1: Create org */}
        {step === "org" && (
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.15em] t-meta mb-2">
                Organization namespace
              </label>
              <div className="flex items-center">
                <span className="bg-white/[0.06] border border-r-0 border-white/[0.08] rounded-l px-3 py-2 font-mono text-sm t-meta">
                  @
                </span>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    setError("");
                    setReserved(null);
                    setRequestSent(false);
                  }}
                  placeholder="my-org"
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-r px-3 py-2 font-mono text-sm t-heading placeholder:t-ghost outline-none focus:border-accent/40 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.15em] t-meta mb-2">
                Display name
              </label>
              <input
                type="text"
                value={orgDisplayName}
                onChange={(e) => setOrgDisplayName(e.target.value)}
                placeholder="My Organization"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 font-mono text-sm t-heading placeholder:t-ghost outline-none focus:border-accent/40 transition-colors"
              />
            </div>

            {suggestions.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mb-2">
                  Suggestions from GitHub
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => selectSuggestion(s)}
                      className={`px-3 py-1.5 rounded text-[11px] font-mono border transition-colors ${
                        orgName === s.name.toLowerCase()
                          ? "bg-accent/10 border-accent/30 text-accent"
                          : "bg-white/[0.04] border-white/[0.06] t-meta hover:border-white/[0.12]"
                      }`}
                    >
                      @{s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 font-mono">{error}</p>
            )}

            {reserved ? (
              <div className="p-3 rounded-md bg-amber-500/5 border border-amber-500/20 space-y-3">
                {requestSent ? (
                  <>
                    <p className="text-xs text-green-400 font-mono">Request submitted</p>
                    <p className="text-xs t-nav">
                      We&apos;ll review your request for <span className="font-mono text-accent">@{reserved.orgName}</span>. It will appear in your dashboard as pending.
                    </p>
                    <button
                      onClick={() => router.push("/dashboard")}
                      className="w-full py-2.5 rounded font-mono text-xs uppercase tracking-[0.15em] bg-accent text-black hover:bg-accent/90 transition-colors"
                    >
                      Go to Dashboard
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs t-nav">{reserved.message}</p>
                    <textarea
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder={`e.g. I'm an admin of the GitHub org that owns ${reserved.orgName}`}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 font-mono text-xs t-heading placeholder:t-ghost outline-none focus:border-accent/40 transition-colors resize-none h-20"
                      autoFocus
                    />
                    <button
                      onClick={handleRequestAccess}
                      disabled={requesting || !requestReason.trim()}
                      className="w-full py-2 rounded font-mono text-xs uppercase tracking-[0.15em] bg-accent text-black hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {requesting ? "Submitting..." : "Submit Request"}
                    </button>
                    <button
                      onClick={() => { setReserved(null); setError(""); setOrgName(""); setOrgDisplayName(""); }}
                      className="w-full text-center text-[11px] font-mono t-ghost hover:t-meta transition-colors"
                    >
                      Use a different name
                    </button>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={createOrg}
                disabled={!orgName || loading}
                className="w-full py-2.5 rounded font-mono text-xs uppercase tracking-[0.15em] bg-accent text-black hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Organization"}
              </button>
            )}
          </div>
        )}

        {/* Step 2: Invite members */}
        {step === "invite" && (
          <div className="space-y-4">
            <p className="text-sm t-nav">
              Invite team members to{" "}
              <span className="text-accent font-mono">@{orgName}</span>.
              You can always do this later from your dashboard.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder="GitHub username"
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 font-mono text-sm t-heading placeholder:t-ghost outline-none focus:border-accent/40 transition-colors"
                onKeyDown={(e) => e.key === "Enter" && addInvite()}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="bg-[#1a1a1a] border border-white/[0.08] rounded px-2 py-2 font-mono text-xs t-meta outline-none [&>option]:bg-[#1a1a1a] [&>option]:text-white/90"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={addInvite}
                disabled={!inviteUsername.trim()}
                className="px-3 py-2 rounded font-mono text-xs bg-white/[0.06] border border-white/[0.08] t-meta hover:text-fg transition-colors disabled:opacity-40"
              >
                Add
              </button>
            </div>

            {invitedUsers.length > 0 && (
              <div className="space-y-1">
                {invitedUsers.map((u) => (
                  <div
                    key={u.username}
                    className="flex items-center justify-between px-3 py-2 rounded bg-white/[0.04] border border-white/[0.06]"
                  >
                    <span className="font-mono text-xs t-heading">
                      {u.username}
                    </span>
                    <span className="font-mono text-[10px] t-ghost">
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={finish}
                className="flex-1 py-2.5 rounded font-mono text-xs uppercase tracking-[0.15em] bg-accent text-black hover:bg-accent/90 transition-colors"
              >
                {invitedUsers.length > 0 ? "Send Invites & Finish" : "Finish Setup"}
              </button>
            </div>

            <button
              onClick={() => { router.push("/dashboard"); }}
              className="w-full py-2 rounded font-mono text-xs uppercase tracking-[0.15em] bg-white/[0.06] border border-white/[0.08] t-nav hover:t-heading hover:bg-white/[0.1] transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
