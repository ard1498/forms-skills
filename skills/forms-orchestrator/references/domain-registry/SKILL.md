---
name: domain-registry
description: >
  Use when routing a user intent to the correct AEM Forms domain and skill,
  or when listing available skills and capabilities.
  Triggers: which domain, which skill, what can you do, list skills,
  capabilities.
type: router
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# Domain Registry

Domains are skill containers. Each domain has a router SKILL.md that handles skill-level routing internally. This registry catalogs all domains and their skills, and provides intent-based routing.

> The orchestrator routes here in two scenarios:
> 1. **Plan step execution** — a plan step declares `domain: analysis, skill: analyze-requirements` → this registry resolves the path
> 2. **Direct domain routing** — user intent maps to a single domain → this registry routes to it

---

## Registry

| Domain | Router | Description |
|--------|--------|-------------|
| `analysis` | `skills/forms-analysis/SKILL.md` | Analysis & documentation — requirements, screen docs, migration, review |
| `content-author` | `skills/forms-content-author/SKILL.md` | Form structure & components — scaffold, create/modify JSON, custom components |
| `rule-creator` | `skills/forms-rule-creator/SKILL.md` | Business rules & custom functions — rules, JS functions, optimization |
| `integration` | `skills/forms-integration/SKILL.md` | API & data integration — FDM sync, OpenAPI, JS API clients |
| `context-management` | `skills/forms-context-management/SKILL.md` | Agent memory & continuity — handover, history, session logs |

---

## Skill Resolution

When a plan step declares a skill, resolve it using the Registry table above:
1. Find which domain owns the skill
2. Read the domain's router SKILL.md at `skills/forms-<domain>/SKILL.md`
3. The domain router handles invocation

**Hard stops:** If the declared skill's domain is not in the Registry, or the domain router does not recognize the skill — halt and report the error. Do not guess or substitute.

---

## Domain Template

All domain router SKILL.md files must follow the standard domain template: **[`assets/TEMPLATE.md`](assets/TEMPLATE.md)**

---

## Quick Reference

| What | Where |
|------|-------|
| Domain template | `assets/TEMPLATE.md` |
| Domain routers | `skills/forms-<domain>/SKILL.md` |