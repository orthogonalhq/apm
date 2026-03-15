"use client";

import { useState, useCallback } from "react";

export function CopyButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`shrink-0 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] border border-accent/60 text-accent rounded-[2px] hover:bg-accent hover:text-white hover:border-accent transition-all duration-200 active:scale-[0.97] ${className}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
