"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApproveButton({
  orgName,
  publisherId,
  publisherName,
  claimType,
  targetOrgId,
}: {
  orgName: string;
  publisherId: string;
  publisherName: string;
  claimType: "org" | "namespace";
  targetOrgId?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleApprove() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/approve-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgName, publisherId, claimType, targetOrgId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to approve");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="px-3 py-1.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-mono hover:bg-green-500/20 transition-colors disabled:opacity-40"
      >
        {loading ? "Approving..." : `Approve → ${publisherName}`}
      </button>
      {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
    </div>
  );
}
