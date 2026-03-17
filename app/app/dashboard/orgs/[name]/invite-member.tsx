"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export function InviteMember({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setUsername("");
      setRole("member");
      setError("");
      setSuccess("");
    }, 300);
  }, []);

  async function handleInvite() {
    if (!username.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch(`/api/orgs/${orgId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), role }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to invite member");
      setLoading(false);
      return;
    }

    setSuccess(`Invited ${username.trim()} as ${role}`);
    setUsername("");
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] t-ghost hover:text-accent hover:border-accent/20 hover:bg-accent/10 transition-colors"
        title="Invite member"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <circle cx="9" cy="7" r="4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 21v-1a6 6 0 016-6h2a6 6 0 016 6v1" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 8v6M22 11h-6" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
          <div className={`absolute inset-0 bg-black/50 backdrop-blur-xs ${closing ? "animate-overlay-out" : "animate-overlay-in"}`} />
          <div className={`relative w-full max-w-md px-4 ${closing ? "animate-dialog-out" : "animate-dialog-in"}`} onClick={(e) => e.stopPropagation()}>
            <div className="border border-white/[0.06] rounded-lg bg-[#141414] p-4 space-y-3 shadow-2xl">
              <p className="text-sm t-heading font-medium">Invite member</p>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mb-1">
                  GitHub username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); setSuccess(""); }}
                  placeholder="username"
                  className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/[0.08] text-sm t-heading placeholder:t-ghost focus:outline-none focus:border-accent/40 font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#1a1a1a] border border-white/[0.08] text-sm t-heading font-mono outline-none focus:border-accent/40 [&>option]:bg-[#1a1a1a] [&>option]:text-white/90"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
              {success && <p className="text-xs text-green-400 font-mono">{success}</p>}

              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs font-mono t-heading hover:bg-white/[0.1] transition-colors"
                >
                  {success ? "Done" : "Cancel"}
                </button>
                <button
                  onClick={handleInvite}
                  disabled={loading || !username.trim()}
                  className="flex-1 py-2 rounded-md bg-accent text-black text-xs font-mono hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Inviting..." : "Invite"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
