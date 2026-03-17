"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function OrgSettingsMenu({ orgName, isOwner }: { orgName: string; isOwner: boolean }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const expected = `delete ${orgName}`;
  const confirmed = confirm.toLowerCase() === expected.toLowerCase();

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleCloseDelete = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setDeleteOpen(false);
      setClosing(false);
      setConfirm("");
      setError("");
    }, 300);
  }, []);

  async function handleDelete() {
    if (!confirmed) return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/orgs/${orgName}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to delete organization");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 rounded hover:bg-white/[0.06] transition-colors"
          title="Organization settings"
        >
          <svg className="w-4 h-4 t-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 border border-white/[0.08] rounded-lg bg-[#141414] shadow-2xl overflow-hidden z-10 animate-dialog-in">
            {isOwner && (
              <button
                onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}
                className="w-full text-left px-3 py-2 text-xs font-mono text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Delete organization
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleCloseDelete}>
          <div className={`absolute inset-0 bg-black/50 backdrop-blur-xs ${closing ? "animate-overlay-out" : "animate-overlay-in"}`} />
          <div className={`relative w-full max-w-md px-4 ${closing ? "animate-dialog-out" : "animate-dialog-in"}`} onClick={(e) => e.stopPropagation()}>
            <div className="border border-white/[0.06] rounded-lg bg-[#141414] p-4 space-y-4 shadow-2xl">
              <div>
                <p className="text-sm t-heading font-medium">Delete organization</p>
                <p className="text-xs t-nav mt-1">
                  This will permanently delete <span className="font-mono text-red-400">@{orgName}</span>, all its
                  namespaces, and remove all members. Published packages will remain but become unowned.
                </p>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mb-1.5">
                  Type <span className="t-meta">delete {orgName}</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={`delete ${orgName}`}
                  className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/[0.08] text-sm t-heading placeholder:t-ghost focus:outline-none focus:border-red-500/40 font-mono"
                  autoFocus
                />
              </div>

              {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={handleCloseDelete}
                  className="flex-1 py-2 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs font-mono t-heading hover:bg-white/[0.1] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!confirmed || loading}
                  className="flex-1 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Deleting..." : "Delete Organization"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
