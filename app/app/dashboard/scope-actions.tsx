"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ScopeActions({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newScopeName, setNewScopeName] = useState("");

  // Reserved namespace flow
  const [reserved, setReserved] = useState<{
    scopeName: string;
    message: string;
  } | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requesting, setRequesting] = useState(false);

  async function handleCreateScope() {
    if (!newScopeName.trim() || !orgId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setReserved(null);

    const res = await fetch("/api/scopes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newScopeName.trim().toLowerCase(),
        orgId,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      if (data.error === "reserved") {
        setReserved({
          scopeName: data.scopeName,
          message: data.message,
        });
      } else {
        setError(data.error || "Failed to create namespace");
      }
    } else {
      setSuccess(`@${data.name} created`);
      setNewScopeName("");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleRequestAccess() {
    if (!reserved || !requestReason.trim()) return;
    setRequesting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/scopes/${reserved.scopeName}/request-access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId, reason: requestReason }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit request");
      } else {
        setRequestSent(true);
      }
    } catch {
      setError("Network error");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.04]">
      <div className="flex gap-2">
        <div className="flex items-center flex-1">
          <span className="bg-white/[0.06] border border-r-0 border-white/[0.08] rounded-l px-2 py-1.5 text-xs t-meta font-mono">
            @
          </span>
          <input
            type="text"
            value={newScopeName}
            onChange={(e) =>
              setNewScopeName(
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
              )
            }
            placeholder="namespace"
            className="flex-1 px-3 py-1.5 rounded-r bg-white/[0.04] border border-white/[0.08] text-sm t-heading placeholder:t-ghost focus:outline-none focus:border-accent/40 font-mono"
          />
        </div>
        <button
          onClick={handleCreateScope}
          disabled={loading || !newScopeName.trim()}
          className="px-4 py-1.5 rounded-md bg-accent/10 text-accent border border-accent/20 text-xs hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? "..." : "Add namespace"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      {success && <p className="text-xs text-green-400 mt-2">{success}</p>}

      {reserved && (
        <div className="mt-3 p-3 rounded-md bg-amber-500/5 border border-amber-500/20 space-y-3">
          {requestSent ? (
            <>
              <p className="text-xs text-green-400 font-mono">
                Request submitted
              </p>
              <p className="text-xs t-nav">
                We&apos;ll review your request for{" "}
                <span className="font-mono text-accent">
                  @{reserved.scopeName}
                </span>
                . It will appear in your dashboard as pending.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs t-nav">{reserved.message}</p>
              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder={`e.g. I'm an admin of the GitHub org that owns ${reserved.scopeName}`}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 font-mono text-xs t-heading placeholder:t-ghost outline-none focus:border-accent/40 transition-colors resize-none h-20"
                autoFocus
              />
              <button
                onClick={handleRequestAccess}
                disabled={requesting || !requestReason.trim()}
                className="px-4 py-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs hover:bg-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {requesting ? "Submitting..." : "Request access"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
