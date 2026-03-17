# APM Validate GitHub Action

A GitHub Action that validates `SKILL.md` files against the APM specification using the APM CLI.

## Inputs

| Input     | Description                                       | Required | Default    |
|-----------|---------------------------------------------------|----------|------------|
| `path`    | Path to a SKILL.md file or directory to scan      | No       | `.`        |
| `version` | APM CLI version to use (e.g. `0.1.0`)             | No       | `latest`   |

## Usage

### Basic — validate a single SKILL.md

```yaml
name: Validate SKILL.md
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: orthogonalhq/apm-validate@v1
        with:
          path: SKILL.md
```

### Validate all SKILL.md files in a directory

```yaml
name: Validate All Skills
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: orthogonalhq/apm-validate@v1
        with:
          path: skills/
```

### Pin to a specific CLI version

```yaml
name: Validate SKILL.md (pinned)
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: orthogonalhq/apm-validate@v1
        with:
          path: .
          version: "0.1.0"
```

### Full workflow example

```yaml
name: APM Validation
on:
  push:
    branches: [main]
    paths:
      - "**/SKILL.md"
  pull_request:
    paths:
      - "**/SKILL.md"

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate SKILL.md files
        uses: orthogonalhq/apm-validate@v1
        with:
          path: .
```

## How it works

1. Detects the runner OS (Linux or macOS) and architecture (x64 or ARM64).
2. Resolves the requested APM CLI version (or fetches the latest release tag).
3. Downloads the matching binary from the `orthogonalhq/apm` GitHub releases.
4. If `path` points to a file, validates that file directly.
5. If `path` points to a directory, recursively finds all `SKILL.md` files and validates each one.
6. Exits with a non-zero code if any file fails validation.

## Supported platforms

| OS    | Architecture |
|-------|-------------|
| Linux | x64         |
| Linux | ARM64       |
| macOS | x64         |
| macOS | ARM64       |
