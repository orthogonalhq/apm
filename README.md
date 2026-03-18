# APM — Agent Package Manager

[![CI](https://img.shields.io/github/actions/workflow/status/orthogonalhq/apm/ci.yml?style=for-the-badge&labelColor=1a1a1a)](https://github.com/orthogonalhq/apm/actions)
[![License](https://img.shields.io/github/license/orthogonalhq/apm?style=for-the-badge&labelColor=1a1a1a)](LICENSE)
[![Release](https://img.shields.io/github/v/release/orthogonalhq/apm?style=for-the-badge&labelColor=1a1a1a)](https://github.com/orthogonalhq/apm/releases)
[![npm downloads](https://img.shields.io/npm/dt/@apm-cli/apm?style=for-the-badge&labelColor=1a1a1a)](https://www.npmjs.com/package/@apm-cli/apm)
[![Skills Indexed](https://img.shields.io/endpoint?url=https://apm.orthg.nl/api/badge/registry&style=for-the-badge&labelColor=1a1a1a)](https://apm.orthg.nl/packages)
[![TypeScript](https://img.shields.io/badge/TypeScript-Next.js_15-3178c6?style=for-the-badge&labelColor=1a1a1a&logo=typescript&logoColor=white)](app/)
[![Rust](https://img.shields.io/badge/Rust-CLI-dea584?style=for-the-badge&labelColor=1a1a1a&logo=rust&logoColor=white)](cli/)
[![Docs](https://img.shields.io/badge/docs-apm.orthg.nl-blue?style=for-the-badge&labelColor=1a1a1a)](https://docs.apm.orthg.nl)

The package manager and public registry for [agent skills](https://agentskills.io/specification), from [Orthogonal](https://orthogonal.dev).

Think "npm for AI agent skills." APM lets you discover, install, and share SKILL.md packages across 34+ agent products — Claude Code, Cursor, Gemini CLI, VS Code Copilot, and more.

**Registry:** [apm.orthg.nl](https://apm.orthg.nl)

## Install

### macOS / Linux

```bash
curl -fsSL https://apm.orthg.nl/install.sh | sh
```

### Winget (Windows)

```powershell
winget install Orthogonal.APM
```

### Homebrew (macOS)

```bash
brew install orthogonalhq/apm/apm
```

### npm (all platforms)

```bash
npm install -g @apm-cli/apm
```

### Manual download

Pre-built binaries for every platform are available on the [GitHub Releases](https://github.com/orthogonalhq/apm/releases) page.

## Quick start

```bash
# Search for skills
apm search code-review

# Install a skill
apm install @anthropic/code-review

# View skill details
apm info @anthropic/code-review

# Validate a local SKILL.md
apm validate ./my-skill/
```

Skills are installed to `.skills/@scope/name/SKILL.md` in your project directory, with dependencies tracked in `apm-lock.json`.

## Platform support

| Platform | Architecture | Install methods |
|----------|-------------|-----------------|
| macOS | Apple Silicon (ARM64) | shell, npm, brew, cargo |
| macOS | Intel (x64) | shell, npm, brew, cargo |
| Linux | x64 (glibc) | shell, npm, brew, cargo |
| Linux | x64 (musl/Alpine) | shell, npm, cargo |
| Linux | ARM64 (glibc) | shell, npm, cargo |
| Windows | x64 | npm, cargo |

## CI / CD

APM works in all major CI environments out of the box.

### GitHub Actions

```yaml
- name: Install APM
  run: curl -fsSL https://apm.orthg.nl/install.sh | sh

- name: Install skills
  run: apm install @scope/skill-name
```

### npm-based pipelines

```yaml
- run: npx @apm-cli/apm install @scope/skill-name
```

### Pin a specific version

```bash
APM_VERSION=v0.1.0 curl -fsSL https://apm.orthg.nl/install.sh | sh
```

## Configuration

| Environment variable | Description | Default |
|---------------------|-------------|---------|
| `APM_REGISTRY` | Registry URL | `https://apm.orthg.nl` |
| `APM_INSTALL_DIR` | Binary install directory (shell installer) | `~/.apm/bin` |
| `APM_VERSION` | Pin installer to a specific version | latest |

## Architecture

```
apm/
├── app/               # Next.js 15 — registry API + website
├── cli/               # Rust CLI (Clap 4 + Tokio)
├── npm/               # npm distribution packages
│   ├── apm-cli/       # Main wrapper (@apm-cli/apm)
│   ├── linux-x64/     # Platform-specific binaries
│   ├── linux-arm64/
│   ├── linux-x64-musl/
│   ├── darwin-x64/
│   ├── darwin-arm64/
│   └── win32-x64-msvc/
└── packages/
    └── apm-types/     # Shared TypeScript types
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

### Environment variables

Copy `app/.env.example` to `app/.env.local` and fill in the values:

- `REGISTRY_POSTGRES_URL` — Neon / Vercel Postgres connection string
- `GITHUB_TOKEN` — GitHub PAT for code search API
- `CRON_SECRET` — Secret for authenticating cron triggers

### Releasing

Releases happen automatically when CLI changes merge to `main`. The workflow:

1. Reads the version from `cli/Cargo.toml`
2. Checks if a `v{version}` tag already exists — if so, skips
3. Builds binaries for all 6 platform targets
4. Creates the git tag and GitHub Release with archives + checksums
5. Publishes all npm packages with provenance
6. Updates the Homebrew formula

**To release a new version:** bump the `version` in `cli/Cargo.toml`, merge to main, and the pipeline handles the rest.

## License

MIT
