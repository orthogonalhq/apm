# APM — Agent Package Manager

The package manager and public registry for [agent skills](https://agentskills.io/specification), from Orthogonal.

Think "npm for AI agent skills." APM lets you discover, install, and share SKILL.md packages across 30+ agent products (Claude Code, Cursor, Gemini CLI, VS Code Copilot, and more).

## Quick Start

```bash
# Install the CLI
cargo install apm

# Search for skills
apm search code-review

# Install a skill
apm install code-review

# Validate a local SKILL.md
apm validate ./my-skill/
```

## Architecture

```
apm/
├── app/          # Next.js 15 — registry API + website
├── cli/          # Rust CLI
└── packages/
    └── apm-types/  # Shared TypeScript types
```

## Development

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Rust (stable)

### Setup

```bash
# Install dependencies
pnpm install

# Start the dev server
pnpm dev

# Build everything
pnpm build

# Build the CLI
cd cli && cargo build
```

### Environment Variables

Copy `app/.env.example` to `app/.env.local` and fill in the values:

- `POSTGRES_URL` — Vercel Postgres / Neon connection string
- `GITHUB_TOKEN` — GitHub PAT for code search API
- `CRON_SECRET` — Secret for authenticating cron triggers

## License

MIT
