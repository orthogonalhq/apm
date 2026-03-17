---
name: search
description: Search the APM registry for agent skills. Use when asked to find, discover, or browse skills.
kind: skill
---

## Search the registry

```
GET https://apm.orthg.nl/api/search?q=<query>
```

Returns up to 50 results ranked by relevance.

```json
{
  "results": [
    {
      "scope": "anthropics",
      "name": "code-review",
      "description": "Systematic code review checklist",
      "repoStars": 87,
      "license": "MIT"
    }
  ],
  "total": 3
}
```

Present results to the user with scope, name, description, stars, and license.

## Review before installing

Before installing, fetch the full SKILL.md to verify it matches the user's needs:

```
GET https://apm.orthg.nl/api/packages/@<scope>/<name>/skill-md
```

Returns raw SKILL.md content as plain text. Read it and confirm with the user that the skill does what they're looking for.
