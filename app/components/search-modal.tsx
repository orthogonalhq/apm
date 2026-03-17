"use client";

import { useRouter } from "next/navigation";
import { ScopeLink } from "./scope-link";
import { VerifiedBadge } from "./verified-badge";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type KeyboardEvent,
} from "react";

interface SearchResult {
  scope: string;
  name: string;
  description: string;
  kind: string;
  category: string | null;
  sourceRepo: string;
  tokenCount: number;
  verified: boolean;
}

function KindBadge({ kind }: { kind: string }) {
  const colors: Record<string, string> = {
    skill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "composite": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    workflow: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    app: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border ${colors[kind] ?? "bg-white/5 text-white/40 border-white/10"}`}
    >
      {kind}
    </span>
  );
}

export function SearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);

  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // Manage mount/unmount with animation
  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
      setQuery("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    } else if (visible) {
      setClosing(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setClosing(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on escape
  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
          setSelected(0);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  const navigate = useCallback(
    (scope: string, name: string) => {
      onClose();
      router.push(`/packages/@${scope}/${name}`);
    },
    [onClose, router]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        if (results[selected]) {
          navigate(results[selected].scope, results[selected].name);
        } else if (query.trim()) {
          onClose();
          router.push(`/packages?q=${encodeURIComponent(query.trim())}`);
        }
      }
    },
    [results, selected, navigate, query, onClose, router]
  );

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-xs ${closing ? "animate-overlay-out" : "animate-overlay-in"}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative mx-auto mt-[15vh] w-full max-w-xl px-4 ${closing ? "animate-dialog-out" : "animate-dialog-in"}`}>
        <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#141414] shadow-2xl">
          {/* Input */}
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-4">
            <svg
              className="h-4 w-4 shrink-0 t-meta"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search agent skills..."
              className="flex-1 bg-transparent py-3.5 text-sm text-fg/90 placeholder:t-meta outline-none font-mono"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] t-ghost">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto">
            {loading && (
              <div className="px-4 py-8 text-center">
                <span className="font-mono text-xs t-meta">Searching...</span>
              </div>
            )}

            {!loading && query.trim() && results.length === 0 && (
              <div className="px-4 py-8 text-center">
                <span className="font-mono text-xs t-meta">
                  No results for &ldquo;{query}&rdquo;
                </span>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="py-2">
                {results.map((result, i) => (
                  <button
                    key={`${result.scope}/${result.name}`}
                    onClick={() => navigate(result.scope, result.name)}
                    className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                      i === selected
                        ? "bg-white/[0.06]"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="font-mono text-[10px] t-meta mt-0.5 shrink-0">
                      &gt;
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm truncate">
                          <ScopeLink scope={result.scope} className="t-meta" />
                          <span className="t-card-title">{result.name}</span>
                        </span>
                        {result.verified && <VerifiedBadge />}
                      </div>
                      <span className="block text-xs t-card-desc mt-0.5 line-clamp-1">
                        {result.description}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <KindBadge kind={result.kind} />
                        {result.category && (
                          <span className="font-mono text-[9px] t-meta">
                            {result.category}
                          </span>
                        )}
                        <span className="font-mono text-[9px] t-ghost">
                          {result.tokenCount.toLocaleString()} tokens
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loading && !query.trim() && (
              <div className="px-4 py-8 text-center">
                <span className="font-mono text-xs t-meta">
                  Type to search agent skills...
                </span>
              </div>
            )}
          </div>

          {query.trim() && (
            <button
              onClick={() => {
                onClose();
                router.push(`/packages?q=${encodeURIComponent(query.trim())}`);
              }}
              className="w-full text-left px-4 py-3 flex items-center gap-3 border-t border-white/[0.06] transition-colors hover:bg-white/[0.04]"
            >
              <svg className="h-3.5 w-3.5 shrink-0 t-meta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="font-mono text-xs text-accent">
                View all results for &ldquo;{query.trim()}&rdquo;
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
