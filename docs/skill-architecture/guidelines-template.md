---
name: guidelines-template
description: >
  Template for guidelines and constraints asset files. Use when cross-cutting
  rules apply across multiple skills in a router's tree.
type: guidelines
---

# Guidelines Template

Use this template when you have constraints, conventions, or rules that apply across multiple skills managed by a single router. Instead of duplicating them in each leaf skill, consolidate them in one asset file.

> **Produces type:** `guidelines` — Asset files created from this template must have `type: guidelines` in their frontmatter. This type signals that the file contains cross-cutting constraints read by `type: router` or `type: domain` SKILL.md files.

> **Where this file lives:** `<skill>/assets/guidelines.md`
> **Referenced from:** The router's SKILL.md via a markdown link

---

## Template

Copy and adapt the sections below.

### Guidelines File

```
---
name: guidelines
description: >
  Constraints and conventions for all skills under <router-name>.
type: guidelines
---

# <Router Name> — Guidelines

Cross-cutting rules that apply to all skills in this tree.

---

## Constraints

Hard rules that must never be violated.

> **<constraint-id>:** <What is forbidden and why. Be specific.>

> **<constraint-id>:** <Another constraint.>

> **<constraint-id>:** <Another constraint.>

---

## Conventions

Soft rules — preferred patterns that should be followed unless there's a documented reason not to.

| Convention | Rule | Applies To |
|-----------|------|-----------|
| <convention-name> | <What to do> | <Which skills this applies to> |
| <convention-name> | <What to do> | All skills |

---

## File Locations

Canonical paths for assets managed by skills in this tree.

| Asset | Path | Managed By |
|-------|------|-----------|
| <asset-type> | `<canonical/path/pattern>` | `<skill-id>` |
| <asset-type> | `<canonical/path/pattern>` | `<skill-id>` |

---

## Error Handling

How skills should handle common error conditions.

| Condition | Action |
|-----------|--------|
| <error condition> | <what to do — halt, prompt user, retry, skip> |
| <error condition> | <what to do> |
```

---

## When to Use This Template

| Scenario | Use This? |
|----------|-----------|
| A single skill with its own rules | No — keep rules in the skill's SKILL.md |
| 2–3 skills share a constraint | Maybe — consider a brief note in the parent router |
| 5+ skills share constraints, file conventions, or error handling | **Yes** |
| Rules are getting duplicated across multiple SKILL.md files | **Yes** |
| You need a single source of truth for file paths and conventions | **Yes** |