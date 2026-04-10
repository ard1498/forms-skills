---
name: forms-orchestrator
description: >
  Skill Gateway for AEM Forms. Pure router with two sub-skills — Pipeline Registry
  (references/pipelines/SKILL.md) and Domain Registry (references/domains/SKILL.md).
  Routes user intents to pipelines, resolves each pipeline phase to a domain/skill,
  and executes accordingly. Routing algorithm and constraints are in assets/.
  Triggers: plan, workflow, how to build, end to end, phases, orchestrate,
  what skill, which skill, next step, getting started, build a form, route.
type: router
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.9"
---

# Forms Orchestrator — Skill Gateway

Pure router. Two registries. No implementation logic.

```
User Intent
     │
     ▼
┌────────────────────────────────────────┐
│  Pipeline Registry                      │
│  references/pipelines/SKILL.md          │──→ selects a pipeline based on intent
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│  Pipeline (phases)                      │
│  references/pipelines/references/*.md   │──→ each phase declares a domain + skill
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│  Domain Registry                        │
│  references/domains/SKILL.md            │──→ resolves domain/skill to implementation
└──────────────────┬─────────────────────┘
                   │
                   ▼
              Skill executes
```

> This gateway **selects** and **routes**. It does not implement.
> Pipelines define the phase graph. Domains own the skills. The orchestrator connects them.

---

## Routing

When a user prompt arrives, follow the routing algorithm in [`assets/routing-table.md`](assets/routing-table.md):

1. **Workspace gate** — no workspace? → `infra` › `setup-workspace` (hard block)
2. **Active plan** — 🔵 Active plan in `.agent/handover.md`? → resume it
3. **Pipeline match** — intent matches a pipeline? → select and execute
4. **Domain fallback** — intent matches a domain? → route directly
5. **No match** — ask user to clarify

Full step-by-step logic, decision tables, phase resolution, and precedence rules: **[`assets/routing-table.md`](assets/routing-table.md)**

---

## Registries

| Registry | File | What It Does |
|----------|------|-------------|
| **Pipeline Registry** | [`references/pipelines/SKILL.md`](references/pipelines/SKILL.md) | Catalogs pipelines, matches intents to pipelines, owns selection rules |
| **Domain Registry** | [`references/domains/SKILL.md`](references/domains/SKILL.md) | Catalogs domains and skills, matches intents to domains, resolves pipeline phase targets |

Pipeline definitions live in `references/pipelines/references/`. Domain skill trees live in `references/domains/references/`.

---

## Guidelines & Constraints

All orchestrator constraints, conventions, file locations, workspace resolution, plan conventions, and general routing rules: **[`assets/guidelines.md`](assets/guidelines.md)**

---

## Quick Reference

| What | Where |
|------|-------|
| Routing algorithm | `assets/routing-table.md` |
| Constraints & conventions | `assets/guidelines.md` |
| Pipeline registry | `references/pipelines/SKILL.md` |
| Pipeline definitions | `references/pipelines/references/*.md` |
| Pipeline template | `references/pipelines/assets/templates/pipeline-template.md` |
| Pipeline selection & execution | `references/pipelines/assets/selection-rules.md` |
| Pipeline ↔ plan integration | `references/pipelines/assets/plan-integration.md` |
| Pipeline contribution guide | `references/pipelines/assets/contribution-guide.md` |
| Domain registry | `references/domains/SKILL.md` |
| Domain routers | `references/domains/references/<domain>/SKILL.md` |
| Domain template | `references/domains/assets/templates/domain-template.md` |
| Skills catalog & intent routing | `references/domains/assets/skills-catalog.md` |
| Phase resolution algorithm | `references/domains/assets/phase-resolution.md` |
| Domain contribution guide | `references/domains/assets/contribution-guide.md` |