"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export function MemberActions({
  orgId,
  publisherId,
  publisherName,
  currentRole,
  isCurrentUser,
}: {
  orgId: string;
  publisherId: string;
  publisherName: string;
  currentRole: string;
  isCurrentUser: boolean;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Close on outside click
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

  const handleAction = useCallback(async (action: string, role?: string) => {
    setLoading(true);
    setError("");
    setMenuOpen(false);

    const res = await fetch(`/api/orgs/${orgId}/members`, {
      method: action === "remove" ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publisherId, ...(role ? { role } : {}) }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Action failed");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }, [orgId, publisherId, router]);

  // Don't show actions for owners (can't demote/remove yourself as owner)
  if (currentRole === "owner" && isCurrentUser) return null;
  // Don't show actions for pending members
  if (currentRole === "pending") return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        disabled={loading}
        className="p-1 rounded hover:bg-white/[0.06] transition-colors"
      >
        <svg className="w-4 h-4 t-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 border border-white/[0.08] rounded-lg bg-[#141414] shadow-2xl overflow-hidden z-10 animate-dialog-in">
          {currentRole !== "admin" && (
            <button
              onClick={() => handleAction("role", "admin")}
              className="w-full text-left px-3 py-2 text-xs font-mono t-nav hover:bg-white/[0.04] transition-colors"
            >
              Make admin
            </button>
          )}
          {currentRole !== "member" && (
            <button
              onClick={() => handleAction("role", "member")}
              className="w-full text-left px-3 py-2 text-xs font-mono t-nav hover:bg-white/[0.04] transition-colors"
            >
              Make member
            </button>
          )}
          <button
            onClick={() => handleAction("remove")}
            className="w-full text-left px-3 py-2 text-xs font-mono text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Remove {isCurrentUser ? "(leave)" : ""}
          </button>
        </div>
      )}

      {error && (
        <p className="absolute right-0 top-full mt-1 text-[10px] text-red-400 font-mono whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  );
}
