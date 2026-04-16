---
name: analysis
description: >
  Domain router for analysis & documentation skills. Routes user intents
  to the correct analysis skill based on input source.
type: domain
triggers:
  - analyze
  - requirements
  - create spec
  - plan form
  - screen doc
  - review screen
  - v1 form
  - legacy form
  - migrate
  - mockup
  - figma
  - jud
  - docx screen
  - jud to screen
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# Analysis — Domain Router

- **ID:** `analysis`
- **Version:** 0.1
- **Description:** Routes analysis and documentation intents to the correct skill based on input source. This router does not implement — it delegates.

---

## Routing Table

First match wins.

| Intent | Skill |
|--------|-------|
| Parse requirements docs, mockups, or journey specs into a structured form specification | `analyze-requirements` |
| Read legacy v1 adaptive-form JSON and produce Screen.md docs for migration | `analyze-v1-form` |
| Create a standardized Screen.md for a form screen (11-section format) from screenshots or Figma | `create-screen-doc` |
| Create Screen.md from a JUD (.docx) and design screenshots, with global variable tracking | `jud-to-screen` |
| Validate a Screen.md against actual form JSON — quality gate | `review-screen-doc` |

```
                         ┌─ requirements doc ──→ analyze-requirements ─┐
                         ├─ journey.md ────────→ analyze-requirements ─┤
  Input Source ──────────┤                                             ├──→ Screen.md
                         ├─ screenshots/figma ─→ create-screen-doc ───┤
                         ├─ JUD + screenshots ─→ jud-to-screen ───────┤
                         └─ v1 adaptive form ──→ analyze-v1-form ─────┘
                                                        │
                                              review-screen-doc (quality gate)
```

---

## Skills

| # | Skill | Purpose | Triggers |
|---|-------|---------|----------|
| 1 | `analyze-requirements` | Parse requirements docs / mockups into structured form specification | analyze, requirements, create spec, plan form, journey |
| 2 | `analyze-v1-form` | Read legacy v1 AEM form JSON and produce Screen.md docs for migration | v1 form, legacy form, migrate, adaptive form |
| 3 | `create-screen-doc` | Create standardized Screen.md per form screen (11-section format) | screen doc, create screen, screenshots, figma, mockup |
| 4 | `jud-to-screen` | Create Screen.md from JUD (.docx) and design screenshots with global variable tracking | jud, docx screen, jud to screen, document screen from jud |
| 5 | `review-screen-doc` | Validate Screen.md against actual form JSON — quality gate | review screen, validate screen, quality gate |

### Skill Locations

| Skill | Path |
|-------|------|
| `analyze-requirements` | `references/analyze-requirements/SKILL.md` |
| `analyze-v1-form` | `references/analyze-v1-form/SKILL.md` |
| `create-screen-doc` | `references/create-screen-doc/SKILL.md` |
| `jud-to-screen` | `references/jud-to-screen/SKILL.md` |
| `review-screen-doc` | `references/review-screen-doc/SKILL.md` |

---

## Guard Policies

> **screen-md-convergence:** All paths in this domain converge to produce Screen.md files. Every skill's output is either a Screen.md or feeds into one.

> **quality-gate:** All Screen.md files MUST pass through `review-screen-doc` as a quality gate before leaving this domain. No Screen.md is considered complete until reviewed.

> **no-guessing-endpoints:** Never guess API endpoints or service URLs. Mark any unknowns as `TBD` and flag them for the user.

> **no-currentFormContext:** Never emit `PL.currentFormContext` references in any generated output. Use the documented data-binding patterns instead.

> **intake-gate:** Before routing, confirm that input files (requirements, screenshots, v1 JSON, etc.) are present on disk. Do NOT proceed until files are confirmed.

---

## File Locations

| Asset | Path |
|-------|------|
| Screen docs | `refs/screens/<journey>/<screen-name>.md` |
| Plans | `plans/<journey>/NN-<title>.md` |
| Journey specs | `journeys/<journey-name>.md` |
| Screenshots | `journeys/<journey>/screens/<screen>/*.png`, `*.jpg`, `*.pdf` |
| V1 form JSON | `refs/<form-name>.v1.json` |

### Intake Conventions

| Source | Place In | Convention |
|--------|----------|------------|
| Screen.md | `journeys/<journey>/screens/<screen>/` | `Screen.md` |
| Journey.md | `journeys/` | `<journey-name>.md` |
| Screenshots | `journeys/<journey>/screens/<screen>/` | `*.png`, `*.jpg`, `*.pdf` |
| V1 Form JSON | `refs/` | `<form-name>.v1.json` |

---

## Dependencies

| Dependency | Domain | Purpose |
|------------|--------|---------|
| `review-screen-doc` → form JSON | infra (`sync-forms`) | Review skill needs the synced form JSON to validate Screen.md against |

---

## Plan Integration

How this domain participates in plan-driven execution.

| When | Skill(s) Invoked | Role |
|------|-------------------|------|
| Plan generation — understanding requirements and producing specs | `analyze-requirements` | Parses requirements and produces initial Screen.md drafts |
| Plan execution — screen doc creation and review | `create-screen-doc`, `review-screen-doc` | Creates Screen.md files and validates them against form JSON before build proceeds |

---

## Extending This Domain

1. Create a new skill directory under `references/<skill-name>/`.
2. Add a `SKILL.md` inside that directory following the skill template.
3. Update the **Routing Table** above with the new intent → skill mapping.
4. Add the skill to the **Skills** table and **Skill Locations** sub-table.
5. Ensure the new skill's output either produces a Screen.md or feeds into one (per the **screen-md-convergence** policy).
6. If the skill is a quality gate, document it in **Guard Policies**.