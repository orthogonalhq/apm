"use client";

import { useState } from "react";
import { agentIcons } from "./agent-icons";

interface Agent {
  name: string;
  mono: string;
  color: string;
  url: string;
}

// Top-tier: the biggest names lead
const FEATURED_AGENTS: Agent[] = [
  { name: "Claude Code", mono: "CC", color: "#D97757", url: "https://claude.ai/code" },
  { name: "Nous", mono: "N°", color: "#FA5D2B", url: "https://orthg.nl" },
  { name: "Claude", mono: "Cl", color: "#D97757", url: "https://claude.ai" },
  { name: "OpenAI Codex", mono: "Cx", color: "#10A37F", url: "https://developers.openai.com/codex" },
  { name: "Cursor", mono: "Cu", color: "#00A0FF", url: "https://cursor.com" },
  { name: "GitHub Copilot", mono: "GH", color: "#FFFFFF", url: "https://github.com/features/copilot" },
  { name: "VS Code", mono: "VS", color: "#0078D4", url: "https://code.visualstudio.com" },
  { name: "Gemini CLI", mono: "Gc", color: "#4285F4", url: "https://geminicli.com" },
  { name: "Goose", mono: "Go", color: "#8B5CF6", url: "https://block.github.io/goose" },
  { name: "OpenHands", mono: "OH", color: "#E44D26", url: "https://www.all-hands.dev" },
  { name: "Roo Code", mono: "Rc", color: "#F97316", url: "https://roocode.com" },
  { name: "Windsurf", mono: "Ws", color: "#00C4B4", url: "https://windsurf.com" },
  { name: "Databricks", mono: "Db", color: "#FF3621", url: "https://databricks.com" },
  { name: "Snowflake", mono: "Sf", color: "#29B5E8", url: "https://www.snowflake.com" },
];

// All other verified supporters from agentskills.io + broader ecosystem
const EXTENDED_AGENTS: Agent[] = [
  { name: "Junie", mono: "Ju", color: "#FC328E", url: "https://junie.jetbrains.com" },
  { name: "Amp", mono: "Am", color: "#7C3AED", url: "https://ampcode.com" },
  { name: "Letta", mono: "Lt", color: "#22C55E", url: "https://www.letta.com" },
  { name: "Factory", mono: "Fa", color: "#FFFFFF", url: "https://factory.ai" },
  { name: "Qodo", mono: "Qo", color: "#6366F1", url: "https://www.qodo.ai" },
  { name: "TRAE", mono: "Tr", color: "#00D4AA", url: "https://trae.ai" },
  { name: "Spring AI", mono: "Sp", color: "#6DB33F", url: "https://docs.spring.io/spring-ai/reference" },
  { name: "Firebender", mono: "Fb", color: "#EF4444", url: "https://firebender.com" },
  { name: "Laravel Boost", mono: "Lv", color: "#FF2D20", url: "https://github.com/laravel/boost" },
  { name: "Mistral Vibe", mono: "Mv", color: "#FF7000", url: "https://github.com/mistralai/mistral-vibe" },
  { name: "Autohand Code", mono: "Ah", color: "#3B82F6", url: "https://autohand.ai" },
  { name: "OpenCode", mono: "Oc", color: "#14B8A6", url: "https://opencode.ai" },
  { name: "Mux", mono: "Mx", color: "#A855F7", url: "https://mux.coder.com" },
  { name: "Command Code", mono: "Cm", color: "#F59E0B", url: "https://commandcode.ai" },
  { name: "Piebald", mono: "Pb", color: "#8B5CF6", url: "https://piebald.ai" },
  { name: "Agentman", mono: "Ag", color: "#06B6D4", url: "https://agentman.ai" },
  { name: "Ona", mono: "On", color: "#EC4899", url: "https://ona.com" },
  { name: "VT Code", mono: "VT", color: "#10B981", url: "https://github.com/vinhnx/vtcode" },
  { name: "Emdash", mono: "Em", color: "#6366F1", url: "https://emdash.sh" },
  { name: "pi", mono: "pi", color: "#F97316", url: "https://shittycodingagent.ai" },
  // Additional ecosystem agents
  { name: "ChatGPT", mono: "GP", color: "#10A37F", url: "https://chatgpt.com" },
  { name: "Cline", mono: "Cn", color: "#5EC4DB", url: "https://cline.bot" },
  { name: "aider", mono: "ai", color: "#14B8A6", url: "https://aider.chat" },
  { name: "Zed AI", mono: "Ze", color: "#084CCF", url: "https://zed.dev" },
  { name: "Continue", mono: "Co", color: "#FF4785", url: "https://continue.dev" },
  { name: "Tabnine", mono: "Tn", color: "#6B6BF7", url: "https://www.tabnine.com" },
  { name: "Amazon Q", mono: "AQ", color: "#FF9900", url: "https://aws.amazon.com/q/developer" },
  { name: "Sourcegraph Cody", mono: "Sg", color: "#FF5543", url: "https://sourcegraph.com/cody" },
  { name: "JetBrains AI", mono: "JB", color: "#FC328E", url: "https://www.jetbrains.com/ai" },
  { name: "Plandex", mono: "Px", color: "#22C55E", url: "https://plandex.ai" },
  { name: "Mentat", mono: "Mn", color: "#A855F7", url: "https://www.mentat.ai" },
  { name: "GPT Engineer", mono: "Gp", color: "#10A37F", url: "https://gptengineer.app" },
  { name: "n8n", mono: "n8", color: "#EA4B71", url: "https://n8n.io" },
  { name: "Sweep", mono: "Sw", color: "#7C3AED", url: "https://sweep.dev" },
  { name: "Codegen", mono: "Cg", color: "#3B82F6", url: "https://codegen.com" },
  { name: "Devon", mono: "Dv", color: "#06B6D4", url: "https://devon.ai" },
  { name: "SWE-agent", mono: "SA", color: "#EF4444", url: "https://swe-agent.com" },
  { name: "AutoCodeRover", mono: "AC", color: "#F59E0B", url: "https://github.com/nus-apr/auto-code-rover" },
  { name: "Replit Agent", mono: "Re", color: "#F26207", url: "https://replit.com" },
  { name: "Bolt", mono: "Bt", color: "#1389FD", url: "https://bolt.new" },
  { name: "Lovable", mono: "Lv", color: "#FF6B6B", url: "https://lovable.dev" },
  { name: "v0", mono: "v0", color: "#FFFFFF", url: "https://v0.dev" },
  { name: "Devin", mono: "Dn", color: "#00D084", url: "https://devin.ai" },
];

const ALL_AGENTS = [...FEATURED_AGENTS, ...EXTENDED_AGENTS];

function AgentTag({ agent }: { agent: Agent }) {
  const icon = agentIcons[agent.name];
  return (
    <a
      href={agent.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-[3px] font-mono text-[11px] t-panel-label hover:bg-white/[0.08] hover:border-white/[0.10] transition-colors text-white/70"
    >
      {icon ?? (
        <span className="flex items-center justify-center w-4 h-4 rounded-[2px] text-[8px] font-semibold leading-none shrink-0 bg-white/[0.08]">
          {agent.mono}
        </span>
      )}
      {agent.name}
    </a>
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
