"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ScopeActions({
  orgId,
}: {
  orgId: string;
  orgName?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newScopeName, setNewScopeName] = useState("");

  async function handleCreateScope() {
    if (!newScopeName.trim() || !orgId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

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
      setError(data.error || "Failed to create namespace");
    } else {
      setSuccess(`@${data.name} created`);
      setNewScopeName("");
      router.refresh();
    }
    setLoading(false);
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
            onChange={(e) => setNewScopeName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
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
    </div>
  );
}
