---
name: planner
description: >
  Use when user has requirements but no plans yet, or wants to generate a
  new plan for a journey.
  Triggers: plan, plans, journey, build, start, generate plans, create plans,
  decompose, what plans, next plan.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# Planner

Generates ordered, executable plans from user requirements. The orchestrator routes here when a journey has requirements but no plans yet.

---

## What the Planner Does

```
Requirements (journey docs, Screen.md, screenshots, v1 JSON)
     │
     ▼
┌────────────────────────────────┐
│  Resolve strategy              │
│  (custom or default)           │
└─────────────┬──────────────────┘
              │
              ▼
┌────────────────────────────────┐
│  Analyze requirements          │
│  using analysis domain skills  │
└─────────────┬──────────────────┘
              │
              ▼
┌────────────────────────────────┐
│  Decompose into ordered plans  │
│  Write to plans/<journey>/     │
└────────────────────────────────┘
```

The planner takes requirements as input and produces a set of plan files ready for sequential execution by the orchestrator.

---

## Guardrails

Decomposition rules and process: **[`assets/GUARDRAILS.md`](assets/GUARDRAILS.md)**

**Resolution rule:** If `plans/custom-strategy.md` exists in the workspace, use it instead of `GUARDRAILS.md`. A custom strategy can define any decomposition approach — by screen, by feature, by priority, or any other scheme.

---

## Output

The planner produces plan files at `plans/<journey>/NN-<title>.md`, numbered sequentially, ready for execution by the orchestrator.

---

## Plan Types

A plan's type is not declared explicitly — it emerges from which specification sections and skills the plan uses. Consult the plan type samples in **[`assets/TEMPLATE.md`](assets/TEMPLATE.md)** when generating each plan.

| Type | Primary Skills | When to Use |
|------|---------------|-------------|
| **Structure** | `forms-content-author` | Form skeleton — panels, fields, basic validations |
| **Workflow** | `forms-content-author`, `forms-rule-creator` | Specific user flow or conditional branch |
| **Logic** | `forms-rule-creator` | Cross-cutting validations and business rules |
| **Integration** | `manage-apis`, `forms-rule-creator` | API wiring — data loading, save/submit, external services |
| **Infrastructure** | `forms-rule-creator` | Cross-cutting concerns — error handling, session management, toasts |

---

## Plan Conventions

Generated plans follow a standard structure. Full template and field definitions: **[`assets/TEMPLATE.md`](assets/TEMPLATE.md)**

| Property | Convention |
|----------|-----------|
| **Path** | `plans/<journey>/NN-<short-title>.md` |
| **Numbering** | Zero-padded two digits: `01`, `02`, ..., `10`, `11` |
| **Max per journey** | 15 plans — if more are needed, the journey is too complex; split it |
| **Template** | `assets/TEMPLATE.md` |

---

## Quick Reference

| What | Where |
|------|-------|
| Decomposition guardrails | `assets/GUARDRAILS.md` |
| User strategy override | `plans/custom-strategy.md` (in workspace) |
| Plan template + type samples | `assets/TEMPLATE.md` |
| Domain registry (skill resolution) | `../domain-registry/SKILL.md` |