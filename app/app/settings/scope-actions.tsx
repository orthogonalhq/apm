"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ScopeActions({
  scopeName,
  mode,
}: {
  scopeName?: string;
  mode?: "claim" | "verify";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [claimName, setClaimName] = useState("");

  async function handleVerify() {
    if (!scopeName) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch(`/api/scopes/${scopeName}/verify`, {
      method: "POST",
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Verification failed");
    } else {
      setSuccess(`@${scopeName} verified via ${data.verificationMethod}`);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleClaim() {
    if (!claimName.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/scopes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: claimName.trim().toLowerCase() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Claim failed");
    } else {
      setSuccess(`@${data.name} claimed`);
      setClaimName("");
      router.refresh();
    }
    setLoading(false);
  }

  if (mode === "claim") {
    return (
      <div className="mt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={claimName}
            onChange={(e) => setClaimName(e.target.value)}
            placeholder="scope-name"
            className="flex-1 px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-sm t-heading placeholder:t-ghost focus:outline-none focus:border-accent/40"
          />
          <button
            onClick={handleClaim}
            disabled={loading || !claimName.trim()}
            className="px-4 py-2 rounded-md bg-accent/10 text-accent border border-accent/20 text-sm hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "Claim scope"}
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        {success && <p className="text-xs text-green-400 mt-2">{success}</p>}
      </div>
    );
  }

  // Verify mode (shown on unverified scopes)
  return (
    <div className="mt-3 pt-3 border-t border-white/[0.04]">
      <div className="flex items-center justify-between">
        <p className="text-xs t-nav">
          Verify this scope by proving you admin the linked GitHub org.
        </p>
        <button
          onClick={handleVerify}
          disabled={loading}
          className="px-3 py-1.5 rounded-md bg-accent/10 text-accent border border-accent/20 text-xs hover:bg-accent/20 transition-colors disabled:opacity-40"
        >
          {loading ? "Verifying..." : "Verify via GitHub"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      {success && <p className="text-xs text-green-400 mt-2">{success}</p>}
    </div>
  );
}
