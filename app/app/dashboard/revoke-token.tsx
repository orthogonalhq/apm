"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export function RevokeToken({ tokenId, tokenName }: { tokenId: string; tokenName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const expected = `delete ${tokenName}`;
  const confirmed = confirm.toLowerCase() === expected.toLowerCase();

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setConfirm("");
      setError("");
    }, 300);
  }, []);

  async function handleRevoke() {
    if (!confirmed) return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/auth/tokens/${tokenId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to revoke token");
      setLoading(false);
      return;
    }

    setLoading(false);
    handleClose();
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded hover:bg-red-500/10 transition-colors group"
        title="Revoke token"
      >
        <svg className="w-3.5 h-3.5 t-ghost group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
          <div className={`absolute inset-0 bg-black/50 backdrop-blur-xs ${closing ? "animate-overlay-out" : "animate-overlay-in"}`} />
          <div className={`relative w-full max-w-md px-4 ${closing ? "animate-dialog-out" : "animate-dialog-in"}`} onClick={(e) => e.stopPropagation()}>
            <div className="border border-white/[0.06] rounded-lg bg-[#141414] p-4 space-y-4 shadow-2xl">
              <div>
                <p className="text-sm t-heading font-medium">Revoke token</p>
                <p className="text-xs t-nav mt-1">
                  This will permanently revoke <span className="font-mono text-red-400">{tokenName}</span>. Any
                  systems using this token will lose access immediately.
                </p>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mb-1.5">
                  Type <span className="t-meta">delete {tokenName}</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={`delete ${tokenName}`}
                  className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/[0.08] text-sm t-heading placeholder:t-ghost focus:outline-none focus:border-red-500/40 font-mono"
                  autoFocus
                />
              </div>

              {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs font-mono t-heading hover:bg-white/[0.1] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={!confirmed || loading}
                  className="flex-1 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Revoking..." : "Revoke Token"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
