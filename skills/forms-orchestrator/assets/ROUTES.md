# Routing Table

Orchestrator routing algorithm — classifies user intent and routes to plans or domains.

---

## Architecture

```
User Intent
     │
     ▼
┌────────────────────────────────────────┐
│  Step 1: Workspace Gate                 │──→ no workspace? → read assets/SETUP.md inline
└──────────────────┬─────────────────────┘
                   │ workspace exists
                   ▼
┌────────────────────────────────────────┐
│  Step 1.5: Pre-Flight Check             │──→ AEM connectivity check (skip if mid-execution)
└──────────────────┬─────────────────────┘
                   │ connectivity OK
                   ▼
┌────────────────────────────────────────┐
│  Step 2: Active Plan Check              │──→ 🔵 Active plan? → resume → execute steps
└──────────────────┬─────────────────────┘
                   │ no active plan
                   ▼
┌────────────────────────────────────────┐
│  Step 3: Plans Check                    │
│  plans/<journey>/                       │──→ pending plans exist? → activate next → execute
└──────────────────┬─────────────────────┘
                   │ no plans exist
                   ▼
┌────────────────────────────────────────┐
│  Step 4: Generate Plans                 │
│  references/planner/SKILL.md            │──→ user has requirements? → generate plans → Step 3
└──────────────────┬─────────────────────┘
                   │ no requirements / single task
                   ▼
┌────────────────────────────────────────┐
│  Step 5: Domain Fallback                │
│  references/domain-registry/SKILL.md    │──→ intent matches a domain? → execute skill
└──────────────────┬─────────────────────┘
                   │ no domain matched
                   ▼
              Ask user to clarify
```

---

## Step 1 — Workspace Gate

| Condition | Action |
|-----------|--------|
| `FORMS_WORKSPACE` not set AND no `.env` found | Read `assets/SETUP.md` inline → follow setup steps → halt until complete |
| Workspace exists | → Step 1.5 |

---

## Step 1.5 — Pre-Flight Connectivity Check

Skip if Step 2 finds a 🔵 Active plan.

```bash
source .skills-workspace/.env && \
  curl -sf -o /dev/null -H "Authorization: Bearer $AEM_TOKEN" "${AEM_HOST}/api/assets.json" \
  && echo "AEM OK" || echo "AEM FAIL"
```

| Result | Action |
|--------|--------|
| ✅ `AEM OK` | → Step 2 |
| ❌ 401 Unauthorized | Tell user: "Your AEM bearer token has expired. Regenerate from AEM Developer Console → Integrations → Local Token, paste into `.env` as `AEM_TOKEN`, and let me know when done." Wait — do not proceed. |
| ❌ Other failure | Diagnose from error output (wrong host, network unreachable). Report with specific action required. Do not proceed until resolved. |

---

## Step 2 — Active Plan Check

| Condition | Action |
|-----------|--------|
| `.agent/handover.md` has a 🔵 Active plan | Read plan file at `plans/<journey>/NN-<title>.md` → find current step → execute via **Plan Execution Flow** |
| No active plan | → Step 3 |

**Finding the active plan:** Read `.agent/handover.md` → Journey Status table (🔵 Active row) → Plan Execution Status table (🔵 Active row) → read that plan file.

---

## Step 3 — Existing Plans Check

| Outcome | Action |
|---------|--------|
| ⬚ Pending plans exist in `plans/<journey>/` | Pick lowest `NN` pending plan → mark 🔵 Active in `.agent/handover.md` → execute via **Plan Execution Flow** |
| All plans ✅ Done | Journey complete → archive via `manage-context` |
| No plan files | → Step 4 |

---

## Step 4 — Generate Plans

User has requirements (journey docs, screenshots, Screen.md, etc.) but no plans. Route to `references/planner/SKILL.md`.

| Outcome | Action |
|---------|--------|
| Plans generated | Written to `plans/<journey>/` → → Step 3 |
| Insufficient requirements | Ask user for more context (Screen.md, journey description, screenshots) |
| Single isolated task, not a journey | → Step 5 |

---

## Step 5 — Domain Match (Fallback)

First match wins. Domain routers at `skills/forms-<domain>/SKILL.md`.

| Intent Pattern | Domain | Skills |
|----------------|--------|--------|
| Analyze requirements, document screens, review docs, migrate v1 | `analysis` | `analyze-requirements`, `create-screen-doc`, `analyze-v1-form`, `jud-to-screen`, `review-screen-doc` |
| Create form, add/modify/delete fields, panels, fragments, form content | `content-author` | `forms-content-author` → `forms-content-update`, `forms-content-generate`, `forms-custom-components` |
| Add rules, show/hide, validate, calculate, events | `rule-creator` | `forms-rule-creator` |
| Add/build APIs, OpenAPI, cURL | `integration` | `manage-apis` |
| Update reports, save progress, session log | `context-management` | `manage-context` |

| Outcome | Action |
|---------|--------|
| Single domain matches | → domain router SKILL.md |
| Multiple domains match | Present top 2–3 options → let user choose |
| No domain matches | → Step 6 |

**Use direct domain routing (skip plans) when intent is a single isolated task:**

| Example | Domain |
|---------|--------|
| "Add a visibility rule to panelX" | `rule-creator` |
| "Show me the API client for checkEnquiry" | `integration` |
| "Update the project reports" | `context-management` |
| "Validate my Screen.md" | `analysis` |
| "Create a custom date-picker component" | `content-author` |

---

## Step 6 — No Match

Ask user to clarify intent. Do not guess.

---

## Plan Execution Flow

```
Active plan selected
     │
     ▼
Read plans/<journey>/NN-<title>.md
     │
     ▼
Identify current step:
  ├─ New plan     → first step
  └─ Resumed plan → first incomplete step
     │
     ▼
Read step: skill / input artifacts / output artifacts
     │
     ▼
Resolve skill:
  Read references/domain-registry/SKILL.md → find domain → read skills/forms-<domain>/SKILL.md
  (Read tool — reference files, not invocable skills)
     │
     ▼
Execute skill → advance to next step
```

**Step not in Domain Registry catalog** → halt and report. Do not guess or substitute.

### Post-Completion

| State | Action |
|-------|--------|
| Step done, more steps remain | → next step |
| All steps done | Mark plan ✅ Done → post-plan checkpoint |
| More plans remain for journey | → activate next pending plan (Step 3) |
| All plans done | Journey complete → archive via `manage-context` to `.agent/history.md` |

### Post-Plan Checkpoint

Present to user:

| Option | Deploy? | Reports? | Next |
|--------|---------|----------|------|
| **1. Deploy and update reports** | ✅ | ✅ | Deploy → update `.agent/` |
| **2. Update reports only** | ❌ | ✅ | Update `.agent/` |
| **3. Update reports and proceed** | ❌ | ✅ | Update `.agent/` → next plan |
| **4. Proceed to next plan** | ❌ | ❌ | Next plan immediately |

**Deploy (option 1) — EDS code** (`blocks/form/` modified):
1. `npm run lint` in `$FORMS_EDS_ROOT` — fix violations before continuing
2. `git checkout -b <branch>` → `git add blocks/form/` → `git commit` → `git push origin <branch>` → open PR (`gh pr create` if available)
3. Wait for user to merge
4. `git checkout main && git pull` in `$FORMS_EDS_ROOT`

**AEM form content** — authored directly via `forms-content-author` / Sites Content MCP. No separate deploy step.

**Update reports (options 1, 2, 3)** → `context-management` → `manage-context` → update `.agent/handover.md`, `.agent/history.md`, `.agent/sessions.md`.

---

## Decision Summary

```
User Intent
     │
     ├─ No workspace?           → Step 1 → read assets/SETUP.md inline (hard gate)
     │
     ├─ Active plan exists?     → Step 2 → resume plan → execute steps
     │
     ├─ Pending plans exist?    → Step 3 → activate next plan → execute steps
     │
     ├─ Has requirements?       → Step 4 → generate plans → Step 3
     │
     ├─ Matches a domain?       → Step 5 → route to domain → execute skill
     │
     └─ Nothing matches?        → Step 6 → ask user to clarify
```

Every path reaches a skill execution or an explicit "ask user" fallback. No silent failures.
