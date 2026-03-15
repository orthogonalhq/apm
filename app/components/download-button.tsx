"use client";

import { useCallback } from "react";

export function DownloadButton({
  content,
  filename,
  className = "",
}: {
  content: string;
  filename: string;
  className?: string;
}) {
  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [content, filename]);

  return (
    <button
      onClick={handleDownload}
      title="Download"
      className={`shrink-0 p-1.5 rounded-[2px] text-fg/70 hover:text-accent hover:bg-white/6 transition-all duration-200 active:scale-[0.97] ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  );
}
