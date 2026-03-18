"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export function CreateOrg() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reserved, setReserved] = useState<{ orgName: string; message: string } | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 300);
  }, []);

  function resetForm() {
    setName("");
    setDisplayName("");
    setReserved(null);
    setError("");
    setRequestSent(false);
    setRequestReason("");
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    setReserved(null);

    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim().toLowerCase(),
        displayName: displayName.trim() || name.trim(),
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      if (data.error === "reserved") {
        setReserved({ orgName: data.orgName, message: data.message });
      } else {
        setError(data.message || data.error || "Failed to create organization");
      }
      setLoading(false);
      return;
    }

    resetForm();
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  async function handleRequestAccess() {
    if (!reserved || !requestReason.trim()) return;
    setRequesting(true);
    setError("");

    const res = await fetch(`/api/orgs/${reserved.orgName}/request-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: requestReason.trim() }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Request failed");
      setRequesting(false);
      return;
    }

    if (data.autoApproved) {
      handleClose();
      router.push(`/dashboard/orgs/${reserved.orgName}`);
      router.refresh();
      return;
    }

    setRequestSent(true);
    setRequesting(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => open ? handleClose() : setOpen(true)}
        className="px-3 py-1.5 rounded-md bg-accent/10 text-accent border border-accent/20 text-xs font-mono hover:bg-accent/20 transition-colors"
      >
        {open ? "Cancel" : "+ Create"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
          <div className={`absolute inset-0 bg-black/50 backdrop-blur-xs ${closing ? "animate-overlay-out" : "animate-overlay-in"}`} />
          <div className={`relative w-full max-w-md px-4 ${closing ? "animate-dialog-out" : "animate-dialog-in"}`} onClick={(e) => e.stopPropagation()}>
          <div className="border border-white/[0.06] rounded-lg bg-[#141414] p-4 space-y-3 shadow-2xl">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mb-1">
                Organization namespace
              </label>
              <div className="flex items-center">
                <span className="bg-white/[0.06] border border-r-0 border-white/[0.08] rounded-l px-3 py-2 text-sm t-meta font-mono">
                  @
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setReserved(null); setError(""); setRequestSent(false); setRequestReason(""); }}
                  placeholder="my-org"
                  className="flex-1 px-3 py-2 rounded-r bg-white/[0.04] border border-white/[0.08] text-sm t-heading placeholder:t-ghost focus:outline-none focus:border-accent/40 font-mono"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.15em] t-ghost mb-1">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="My Organization"
                className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/[0.08] text-sm t-heading placeholder:t-ghost focus:outline-none focus:border-accent/40 font-mono"
              />
            </div>
            {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

            {reserved ? (
              <div className="p-3 rounded-md bg-amber-500/5 border border-amber-500/20 space-y-3">
                {requestSent ? (
                  <>
                    <p className="text-xs text-green-400 font-mono">Request submitted</p>
                    <p className="text-xs t-nav">
                      We&apos;ll review your request for <span className="font-mono text-accent">@{reserved.orgName}</span>. It will appear in your dashboard as pending.
                    </p>
                    <button
                      onClick={() => { handleClose(); }}
                      className="w-full py-2 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs font-mono t-heading hover:bg-white/[0.1] transition-colors"
                    >
                      Done
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs t-nav">{reserved.message}</p>
                    <textarea
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder={`e.g. I'm an admin of the GitHub org that owns ${reserved.orgName}`}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 font-mono text-xs t-heading placeholder:t-ghost outline-none focus:border-accent/40 transition-colors resize-none h-20"
                      autoFocus
                    />
                    <button
                      onClick={handleRequestAccess}
                      disabled={requesting || !requestReason.trim()}
                      className="w-full py-2 rounded-md bg-accent text-black text-xs font-mono hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {requesting ? "Submitting..." : "Submit Request"}
                    </button>
                    <button
                      onClick={() => { resetForm(); }}
                      className="w-full text-center text-[11px] font-mono t-ghost hover:t-meta transition-colors"
                    >
                      Use a different name
                    </button>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={handleCreate}
                disabled={loading || !name.trim()}
                className="w-full py-2 rounded-md bg-accent text-black text-xs font-mono hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Organization"}
              </button>
            )}
          </div>
          </div>
        </div>
      )}
    </>
  );
}
