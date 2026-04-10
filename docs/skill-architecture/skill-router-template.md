---
name: skill-router-template
description: >
  Generalized template for SKILL.md files that route user intents
  to sub-skills. Routers dispatch — they do not implement.
type: router
---

# Skill Router Template

Use this template for any SKILL.md that dispatches to sub-skills rather than implementing logic itself. This covers orchestrators, domain routers, pipeline registries, and any other routing layer.

> **Core rule:** A router SKILL.md should be **under 100 lines**. If it's growing beyond that, offload content to `assets/` (see [Routing Table Template](routing-table-template.md) and [Guidelines Template](guidelines-template.md)).

---

## Template

Copy and fill in the sections below.

### Frontmatter

The `type` field in frontmatter declares the skill's architectural role. Always include it.

| `type` | Use When |
|--------|----------|
| `router` | Any SKILL.md that dispatches to sub-skills (orchestrators, registries, generic routers) |
| `domain` | Domain router — groups related skills under a domain (use domain-template.md instead) |
| `pipeline` | Pipeline definition — multi-phase workflow DAG (use pipeline-template.md instead) |
| `skill` | Leaf skill that does actual work (not a router — don't use this template) |

```
---
name: <router-id>
description: >
  <One-line purpose. What does this router dispatch? What triggers it?>
type: router
license: Apache-2.0
metadata:
  author: <Author or Organization>
  version: "<semver>"
---
```

> **Note:** Generic routers use `type: router`. For domain-specific routers, use the domain template (`type: domain`). For pipeline definitions, use the pipeline template (`type: pipeline`). Leaf skills use `type: skill`.

### Body

```
# <Router Name>

<1–2 sentence description. What this router does and what it does NOT do.>

> This router **selects** and **routes**. It does not implement.

---

## Routing Table

First match wins.

| Intent | Skill | Description |
|--------|-------|-------------|
| <Intent pattern 1> | `<skill-id-1>` | <What this skill does> |
| <Intent pattern 2> | `<skill-id-2>` | <What this skill does> |
| <Intent pattern 3> | `<skill-id-3>` | <What this skill does> |

> If the intent is ambiguous, present the top matches to the user and let them choose.

---

## Sub-Skills

| Skill | Path | Purpose |
|-------|------|---------|
| `<skill-id-1>` | [`references/<skill-id-1>/SKILL.md`](references/<skill-id-1>/SKILL.md) | <One-line purpose> |
| `<skill-id-2>` | [`references/<skill-id-2>/SKILL.md`](references/<skill-id-2>/SKILL.md) | <One-line purpose> |

---

## Assets

Link to offloaded content. Remove rows that don't apply.

| What | Where |
|------|-------|
| Routing algorithm (detailed) | [`assets/routing-table.md`](assets/routing-table.md) |
| Constraints & conventions | [`assets/guidelines.md`](assets/guidelines.md) |
| Contribution guide | [`assets/contribution-guide.md`](assets/contribution-guide.md) |
| Templates | `assets/templates/` |
```

---

## Section Reference

| Section | Required | Purpose |
|---------|----------|---------|
| **Frontmatter** | Yes | Identity, triggers, metadata |
| **Title + Description** | Yes | What this router does (1–2 sentences) |
| **Routing Table** | Yes | The core dispatch logic — intent → skill |
| **Sub-Skills** | Yes | Registry of all sub-skills with paths |
| **Assets** | If offloading | Links to offloaded routing logic, guidelines, templates |

---

## When to Offload to Assets

| Symptom | Action |
|---------|--------|
| SKILL.md exceeds ~100 lines | Offload the largest section to `assets/` |
| Routing algorithm has multi-step logic, decision trees, or precedence rules | Move to `assets/routing-table.md` |
| Constraints apply across multiple sub-skills | Move to `assets/guidelines.md` |
| Contribution instructions (how to add skills, extend the router) | Move to `assets/contribution-guide.md` |
| Templates for creating new sub-skills | Move to `assets/templates/` |

---

## Examples in This Repo

| Router | Type | Pattern | Location |
|--------|------|---------|----------|
| Forms Orchestrator | `router` | Top-level gateway → pipelines + domains | `skills/aem/forms/skills/SKILL.md` |
| Domain Registry | `router` | Catalogs domains, resolves pipeline phases | `skills/aem/forms/skills/references/domains/SKILL.md` |
| Pipeline Registry | `router` | Catalogs pipelines, matches intents | `skills/aem/forms/skills/references/pipelines/SKILL.md` |
| Analysis Domain | `domain` | Routes analysis intents to analysis skills | `skills/aem/forms/skills/references/domains/references/analysis/SKILL.md` |