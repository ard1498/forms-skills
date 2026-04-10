---
name: forms-orchestrator
description: >
  Skill Gateway for AEM Forms. Pure router with two registries — Planner
  (references/planner/SKILL.md) and Domain Registry (references/domain-registry/SKILL.md).
  Routes user intents to plans (sequences of skill invocations), resolves each
  plan step to a domain/skill, and executes accordingly. When no plans exist,
  generates them from user requirements. Routing algorithm and constraints are
  in assets/. Triggers: plan, workflow, how to build, end to end, orchestrate,
  what skill, which skill, next step, getting started, build a form, route.
type: router
license: Apache-2.0
metadata:
  author: Adobe
  version: "1.0"
---

# Forms Orchestrator — Skill Gateway

Pure router. Two registries. No implementation logic.

```
User Intent
     │
     ▼
┌────────────────────────────────────────┐
│  Plans                                 │
│  plans/<journey>/NN-<title>.md         │──→ ordered steps, each declaring skill(s)
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│  Domain Registry                       │
│  references/domain-registry/SKILL.md   │──→ resolves domain/skill to implementation
└──────────────────┬─────────────────────┘
                   │
                   ▼
              Skill executes
```

> This gateway **selects** and **routes**. It does not implement.
> Plans define the step sequence. Domains own the skills. The orchestrator connects them.

---

## Routing

When a user prompt arrives, follow the routing algorithm in [`assets/routing-table.md`](assets/routing-table.md):

1. **Workspace gate** — no workspace? → `infra` › `setup-workspace` (hard block)
2. **Active plan** — 🔵 Active plan in `.agent/handover.md`? → resume it
3. **Plans exist** — plans in `plans/<journey>/`? → pick next pending → execute
4. **Generate plans** — user has requirements but no plans? → Planner generates them → execute
5. **Domain fallback** — intent is a single task? → route to domain directly
6. **No match** — ask user to clarify

Full step-by-step logic, decision tables, and precedence rules: **[`assets/routing-table.md`](assets/routing-table.md)**

---

## Registries

| Registry | File | What It Does |
|----------|------|-------------|
| **Planner** | [`references/planner/SKILL.md`](references/planner/SKILL.md) | Generates plans from user requirements (journey docs, screenshots, Screen.md, etc.) using a default or custom strategy |
| **Domain Registry** | [`references/domain-registry/SKILL.md`](references/domain-registry/SKILL.md) | Catalogs domains and skills, matches intents to domains, resolves plan step targets to executable skills |

Plan files live in `plans/<journey>/`. Domain skill trees live in `references/domain-registry/references/`.

---

## Guidelines & Constraints

All orchestrator constraints, conventions, file locations, workspace resolution, plan conventions, and general routing rules: **[`assets/guidelines.md`](assets/guidelines.md)**

---

## Quick Reference

| What | Where |
|------|-------|
| Routing algorithm | `assets/routing-table.md` |
| Constraints & conventions | `assets/guidelines.md` |
| Plan template | `references/planner/assets/plan-template.md` |
| Planner | `references/planner/SKILL.md` |
| Plan files | `plans/<journey>/NN-<title>.md` |
| Domain registry | `references/domain-registry/SKILL.md` |
| Domain routers | `references/domain-registry/references/<domain>/SKILL.md` |
| Domain template | `references/domain-registry/assets/templates/domain-template.md` |
| Skills catalog & intent routing | `references/domain-registry/assets/skills-catalog.md` |
| Domain contribution guide | `references/domain-registry/assets/contribution-guide.md` |
