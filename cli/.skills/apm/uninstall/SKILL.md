---
name: uninstall
description: Remove an installed APM skill. Use when asked to uninstall, remove, or delete a skill.
kind: skill
---

## Uninstall a skill

```bash
apm uninstall @<scope>/<name>
```

This removes `.skills/<scope>/<name>/` and the entry from `apm-lock.json`.
