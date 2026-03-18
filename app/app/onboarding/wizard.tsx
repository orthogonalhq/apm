"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Suggestion {
  name: string;
  avatarUrl: string | null;
  type: "user" | "org";
}

type Step = "org" | "invite";
type ReservedState = "checking" | "claimed" | "manual";

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
  const [reservedState, setReservedState] = useState<ReservedState>("checking");
  const [requestReason, setRequestReason] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // Invite step
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

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
        body: JSON.stringify({ name: orgName, displayName: orgDisplayName || orgName }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "reserved") {
          setReserved({ orgName: data.orgName, message: data.message });
          setReservedState("checking");
          setLoading(false);
          // Fire GitHub admin check immediately
          try {
            const reqRes = await fetch(`/api/orgs/${data.orgName}/request-access`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            const reqData = await reqRes.json();
            if (reqRes.ok && reqData.autoApproved) {
              setOrgId(reqData.orgId);
              setReservedState("claimed");
            } else {
              setReservedState("manual");
            }
          } catch {
            setReservedState("manual");
          }
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
    if (!reserved) return;
    setRequesting(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${reserved.orgName}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: requestReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed");
        return;
      }
      if (data.autoApproved) {
        setOrgId(data.orgId);
        setReservedState("claimed");
        return;
      }
      setRequestSent(true);
    } catch {
      setError("Network error");
    } finally {
      setRequesting(false);
    }
  }, [reserved, requestReason]);

  const createInviteLink = useCallback(async () => {
    if (!orgName) return;
    setCreatingLink(true);
    try {
      const res = await fetch(`/api/orgs/${orgName}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 7 }),
      });
      if (res.ok) {
        const data = await res.json();
        setInviteLink(data.url);
      }
    } catch {
      // silently fail
    } finally {
      setCreatingLink(false);
    }
  }, [orgName]);

  function copyInviteLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  return (
    <div className="border border-white/6 rounded-lg bg-surface">
      {/* Step indicator */}
      <div className="flex border-b border-white/6">
        {(["org", "invite"] as const).map((s, i) => (
          <div
            key={s}
            className={`flex-1 py-3 text-center font-mono text-[10px] uppercase tracking-[0.15em] transition-colors ${
              step === s
                ? "t-heading bg-white/4"
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
                <span className="bg-white/6 border border-r-0 border-white/8 rounded-l px-3 py-2 font-mono text-sm t-meta">
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
                    setRequestReason("");
                  }}
                  placeholder="my-org"
                  className="flex-1 bg-white/4 border border-white/8 rounded-r px-3 py-2 font-mono text-sm t-heading placeholder:t-ghost outline-none focus:border-accent/40 transition-colors"
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
                className="w-full bg-white/4 border border-white/8 rounded px-3 py-2 font-mono text-sm t-heading placeholder:t-ghost outline-none focus:border-accent/40 transition-colors"
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
                          : "bg-white/4 border-white/6 t-meta hover:border-white/12"
                      }`}
                    >
                      @{s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

            {reserved ? (
              <div>
                {/* Checking */}
                {reservedState === "checking" && (
                  <div className="rounded-md border bg-white/4 border-white/8 p-4 flex items-center gap-3">
                    <svg className="w-4 h-4 t-ghost animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <div>
                      <p className="text-xs t-heading font-mono">Verifying GitHub ownership...</p>
                      <p className="text-[11px] t-ghost mt-0.5">Checking if you&apos;re an admin of <span className="font-mono">@{reserved.orgName}</span></p>
                    </div>
                  </div>
                )}

                {/* Claimed */}
                {reservedState === "claimed" && (
                  <div className="rounded-md border bg-emerald-500/10 border-emerald-500/20 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-sm font-mono text-emerald-400 font-medium">Namespace claimed!</p>
                    </div>
                    <p className="text-xs t-nav">
                      <span className="font-mono text-emerald-400">@{reserved.orgName}</span> is now yours. GitHub org admin status verified.
                    </p>
                    <button
                      onClick={() => setStep("invite")}
                      className="w-full py-2.5 rounded font-mono text-xs uppercase tracking-[0.15em] bg-emerald-500 text-black hover:bg-emerald-400 transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                )}

                {/* Manual request form */}
                {reservedState === "manual" && (
                  <div className="rounded-md border bg-amber-500/5 border-amber-500/20 p-4 space-y-3">
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
                          className="w-full bg-white/4 border border-white/8 rounded px-3 py-2 font-mono text-xs t-heading placeholder:t-ghost outline-none focus:border-accent/40 transition-colors resize-none h-20"
                          autoFocus
                        />
                        {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
                        <button
                          onClick={handleRequestAccess}
                          disabled={requesting}
                          className="w-full py-2 rounded font-mono text-xs uppercase tracking-[0.15em] bg-accent text-black hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {requesting ? "Submitting..." : "Submit Request"}
                        </button>
                        <button
                          onClick={() => { setReserved(null); setOrgName(""); setOrgDisplayName(""); }}
                          className="w-full text-center text-[11px] font-mono t-ghost hover:t-meta transition-colors"
                        >
                          Use a different name
                        </button>
                      </>
                    )}
                  </div>
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

            {inviteLink ? (
              <div className="space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] t-ghost">Share this link</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 bg-white/4 border border-white/8 rounded px-3 py-2 font-mono text-xs t-heading outline-none"
                  />
                  <button
                    onClick={copyInviteLink}
                    className="shrink-0 px-3 py-2 rounded font-mono text-xs bg-white/6 border border-white/8 t-meta hover:text-fg transition-colors"
                  >
                    {inviteCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-[11px] t-ghost">Anyone with this link can join as a member. Expires in 7 days.</p>
              </div>
            ) : (
              <button
                onClick={createInviteLink}
                disabled={creatingLink}
                className="w-full py-2.5 rounded font-mono text-xs uppercase tracking-[0.15em] bg-white/6 border border-white/8 t-heading hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {creatingLink ? "Creating..." : "Create invite link"}
              </button>
            )}

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-2.5 rounded font-mono text-xs uppercase tracking-[0.15em] bg-accent text-black hover:bg-accent/90 transition-colors"
            >
              {inviteLink ? "Finish Setup" : "Skip for now"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
