---
name: planner-guardrails
description: >
  Use when generating plans from requirements for a journey. Covers
  what inputs to accept, how to decompose requirements into ordered
  plans, and the principles governing plan order and scope.
---

# Planner Guardrails

How to decompose requirements into ordered plans. Use this when generating plans for a journey.

---

## Inputs

Accept any combination of:

| Input | Description |
|-------|-------------|
| Requirements docs | Free-form requirements, user stories, acceptance criteria |
| Journey specs | `journeys/<journey>/journey.md` — structured journey specification |
| Screen.md | `journeys/<journey>/screens/<screen>/Screen.md` — detailed screen documentation |
| Screenshots | UI mockups or screenshots of existing forms |
| v1 form JSON | Existing `form.json` from a v1 form being migrated or extended |

At minimum one input source must be available. Richer inputs produce better decomposition.

---

## Process

### Step 1 — Analyze Requirements

Use `analysis` domain skills to understand the form:

- **`analyze-requirements`** — parse requirements docs, extract form specification, identify complexity
- **`create-screen-doc`** — generate Screen.md from screenshots or requirements (if not already available)
- **`analyze-v1-form`** — extract structure and logic from existing v1 form JSON (migration scenarios)

Goal: clear picture of panels, fields, validation rules, conditional logic, API integrations, and workflows.

### Step 2 — Identify Structure

From the analysis output, identify:

- **Panels and sections** — form's top-level structure
- **Fields and field groups** — what data is collected
- **Workflows and branches** — conditional paths (e.g., user category → different field sets)
- **API integrations** — data loading, save/submit, external validations
- **Cross-cutting concerns** — error handling, session management, complex async flows

### Step 3 — Decompose into Plans

Create ordered plan files following the **recommended decomposition order** below. This is a guideline, not a mandate — adapt to the form's needs.

#### Recommended Plan Order

| Order | Focus | Example Title | What It Covers |
|-------|-------|---------------|----------------|
| 1 | **Form structure & skeleton** | `01-form-structure.md` | All panels, initial fields, basic layout |
| 2–N | **Major workflows** (one per plan) | `02-workflow-branch-a.md` | One plan per major conditional branch or workflow |
| Next | **Cross-cutting validations** | `04-field-validations.md` | Validation rules spanning multiple panels or workflows |
| Next | **API integrations** | `05-api-prefill.md` | Data loading, save/submit handlers, API clients |
| Next | **Complex async flows** | `07-async-verification.md` | OTP, external checks, real-time validations, polling |
| Last | **Infrastructure / cross-cutting** | `08-error-handling.md` | Error handling, session management, analytics |

> **Adapt, don't force.** Simple forms need only 3 plans. Forms with no APIs skip integration plans. Heavy async flows may front-load those. The order above is a starting point.

#### Decomposition Principles

1. **One workflow per plan** — each plan targets a single user-facing workflow or concern. If a plan touches unrelated features, split it.
2. **Vertical slices** — a plan can invoke build + logic + integration skills. Plans are scoped by *feature*, not by *skill domain*.
3. **Incremental testability** — after each plan completes, the form should be in a testable state.
4. **Dependency clarity** — each plan explicitly declares which prior plans must be complete.
5. **Manageable scope** — if a plan has more than 8–10 steps, it's too large. Split along a natural boundary.

### Step 4 — Write Plan Files

Write each plan to `plans/<journey>/NN-<title>.md` following `assets/TEMPLATE.md`.

---

## Example Decomposition

| Plan | Focus | Skills Used |
|------|-------|-------------|
| 01 | Form structure & initial fields | `forms-content-author` |
| 02 | Workflow branch A (conditional section) | `forms-content-author`, `forms-rule-creator` |
| 03 | Workflow branch B (alternative path) | `forms-content-author`, `forms-rule-creator` |
| 04 | Shared fields & common sections | `forms-content-author`, `forms-rule-creator` |
| 05 | Cross-field business rule validations | `forms-rule-creator` |
| 06 | API integration — data loading & prefill | `manage-apis`, `forms-rule-creator` |
| 07 | API integration — save & submit | `manage-apis`, `forms-rule-creator` |
| 08 | Error handling & session management | `forms-rule-creator` |

