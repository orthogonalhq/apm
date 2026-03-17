"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function ScopeSettingsMenu({
  orgName,
  scopeName,
  isOwner,
}: {
  orgName: string;
  scopeName: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteClosing, setDeleteClosing] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const expected = `delete ${scopeName}`;
  const confirmed = confirm.toLowerCase() === expected.toLowerCase();

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
    setDeleteClosing(true);
    setTimeout(() => {
      setDeleteOpen(false);
      setDeleteClosing(false);
      setConfirm("");
      setDeleteError("");
    }, 300);
  }, []);

  async function handleDelete() {
    if (!confirmed) return;
    setDeleteLoading(true);
    setDeleteError("");

    const res = await fetch(`/api/scopes/${scopeName}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error || "Failed to delete namespace");
      setDeleteLoading(false);
      return;
    }

    router.push(`/dashboard/orgs/${orgName}`);
    router.refresh();
  }

  if (!isOwner) return null;

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 rounded hover:bg-white/[0.06] transition-colors"
          title="Namespace settings"
        >
          <svg className="w-4 h-4 t-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 border border-white/[0.08] rounded-lg bg-[#141414] shadow-2xl overflow-hidden z-10 animate-dialog-in">
            <button
              onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}
              className="w-full text-left px-3 py-2 text-xs font-mono text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Delete namespace
            </button>
          </div>
        )}
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleCloseDelete}>
          <div className={`absolute inset-0 bg-black/50 backdrop-blur-xs ${deleteClosing ? "animate-overlay-out" : "animate-overlay-in"}`} />
          <div className={`relative w-full max-w-md px-4 ${deleteClosing ? "animate-dialog-out" : "animate-dialog-in"}`} onClick={(e) => e.stopPropagation()}>
            <div className="border border-white/[0.06] rounded-lg bg-[#141414] p-4 space-y-4 shadow-2xl">
              <div>
                <p className="text-sm t-heading font-medium">Delete namespace</p>
                <p className="text-xs t-nav mt-1">
                  This will permanently delete <span className="font-mono text-red-400">@{scopeName}</span> and all its packages. This cannot be undone.
                </p>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mb-1.5">
                  Type <span className="t-meta">delete {scopeName}</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={`delete ${scopeName}`}
                  className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/[0.08] text-sm t-heading placeholder:t-ghost focus:outline-none focus:border-red-500/40 font-mono"
                  autoFocus
                />
              </div>

              {deleteError && <p className="text-xs text-red-400 font-mono">{deleteError}</p>}

              <div className="flex gap-2">
                <button
                  onClick={handleCloseDelete}
                  className="flex-1 py-2 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs font-mono t-heading hover:bg-white/[0.1] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!confirmed || deleteLoading}
                  className="flex-1 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? "Deleting..." : "Delete Namespace"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
