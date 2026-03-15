"use client";

import { useState, useEffect, useCallback } from "react";
import { SearchModal } from "./search-modal";

export function SearchBar({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.06] rounded-lg px-4 py-3 transition-all cursor-text ${className}`}
      >
        <svg
          className="h-4 w-4 shrink-0 t-ghost"
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
        <span className="flex-1 text-left text-sm font-mono t-meta">
          Search agent skills...
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] t-ghost leading-none">
          ⌘K
        </kbd>
      </button>
      <SearchModal open={open} onClose={handleClose} />
    </>
  );
}
