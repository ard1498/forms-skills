# Orchestrator Guidelines

Constraints, conventions, and reference tables for the Forms Orchestrator.

---

## Workspace Gate

Before any routing occurs, verify the workspace exists.

**Check:** `FORMS_WORKSPACE` environment variable is set, or `.env` file exists in cwd.

| Condition | Action |
|-----------|--------|
| Workspace exists | Proceed to routing |
| Workspace missing | Route to Domain Registry → `infra` › `setup-workspace` immediately. **Block all other routing until complete.** |

> No pipeline, no domain, no skill may execute without a resolved workspace — except `setup-workspace` itself.

---

## Workspace Resolution

All CLI tools auto-resolve the workspace directory before running. Every tool sources `bin/_resolve-workspace` which ensures `.env`, `metadata.json`, `sandbox.json`, and all workspace directories are found correctly.

**Resolution order (first match wins):**

1. **`FORMS_WORKSPACE` already in environment** — e.g. exported by the caller
2. **`FORMS_WORKSPACE` read from `.env` in cwd** — written by `setup-workspace` during Phase 0
3. **Fall back to cwd** — backwards-compatible default

---

## Plan Conventions

Plans are sequentially ordered execution units within a journey. Each plan triggers one or more pipeline phases.

| Rule | Description |
|------|-------------|
| **File path** | `plans/<journey>/NN-<short-title>.md` |
| **Numbering** | Zero-padded two digits: `01`, `02`, ..., `10`, `11` |
| **Execution order** | Sequential — each plan declares its dependencies explicitly |
| **Max per journey** | 15 — if more are needed, the journey is likely too complex (check complexity thresholds) |
| **Template** | See `references/pipelines/assets/templates/pipeline-template.md` |
| **Decomposition guidelines** | See Domain Registry → `analysis` › `analyze-requirements` skill (§ Plan Generation) |

### Plan Status Tracking

Plan status is tracked in `.agent/handover.md` via the Plan Execution Status dashboard, managed by Domain Registry → `context` › `manage-context`.

**Statuses:** ✅ Done — 🔵 Active — ⬚ Pending — ⏸️ Blocked — ❌ Failed

### Journey Completion

When all plans for a journey show ✅ Done:
- `manage-context` archives the journey to `.agent/history.md`
- The journey row in `.agent/handover.md` moves to ✅ Done
- The next queued journey (if any) is promoted to active

---

## General Routing Rules

1. **The orchestrator does not implement** — it only selects and routes. All logic lives in pipelines, domains, and skills.
2. **Pipeline first, domain fallback** — always try to match a pipeline before falling through to direct domain routing.
3. **Active plan takes priority** — if `.agent/handover.md` shows a 🔵 Active plan, resume it before considering new intents.
4. **One active plan at a time** — do not start a new plan while one is in progress. Complete or pause the current plan first.
5. **Pipelines own checkpoints** — post-plan checkpoint behavior (deploy, update reports, proceed) is defined in the pipeline file, not the orchestrator.
6. **Domains own skills** — the orchestrator never invokes a skill directly. It routes to a domain router, which handles skill-level dispatch.
7. **Ambiguity requires user input** — if multiple pipelines or domains match, present options. Never guess.
8. **No silent side effects** — never update `.agent/` files, deploy, or modify code without user confirmation.

---

## Config Files

| File | Managed By | Purpose |
|------|------------|---------|
| `.env` | `setup-workspace` | `FORMS_WORKSPACE` path + AEM/GitHub credentials — never commit |
| `metadata.json` | `sync-forms` | Tracks synced form/fragment paths (AEM ↔ local) |
| `sandbox.json` | `git-sandbox` | Restricts allowed commit paths and push branch names |

---

## File Locations

### Orchestrator Structure

| What | Where |
|------|-------|
| Orchestrator | `SKILL.md` |
| Routing table | `assets/routing-table.md` |
| Guidelines (this file) | `assets/guidelines.md` |
| Pipeline registry | `references/pipelines/SKILL.md` |
| Pipeline definitions | `references/pipelines/references/*.md` |
| Pipeline template | `references/pipelines/assets/templates/pipeline-template.md` |
| Domain registry | `references/domains/SKILL.md` |
| Domain routers | `references/domains/references/<domain>/SKILL.md` |

### Workspace Structure

| What | Where |
|------|-------|
| Forms | `repo/content/forms/af/<team>/<path>/<name>.form.json` |
| Rule stores | `repo/content/forms/af/<team>/<path>/<name>.rule.json` |
| Fragment scripts | `code/blocks/form/scripts/fragment/<fragment>.js` |
| Form-level scripts | `code/blocks/form/scripts/form/<form>.js` |
| Shared libraries | `code/blocks/form/scripts/script-libs/libs.js` |
| API clients (live) | `code/blocks/form/api-clients/` |
| API clients (staging) | `refs/apis/api-clients/` |
| API definitions | `refs/apis/` |
| Screen docs | `journeys/<journey>/screens/<screen>/Screen.md` |
| Custom components | `code/components/<view-type>/` |
| Plans | `plans/<journey>/NN-<title>.md` |
| Agent memory | `.agent/handover.md`, `.agent/history.md`, `.agent/sessions.md` |