"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function TokenActions({ mode }: { mode?: "button" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState("");
  const [tokenDescription, setTokenDescription] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState("");
  const [copied, setCopied] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setCreatedToken(null);
      setCreatedName("");
      setTokenDescription("");
      setCopied(false);
    }, 300);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!createdToken) return;
    await navigator.clipboard.writeText(createdToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [createdToken]);

  async function handleCreate() {
    if (!tokenName.trim()) return;
    setLoading(true);
    setError(null);
    setCreatedToken(null);

    const res = await fetch("/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tokenName.trim(), description: tokenDescription.trim() || undefined }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create token");
    } else {
      setCreatedName(tokenName.trim());
      setCreatedToken(data.token);
      setTokenName("");
      router.refresh();
    }
    setLoading(false);
  }

  if (mode === "button") {
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
              {createdToken ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded bg-white/[0.04] border border-white/[0.08]">
                  <span className="flex-1 text-sm font-mono t-heading truncate">{createdName}</span>
                  <span className="shrink-0 text-[10px] font-mono text-green-400">created</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                      placeholder="Token name (e.g. CI, laptop)"
                      className="flex-1 px-3 py-2 rounded bg-white/[0.04] border border-white/[0.08] text-sm t-heading placeholder:t-ghost focus:outline-none focus:border-accent/40 font-mono"
                      autoFocus
                    />
                    <button
                      onClick={handleCreate}
                      disabled={loading || !tokenName.trim()}
                      className="px-4 py-2 rounded-md bg-accent text-black text-xs font-mono hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading ? "..." : "Create"}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={tokenDescription}
                    onChange={(e) => setTokenDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/[0.08] text-xs t-heading placeholder:t-ghost focus:outline-none focus:border-accent/40 font-mono"
                  />
                </div>
              )}

              {createdToken && (
                <div className="p-3 rounded-md bg-green-500/5 border border-green-500/20">
                  <p className="text-xs text-green-400 mb-2">
                    Token created. Copy it now — it will not be shown again.
                  </p>
                  <div className="flex items-start gap-2">
                    <code className="flex-1 text-xs font-mono t-heading bg-white/[0.04] p-2 rounded break-all select-all">
                      {createdToken}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="shrink-0 p-2 rounded bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-colors"
                      title="Copy token"
                    >
                      {copied
                        ? <CheckIcon className="w-3.5 h-3.5 text-green-400" />
                        : <CopyIcon className="w-3.5 h-3.5 t-meta" />
                      }
                    </button>
                  </div>
                  <p className="text-xs t-ghost mt-2">
                    Save to <code className="text-accent/80">~/.apm/token</code> or set
                    as <code className="text-accent/80">APM_TOKEN</code> env var.
                  </p>
                  <button
                    onClick={handleClose}
                    className="w-full mt-3 py-2 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs font-mono t-heading hover:bg-white/[0.1] transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}

              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
