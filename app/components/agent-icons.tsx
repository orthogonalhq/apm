// Simplified inline SVG icons for agent products (16x16 viewBox)
// These are simplified representations, not exact brand marks

const iconClass = "w-4 h-4 shrink-0";

export const agentIcons: Record<string, React.ReactNode> = {
  // ── Featured ────────────────────────────────────────────

  // Anthropic — stylized "A" burst
  "Claude Code": (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M9.5 2L6 14h2.5L12 2H9.5zM4.5 5L2 14h2l2.5-9H4.5z" />
    </svg>
  ),
  Claude: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M9.5 2L6 14h2.5L12 2H9.5zM4.5 5L2 14h2l2.5-9H4.5z" />
    </svg>
  ),

  // Nous — degree symbol / orthogonal mark
  Nous: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="5" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    </svg>
  ),

  // OpenAI — hexagonal aperture
  "OpenAI Codex": (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.5l5.2 3v6L8 13.5l-5.2-3v-6L8 1.5zm0 1.7L4.3 5.5v4.1L8 11.8l3.7-2.2V5.5L8 3.2z" />
    </svg>
  ),
  ChatGPT: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.5l5.2 3v6L8 13.5l-5.2-3v-6L8 1.5zm0 1.7L4.3 5.5v4.1L8 11.8l3.7-2.2V5.5L8 3.2z" />
    </svg>
  ),

  // Cursor — pointer arrow
  Cursor: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 2l10 5.5-4.2 1.2L7.5 13 6 9.5 2.5 8.2z" />
    </svg>
  ),

  // GitHub — octocat silhouette
  "GitHub Copilot": (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  ),

  // VS Code — bracket icon
  "VS Code": (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M10.5 1.5l3 2v9l-3 2-7-5.5 2.5-2L10.5 10V3.5l-4 3-2.5-2z" />
    </svg>
  ),

  // Gemini — 4-point star
  "Gemini CLI": (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1C8 5 5 8 1 8c4 0 7 3 7 7 0-4 3-7 7-7-4 0-7-3-7-7z" />
    </svg>
  ),
  Gemini: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1C8 5 5 8 1 8c4 0 7 3 7 7 0-4 3-7 7-7-4 0-7-3-7-7z" />
    </svg>
  ),

  // Goose — simple bird silhouette
  Goose: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M5 3c0-1.1.9-2 2-2s2 .9 2 2c0 .7-.4 1.4-1 1.7V7l4 3v2H4v-2l4-3V5c0-.3-.2-.6-.4-.8C6 3.9 5 3.5 5 3z" />
    </svg>
  ),

  // OpenHands — open hand
  OpenHands: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a1.5 1.5 0 011.5 1.5v4a1 1 0 012 0V5a1 1 0 012 0v3.5a5 5 0 01-10 0V6a1 1 0 012 0v.5a1 1 0 012 0v-4A1.5 1.5 0 018 1z" />
    </svg>
  ),

  // Roo Code — kangaroo ear
  "Roo Code": (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 2c1 0 2 1 2 2v2c2 0 4 2 4 4v3H4v-3c0-2 1.5-3.5 3-4V4c0-.5-.5-1-1-1s-1 .5-1 1v1H3V4c0-1.1 1.3-2 3-2z" />
    </svg>
  ),

  // Windsurf — wave
  Windsurf: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 8c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0" />
      <path d="M1 11c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0" opacity="0.5" />
    </svg>
  ),

  // Databricks — spark/diamond
  Databricks: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1l3 4-3 3-3-3zm0 6l3 3-3 4-3-4z" />
    </svg>
  ),

  // Snowflake — crystalline
  Snowflake: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M7.25 1v3.1L5 2.45l-.75 1.3L7.25 5.6V7.3L5.7 6.4 3.7 5.15l-.75 1.3 2 1.15H1.5v1.5h3.45l-2 1.15.75 1.3L5.7 10l1.55-.9v1.7l-3 1.85.75 1.3L7.25 12.3V15h1.5v-2.7l2.25 1.65.75-1.3-3-1.85V9.1l1.55.9 2 1.25.75-1.3-2-1.15h3.45v-1.5H11.1l2-1.15-.75-1.3L10.3 6l-1.55.9V5.2l3-1.85-.75-1.3L8.75 3.7V1z" />
    </svg>
  ),

  // ── Extended (agentskills.io verified) ──────────────────

  // JetBrains Junie — diamond
  Junie: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <rect x="4" y="4" width="8" height="8" rx="1" transform="rotate(45 8 8)" />
    </svg>
  ),

  // Amp — lightning bolt
  Amp: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M9 1L4 9h3.5L6 15l6-8H8.5z" />
    </svg>
  ),

  // Letta — brain/memory
  Letta: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 13V8m0 0C8 5 5.5 3 3.5 3S1 5 3.5 5C5 5 8 5 8 8zm0 0c0-3 2.5-5 4.5-5S15 5 12.5 5C11 5 8 5 8 8z" />
    </svg>
  ),

  // Spring AI — leaf
  "Spring AI": (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M13 2C8 2 3 7 3 12c1-1 3-2 5-2 0-3 2-6 5-8z" />
    </svg>
  ),

  // Cline — terminal cursor
  Cline: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 4l4 4-4 4" />
      <path d="M10 12h4" />
    </svg>
  ),

  // aider — terminal prompt
  aider: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 12l4-4-4-4" />
      <path d="M8 12h6" />
    </svg>
  ),

  // Zed — Z letterform
  "Zed AI": (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 3h10v2L5.5 13H13v-2H5l7.5-8z" />
    </svg>
  ),

  // Continue — play/forward
  Continue: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 2l8 6-8 6z" />
      <rect x="12" y="2" width="2" height="12" rx="0.5" />
    </svg>
  ),

  // Amazon Q — stylized Q
  "Amazon Q": (
    <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7.5" cy="7.5" r="5" />
      <path d="M10 10l4 4" strokeLinecap="round" />
    </svg>
  ),

  // n8n — workflow nodes
  n8n: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <circle cx="4" cy="8" r="2" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 7.5l4-3M6 8.5l4 3" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  ),

  // Bolt — lightning
  Bolt: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M9 1L4 9h3.5L6 15l6-8H8.5z" />
    </svg>
  ),

  // v0 — "v0" text
  v0: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 3l3 10h1l3-10H7.5L6 9 4.5 3zM11 3a3 3 0 100 10 3 3 0 000-10zm0 2a1 1 0 110 6 1 1 0 010-6z" />
    </svg>
  ),

  // Devin — robot/agent
  Devin: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="10" height="8" rx="2" />
      <circle cx="6" cy="7" r="1" fill="currentColor" />
      <circle cx="10" cy="7" r="1" fill="currentColor" />
      <path d="M5 13h6" strokeLinecap="round" />
    </svg>
  ),

  // Replit — circle with play
  "Replit Agent": (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 2a2 2 0 012-2h6a2 2 0 012 2v4H3V2zm0 5h10v2H3zm0 3h10v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4z" opacity="0.8" />
    </svg>
  ),

  // Lovable — heart
  Lovable: (
    <svg className={iconClass} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 14s-5.5-3.5-5.5-7A3 3 0 018 4.5 3 3 0 0113.5 7C13.5 10.5 8 14 8 14z" />
    </svg>
  ),

  // SWE-agent — wrench/gear
  "SWE-agent": (
    <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 2v2m0 8v2M2 8h2m8 0h2M3.8 3.8l1.4 1.4m5.6 5.6l1.4 1.4M12.2 3.8l-1.4 1.4M4.2 11.8l1.4-1.4" strokeLinecap="round" />
    </svg>
  ),
};
