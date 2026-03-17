"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export function RejectButton({
  orgName,
  publisherId,
}: {
  orgName: string;
  publisherId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setReason("");
      setError("");
    }, 300);
  }, []);

  async function handleReject() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/reject-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgName, publisherId, reason: reason.trim() || undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to reject");
      setLoading(false);
      return;
    }

    handleClose();
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono hover:bg-red-500/20 transition-colors"
      >
        Reject
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
          <div className={`absolute inset-0 bg-black/50 backdrop-blur-xs ${closing ? "animate-overlay-out" : "animate-overlay-in"}`} />
          <div className={`relative w-full max-w-md px-4 ${closing ? "animate-dialog-out" : "animate-dialog-in"}`} onClick={(e) => e.stopPropagation()}>
            <div className="border border-white/[0.06] rounded-lg bg-[#141414] p-4 space-y-3 shadow-2xl">
              <p className="text-sm t-heading font-medium">Reject @{orgName}</p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for rejection (optional)"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 font-mono text-xs t-heading placeholder:t-ghost outline-none focus:border-red-500/40 transition-colors resize-none h-20"
                autoFocus
              />
              {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs font-mono t-heading hover:bg-white/[0.1] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="flex-1 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                >
                  {loading ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
