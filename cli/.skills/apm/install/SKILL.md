---
name: install
description: Install an APM skill by scoped name. Use when asked to install, add, or set up a specific skill.
kind: skill
---

## Install a skill

```bash
apm install @<scope>/<name>
```

This downloads the skill to `.skills/<scope>/<name>/SKILL.md` and updates `apm-lock.json`.
