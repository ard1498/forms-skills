---
name: skills-catalog
description: >
  Complete catalog of all skills across all domains, plus intent-based routing
  for direct domain routing.
---

# Skills Catalog

All 9 skills across 6 domains.

| # | Domain | Skill | Purpose | Triggers |
|---|--------|-------|---------|----------|
| 1 | `analysis` | `analyze-requirements` | Parse requirements / mockups → form specification | analyze, requirements, create spec, plan form |
| 2 | `analysis` | `analyze-v1-form` | Read legacy v1 form JSON → Screen.md for migration | v1 form, legacy form, migrate, old form |
| 3 | `analysis` | `create-screen-doc` | Create standardized Screen.md (11-section format) | document screen, new screen doc |
| 4 | `analysis` | `jud-to-screen` | Convert JUD document to Screen.md format | jud, convert, jud to screen |
| 5 | `content-author` | `forms-custom-components` | Build custom components / extend OOTB field types | custom component, viewType, extend field |
| 6 | `rule-creator` | `forms-rule-creator` | Add business rules (show/hide, validate, navigate, calculate, events) | add rule, show hide, validation, visibility, calculate |
| 7 | `integration` | `manage-apis` | Add API definitions, build JS clients from cURL | API, OpenAPI, cURL, api client |
| 8 | `infra` | `setup-workspace` | Initialize project, configure credentials | setup, workspace, credentials, initialize |
| 9 | `context-management` | `manage-context` | Update project reports, save progress, session log | save progress, update reports, handover, session |

---

## Intent → Domain Routing

When the orchestrator uses direct domain routing, use this table. First match wins.

| User Intent Pattern | Domain | Typical Skills Invoked |
|---------------------|--------|------------------------|
| Setup, credentials, workspace initialization | `infra` | `setup-workspace` |
| Analyze requirements, document screens, review docs, migrate v1 | `analysis` | `analyze-requirements`, `create-screen-doc`, `analyze-v1-form`, `jud-to-screen` |
| Create form, add/modify/delete fields, panels, fragments, form content | `content-author` | `forms-content-author` (routes internally to `forms-content-update`, `forms-content-generate`, `forms-rule-creator`) |
| Add rules, show/hide, validate, calculate, events | `rule-creator` | `forms-rule-creator` |
| Add/build APIs, OpenAPI, cURL | `integration` | `manage-apis` |
| Update reports, save progress, session log | `context-management` | `manage-context` |

> If the intent is ambiguous, present the top 2–3 matching domains to the user and let them choose.