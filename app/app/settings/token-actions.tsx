"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TokenActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  async function handleCreate() {
    if (!tokenName.trim()) return;
    setLoading(true);
    setError(null);
    setCreatedToken(null);

    const res = await fetch("/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tokenName.trim() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create token");
    } else {
      setCreatedToken(data.token);
      setTokenName("");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={tokenName}
          onChange={(e) => setTokenName(e.target.value)}
          placeholder="Token name (e.g. CI, laptop)"
          className="flex-1 px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-sm t-heading placeholder:t-ghost focus:outline-none focus:border-accent/40"
        />
        <button
          onClick={handleCreate}
          disabled={loading || !tokenName.trim()}
          className="px-4 py-2 rounded-md bg-accent/10 text-accent border border-accent/20 text-sm hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "..." : "Create token"}
        </button>
      </div>

      {createdToken && (
        <div className="mt-3 p-3 rounded-md bg-green-500/5 border border-green-500/20">
          <p className="text-xs text-green-400 mb-2">
            Token created. Copy it now — it will not be shown again.
          </p>
          <code className="block text-xs font-mono t-heading bg-white/[0.04] p-2 rounded break-all select-all">
            {createdToken}
          </code>
          <p className="text-xs t-ghost mt-2">
            Save to <code className="text-accent/80">~/.apm/token</code> or set
            as <code className="text-accent/80">APM_TOKEN</code> env var.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
