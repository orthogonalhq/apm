"use client";

import { useState, useEffect, useCallback } from "react";

interface WebhookInfo {
  connected: boolean;
  hookId?: number;
  active?: boolean;
  lastDelivery?: number | null;
  lastDeliveryAt?: string | null;
  createdAt?: string;
  error?: string;
}

export function WebhookStatus({
  orgName,
  repo,
}: {
  orgName: string;
  repo: string;
}) {
  const [status, setStatus] = useState<WebhookInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orgs/${orgName}/webhook?repo=${encodeURIComponent(repo)}`
      );
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [orgName, repo]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleConnect = useCallback(async () => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgName}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to connect");
      } else {
        await checkStatus();
      }
    } catch {
      setError("Network error");
    }
    setActionLoading(false);
  }, [orgName, repo, checkStatus]);

  const handleDisconnect = useCallback(async () => {
    if (!status?.hookId) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgName}/webhook`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, hookId: status.hookId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to disconnect");
      } else {
        setStatus({ connected: false });
      }
    } catch {
      setError("Network error");
    }
    setActionLoading(false);
  }, [orgName, repo, status?.hookId]);

  if (loading) {
    return (
      <div className="border border-white/[0.06] rounded-lg bg-surface p-4">
        <p className="text-xs font-mono t-ghost">Checking webhook status...</p>
      </div>
    );
  }

  if (status?.connected) {
    const lastCode = status.lastDelivery;
    const isHealthy = lastCode === null || lastCode === 200 || lastCode === 0;
    const lastAt = status.lastDeliveryAt
      ? new Date(status.lastDeliveryAt).toLocaleDateString()
      : null;

    return (
      <div className="border border-white/[0.06] rounded-lg bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isHealthy ? "bg-green-400" : "bg-red-400"}`} />
            <p className="text-xs t-heading font-mono">Connected</p>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={actionLoading}
            className="text-[10px] font-mono text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
          >
            {actionLoading ? "..." : "Disconnect"}
          </button>
        </div>

        <div className="flex items-center gap-4 text-[10px] font-mono t-ghost">
          <span>Repo: <span className="t-meta">{repo}</span></span>
          {status.active !== undefined && (
            <span>Status: <span className={status.active ? "text-green-400" : "text-amber-400"}>
              {status.active ? "active" : "paused"}
            </span></span>
          )}
          {lastAt && (
            <span>Last sync: <span className="t-meta">{lastAt}</span></span>
          )}
          {lastCode !== null && lastCode !== undefined && lastCode !== 0 && (
            <span>Last response: <span className={lastCode === 200 ? "text-green-400" : "text-red-400"}>
              {lastCode}
            </span></span>
          )}
        </div>

        <p className="text-[10px] t-ghost">
          Push changes to <span className="font-mono t-meta">{repo}</span> and packages will update automatically.
        </p>

        {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
      </div>
    );
  }

  const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";

  // Not connected
  return (
    <div className="border border-white/[0.06] rounded-lg bg-surface p-4 space-y-3">
      <p className="text-xs t-nav">
        Auto-update packages when you push to <span className="font-mono t-heading">{repo}</span>.
      </p>

      {status?.error && (
        <p className="text-[10px] text-amber-400 font-mono">{status.error}</p>
      )}

      {isLocal ? (
        <div className="px-3 py-2 rounded bg-white/[0.02] border border-white/[0.04]">
          <p className="text-[10px] t-ghost">
            Auto-sync requires a public URL. Deploy to production to enable webhooks.
            For local testing, use <code className="text-accent/80">apm sync</code> or the manual sync above.
          </p>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={actionLoading}
          className="px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs font-mono t-meta hover:t-heading hover:border-white/[0.12] transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          {actionLoading ? "Connecting..." : "Enable Auto-sync"}
        </button>
      )}

      {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
    </div>
  );
}
