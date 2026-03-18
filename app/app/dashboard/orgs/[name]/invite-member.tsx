"use client";

import { useState, useCallback, useEffect } from "react";

interface Invite {
  id: string;
  token: string;
  url: string;
  role: string;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export function InviteLink({ orgName }: { orgName: string }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [creating, setCreating] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    const res = await fetch(`/api/orgs/${orgName}/invites`);
    if (res.ok) {
      const data = await res.json();
      setInvites(data);
    }
  }, [orgName]);

  useEffect(() => {
    if (open) fetchInvites();
  }, [open, fetchInvites]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 300);
  }, []);

  async function handleCreate() {
    setCreating(true);
    const res = await fetch(`/api/orgs/${orgName}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expiresInDays: expiresInDays || undefined,
        maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
      }),
    });
    if (res.ok) {
      const invite = await res.json();
      setInvites((prev) => [...prev, invite]);
      copyToClipboard(invite.id, invite.url);
    }
    setCreating(false);
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/orgs/${orgName}/invites/${id}`, { method: "DELETE" });
    setInvites((prev) => prev.filter((i) => i.id !== id));
  }

  function copyToClipboard(id: string, url: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function formatExpiry(expiresAt: string | null) {
    if (!expiresAt) return "never";
    const d = new Date(expiresAt);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    if (diff < 0) return "expired";
    const days = Math.ceil(diff / 86400000);
    if (days <= 1) return "< 1 day";
    return `${days} days`;
  }

  // Filter out expired/maxed invites for display
  const activeInvites = invites.filter((inv) => {
    if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return false;
    if (inv.maxUses && inv.useCount >= inv.maxUses) return false;
    return true;
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-md bg-white/4 border border-white/6 t-ghost hover:text-accent hover:border-accent/20 hover:bg-accent/10 transition-colors"
        title="Invite members"
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
            <div className="border border-white/6 rounded-lg bg-[#141414] p-4 space-y-4 shadow-2xl">
              <p className="text-sm t-heading font-medium">Invite members</p>
              <p className="text-xs t-nav">Create a shareable link. Anyone with the link can join as a member.</p>

              {/* Create section */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mb-1">Expires</label>
                    <select
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded bg-[#1a1a1a] border border-white/8 text-xs font-mono t-heading outline-none [&>option]:bg-[#1a1a1a] [&>option]:text-white/90"
                    >
                      <option value={7}>7 days</option>
                      <option value={30}>30 days</option>
                      <option value={0}>Never</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mb-1">Max uses</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="Unlimited"
                      className="w-full px-2 py-1.5 rounded bg-white/4 border border-white/8 text-xs font-mono t-heading placeholder:t-ghost outline-none focus:border-accent/40"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full py-2 rounded-md bg-accent text-black text-xs font-mono hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {creating ? "Creating..." : "Create invite link"}
                </button>
              </div>

              {/* Active invites */}
              {activeInvites.length > 0 && (
                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] t-ghost">Active links</p>
                  {activeInvites.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-2 p-2 rounded bg-white/4 border border-white/6">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[11px] t-heading truncate">{inv.url.replace(/^https?:\/\//, '')}</p>
                        <p className="font-mono text-[10px] t-ghost">
                          {inv.useCount}{inv.maxUses ? `/${inv.maxUses}` : ""} uses
                          {" · "}
                          {formatExpiry(inv.expiresAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(inv.id, inv.url)}
                        className="shrink-0 p-1 rounded hover:bg-white/6 transition-colors"
                        title="Copy link"
                      >
                        {copiedId === inv.id ? (
                          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 t-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        className="shrink-0 p-1 rounded hover:bg-red-500/10 transition-colors"
                        title="Revoke"
                      >
                        <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full py-2 rounded-md bg-white/6 border border-white/8 text-xs font-mono t-heading hover:bg-white/10 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
