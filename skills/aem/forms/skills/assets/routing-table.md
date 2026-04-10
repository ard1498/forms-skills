# Routing Table

The orchestrator's routing algorithm. Determines how user intents are classified and routed to pipelines or domains.

---

## Architecture

```
User Intent
     │
     ▼
┌────────────────────────────────────────┐
│  Step 1: Workspace Gate                 │──→ no workspace? → infra › setup-workspace
└──────────────────┬─────────────────────┘
                   │ workspace exists
                   ▼
┌────────────────────────────────────────┐
│  Step 2: Active Plan Check              │──→ 🔵 Active plan? → resume → skip to Step 5
└──────────────────┬─────────────────────┘
                   │ no active plan
                   ▼
┌────────────────────────────────────────┐
│  Step 3: Pipeline Registry              │
│  references/pipelines/SKILL.md          │──→ intent matches a pipeline? → Step 5
└──────────────────┬─────────────────────┘
                   │ no pipeline matched
                   ▼
┌────────────────────────────────────────┐
│  Step 4: Domain Registry (fallback)     │
│  references/domains/SKILL.md            │──→ intent matches a domain? → execute skill
└──────────────────┬─────────────────────┘
                   │ no domain matched
                   ▼
              Ask user to clarify
```

---

## Step 1 — Check Workspace Gate

**Priority:** Highest — runs before anything else.

| Condition | Action |
|-----------|--------|
| `FORMS_WORKSPACE` not set AND no `.env` found | Route to Domain Registry → `infra` › `setup-workspace`. Halt all other routing until setup completes. |
| Workspace exists | Proceed to Step 2 |

> This gate ensures no skill ever runs without a configured workspace. It is non-negotiable.

---

## Step 2 — Check Active Plan

**Priority:** Second — resume in-progress work before starting anything new.

| Condition | Action |
|-----------|--------|
| `.agent/handover.md` exists AND contains a 🔵 Active plan | Read the plan file at `plans/<journey>/NN-<title>.md`. Determine which pipeline phase(s) to execute. Skip to **Step 5**. |
| No `.agent/handover.md` OR no active plan | Proceed to Step 3 |

**How to identify an active plan:**
1. Read `.agent/handover.md`
2. Look at the **Journey Status** table — find a row with `🔵 Active`
3. Look at the **Plan Execution Status** table — find the row with `🔵 Active`
4. Read the plan file referenced in that row
5. The plan file declares which pipeline phase(s) it exercises

---

## Step 3 — Match Intent to Pipeline

**Priority:** Third — multi-phase workflows take precedence over one-off tasks.

Route to the **Pipeline Registry** at `references/pipelines/SKILL.md`. The registry has an Intent Routing table with trigger patterns and confidence levels.

| Outcome | Action |
|---------|--------|
| ✅ Single pipeline matches with **High** confidence | Select that pipeline, proceed to **Step 5** |
| ✅ Single pipeline matches with **Medium** confidence | Confirm with user: *"It sounds like you want to <pipeline purpose>. Should I start the <pipeline name> pipeline?"* |
| ✅ Multiple pipelines match | Present options to user, let them choose |
| ❌ No pipeline matches | Fall through to **Step 4** |

### Pipeline Selection Precedence

When multiple signals are present, resolve in this order:

1. **Explicit pipeline request** — user names a pipeline by ID or title → select it directly (highest priority)
2. **Active plan resume** — `.agent/handover.md` has a 🔵 Active plan → resume that plan's pipeline (handled in Step 2, but listed here for completeness)
3. **Trigger match** — user intent matches pipeline trigger patterns → select the pipeline
4. **Ambiguous match** — multiple pipelines match → present options to user
5. **No match** — fall through to Step 4

---

## Step 4 — Match Intent to Domain (Fallback)

**Priority:** Fourth — handles one-off tasks that don't need a full pipeline.

Route to the **Domain Registry** at `references/domains/SKILL.md`. The registry has an Intent → Domain Routing table.

| Outcome | Action |
|---------|--------|
| ✅ Single domain matches | Route to that domain's router SKILL.md. The domain router handles skill-level routing internally. |
| ✅ Multiple domains match | Present top 2–3 matching domains to the user, let them choose |
| ❌ No domain matches | Ask the user to clarify their intent. Do not guess. |

### When to Use Direct Domain Routing (skip pipelines)

Direct domain routing is appropriate when the user's intent is a **single, isolated task** — not part of a multi-phase workflow:

| Example Intent | Domain | Why Not a Pipeline |
|----------------|--------|-------------------|
| "Push my form to AEM" | `infra` | Single deploy action, not a build workflow |
| "Add a visibility rule to panelX" | `logic` | Single rule addition, form already exists |
| "Show me the API client for checkEnquiry" | `integration` | Information retrieval, no build needed |
| "Update the project reports" | `context` | Context management, not a build phase |
| "Validate my Screen.md" | `analysis` | Single review action |
| "Create a custom date-picker component" | `build` | Single component creation |

---

## Step 5 — Execute Pipeline Phase

**Priority:** Execution — runs after a pipeline has been selected (from Step 3) or a plan has been resumed (from Step 2).

### Execution Flow

```
Pipeline selected (from Step 3 or Step 2)
     │
     ▼
Read pipeline file from references/pipelines/references/<pipeline>.md
     │
     ▼
Identify current phase:
  ├─ New pipeline run → start at first phase
  └─ Resumed plan → start at the phase declared in the plan file
     │
     ▼
For the current phase, read:
  • domain    (which domain to route to)
  • skill     (which specific skill within that domain)
  • input     (what artifacts this phase needs)
  • output    (what artifacts this phase produces)
  • gate      (precondition that must pass)
     │
     ▼
Check gate:
  ├─ Gate passes → proceed
  └─ Gate fails → halt, report failure, do not guess
     │
     ▼
Resolve domain + skill via Domain Registry
  (references/domains/SKILL.md → references/domains/references/<domain>/SKILL.md)
     │
     ▼
Execute the skill
     │
     ▼
On completion → follow pipeline's checkpoint rules
  (defined in the pipeline file)
```

### Phase Resolution

To resolve a pipeline phase to an executable skill:

1. Read the phase's `domain` and `skill` declarations from the pipeline file
2. Look up the `domain` in the Domain Registry → get the router path (`references/domains/references/<domain>/SKILL.md`)
3. Look up the `skill` in the Domain Registry's Skills Catalog → confirm it exists in that domain
4. Route to the domain's router SKILL.md → the domain router invokes the specific skill

If a phase declares a skill that doesn't exist in the Domain Registry's catalog, **halt and report the error**. Do not guess or substitute.

### Post-Completion

After a skill completes:

1. Check if the current **plan** has more phases to execute → if yes, execute the next phase
2. If the plan is complete → follow the pipeline's **post-plan checkpoint** rules
3. If all plans are complete → follow the pipeline's **journey completion** rules (typically archive to `.agent/history.md`)

---

## Decision Summary

```
User Intent
     │
     ├─ No workspace?           → Step 1 → setup-workspace (hard gate)
     │
     ├─ Active plan exists?     → Step 2 → resume plan → Step 5
     │
     ├─ Matches a pipeline?     → Step 3 → select pipeline → Step 5
     │
     ├─ Matches a domain?       → Step 4 → route to domain → execute skill
     │
     └─ Nothing matches?        → Ask user to clarify
```

**Key principle:** Every path either reaches a skill execution or an explicit "ask user" fallback. There are no silent failures or dead ends.