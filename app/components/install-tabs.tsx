"use client";

import { useState, useCallback } from "react";
import { PanelBar } from "./panel-bar";

type Platform = "macos" | "windows" | "linux" | "npm";

const TABS: { key: Platform; label: string }[] = [
  { key: "macos", label: "macOS" },
  { key: "windows", label: "Windows" },
  { key: "linux", label: "Linux" },
  { key: "npm", label: "npm" },
];

const COMMANDS: Record<Platform, string> = {
  macos: "brew install orthogonal/tap/apm",
  windows: "winget install Orthogonal.APM",
  linux: "curl -fsSL https://apm.sh/install | sh",
  npm: "npm install -g @orthogonal/apm",
};

function CopyIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth={1.5} />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth={1.5} />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function InstallTabs() {
  const [tab, setTab] = useState<Platform>("macos");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(COMMANDS[tab]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [tab]);

  return (
    <div className="border-y border-white/[0.06]">
      <PanelBar label="apm::install" meta={`${TABS.length} methods`} />

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-white/[0.06]">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`cursor-pointer px-5 py-3 font-mono text-xs tracking-wide transition-colors ${
              tab === key
                ? "bg-white/[0.06] t-card-title"
                : "t-meta hover:t-body"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="px-6 md:px-10 py-6 md:py-8">
        <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] px-4 py-3 rounded-[3px]">
          <span className="font-mono text-xs t-meta select-none">$</span>
          <code className="font-mono text-sm t-card-title flex-1 overflow-x-auto whitespace-nowrap">
            {COMMANDS[tab]}
          </code>
          <button
            onClick={handleCopy}
            className="cursor-pointer shrink-0 p-1.5 t-meta hover:t-card-title transition-colors"
            aria-label="Copy to clipboard"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}
