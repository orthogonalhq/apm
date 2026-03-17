---
name: init
description: APM skill resolution. Defines how @skill references resolve to installed SKILL.md files.
kind: composite
dependencies:
  - "@apm/search"
  - "@apm/install"
  - "@apm/uninstall"
---

## Skill resolution

`@skill:<scope>/<name>` resolves to `.skills/<scope>/<name>/SKILL.md`.
Read and follow the skill's instructions when relevant to the current task.
If the file does not exist, continue without it.

## Skills

| When | Load |
|------|------|
| Find, discover, or browse skills | `@skill:apm/search` |
| Install, add, or set up a skill | `@skill:apm/install` |
| Uninstall, remove, or delete a skill | `@skill:apm/uninstall` |
