"use client";

import { useState } from "react";

interface Agent {
  name: string;
  mono: string;
  color: string;
}

// Top-tier: the biggest names lead
const FEATURED_AGENTS: Agent[] = [
  { name: "Claude Code", mono: "CC", color: "#D97757" },
  { name: "Nous", mono: "N°", color: "#FA5D2B" },
  { name: "Claude", mono: "Cl", color: "#D97757" },
  { name: "OpenAI Codex", mono: "Cx", color: "#10A37F" },
  { name: "Cursor", mono: "Cu", color: "#00A0FF" },
  { name: "GitHub Copilot", mono: "GH", color: "#FFFFFF" },
  { name: "VS Code", mono: "VS", color: "#0078D4" },
  { name: "Gemini CLI", mono: "Gc", color: "#4285F4" },
  { name: "Goose", mono: "Go", color: "#8B5CF6" },
  { name: "OpenHands", mono: "OH", color: "#E44D26" },
  { name: "Roo Code", mono: "Rc", color: "#F97316" },
  { name: "Windsurf", mono: "Ws", color: "#00C4B4" },
  { name: "Databricks", mono: "Db", color: "#FF3621" },
  { name: "Snowflake", mono: "Sf", color: "#29B5E8" },
];

// All other verified supporters from agentskills.io
const EXTENDED_AGENTS: Agent[] = [
  { name: "Junie", mono: "Ju", color: "#FC328E" },
  { name: "Amp", mono: "Am", color: "#7C3AED" },
  { name: "Letta", mono: "Lt", color: "#22C55E" },
  { name: "Factory", mono: "Fa", color: "#FFFFFF" },
  { name: "Qodo", mono: "Qo", color: "#6366F1" },
  { name: "TRAE", mono: "Tr", color: "#00D4AA" },
  { name: "Spring AI", mono: "Sp", color: "#6DB33F" },
  { name: "Firebender", mono: "Fb", color: "#EF4444" },
  { name: "Laravel Boost", mono: "Lv", color: "#FF2D20" },
  { name: "Mistral Vibe", mono: "Mv", color: "#FF7000" },
  { name: "Autohand Code", mono: "Ah", color: "#3B82F6" },
  { name: "OpenCode", mono: "Oc", color: "#14B8A6" },
  { name: "Mux", mono: "Mx", color: "#A855F7" },
  { name: "Command Code", mono: "Cm", color: "#F59E0B" },
  { name: "Piebald", mono: "Pb", color: "#8B5CF6" },
  { name: "Agentman", mono: "Ag", color: "#06B6D4" },
  { name: "Ona", mono: "On", color: "#EC4899" },
  { name: "VT Code", mono: "VT", color: "#10B981" },
  { name: "Emdash", mono: "Em", color: "#6366F1" },
  { name: "pi", mono: "pi", color: "#F97316" },
  // Additional ecosystem agents
  { name: "ChatGPT", mono: "GP", color: "#10A37F" },
  { name: "Cline", mono: "Cn", color: "#5EC4DB" },
  { name: "aider", mono: "ai", color: "#14B8A6" },
  { name: "Zed AI", mono: "Ze", color: "#084CCF" },
  { name: "Continue", mono: "Co", color: "#FF4785" },
  { name: "Tabnine", mono: "Tn", color: "#6B6BF7" },
  { name: "Amazon Q", mono: "AQ", color: "#FF9900" },
  { name: "Sourcegraph Cody", mono: "Sg", color: "#FF5543" },
  { name: "JetBrains AI", mono: "JB", color: "#FC328E" },
  { name: "Plandex", mono: "Px", color: "#22C55E" },
  { name: "Mentat", mono: "Mn", color: "#A855F7" },
  { name: "GPT Engineer", mono: "Gp", color: "#10A37F" },
  { name: "n8n", mono: "n8", color: "#EA4B71" },
  { name: "Sweep", mono: "Sw", color: "#7C3AED" },
  { name: "Codegen", mono: "Cg", color: "#3B82F6" },
  { name: "Devon", mono: "Dv", color: "#06B6D4" },
  { name: "SWE-agent", mono: "SA", color: "#EF4444" },
  { name: "AutoCodeRover", mono: "AC", color: "#F59E0B" },
  { name: "Replit Agent", mono: "Re", color: "#F26207" },
  { name: "Bolt", mono: "Bt", color: "#1389FD" },
  { name: "Lovable", mono: "Lv", color: "#FF6B6B" },
  { name: "v0", mono: "v0", color: "#FFFFFF" },
  { name: "Devin", mono: "Dn", color: "#00D084" },
];

const ALL_AGENTS = [...FEATURED_AGENTS, ...EXTENDED_AGENTS];

function AgentTag({ agent }: { agent: Agent }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-[3px] font-mono text-[11px] t-panel-label">
      <span
        className="flex items-center justify-center w-4 h-4 rounded-[2px] text-[8px] font-semibold leading-none shrink-0"
        style={{
          backgroundColor: `${agent.color}18`,
          color: agent.color,
        }}
      >
        {agent.mono}
      </span>
      {agent.name}
    </span>
  );
}

export function EcosystemGrid() {
  const [expanded, setExpanded] = useState(false);
  const agents = expanded ? ALL_AGENTS : FEATURED_AGENTS;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {agents.map((agent) => (
          <AgentTag key={agent.name} agent={agent} />
        ))}
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-[3px] font-mono text-[11px] text-accent hover:bg-accent/20 transition-colors cursor-pointer"
        >
          {expanded
            ? "− show less"
            : `+ ${EXTENDED_AGENTS.length} more`}
        </button>
      </div>
    </div>
  );
}
