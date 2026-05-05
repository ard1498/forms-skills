# Routing Table

The orchestrator's routing algorithm. Determines how user intents are classified and routed to plans or domains.

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

## Step 1 — Check Workspace Gate

**Priority:** Highest — runs before anything else.

| Condition | Action |
|-----------|--------|
| `FORMS_WORKSPACE` not set AND no `.env` found | Route to Domain Registry → `infra` › `setup-workspace`. Halt all other routing until setup completes. |
| Workspace exists | Proceed to Step 2 |

> This gate ensures no skill ever runs without a configured workspace. It is non-negotiable.

---

## Step 1.5 — Pre-Flight Connectivity Check

**Priority:** Runs immediately after workspace is confirmed. **Skip if** Step 2 finds an `🔵 Active` plan (don't interrupt mid-execution work to re-check).

Run:

```bash
source .skills-workspace/.env && \
  curl -sf -o /dev/null -H "Authorization: Bearer $AEM_TOKEN" "${AEM_HOST}/api/assets.json" \
  && echo "AEM OK" || echo "AEM FAIL"
```

| Result | Action |
|--------|--------|
| ✅ Passes (`AEM OK`) | Proceed to Step 2 |
| ❌ 401 Unauthorized | Tell user: "Your AEM bearer token has expired. Regenerate from AEM Developer Console → Integrations → Local Token, paste into `.env` as `AEM_TOKEN`, and let me know when done." Wait — do not proceed. |
| ❌ Other failure | Diagnose from error output (wrong host, network unreachable). Report with specific action required. Do not proceed until resolved. |

> Front-loading this check prevents wasted work when credentials expire between sessions — a common failure mode.

---

## Step 2 — Check Active Plan

**Priority:** Second — resume in-progress work before starting anything new.

| Condition | Action |
|-----------|--------|
| `.agent/handover.md` exists AND contains a 🔵 Active plan | Read the plan file at `plans/<journey>/NN-<title>.md`. Identify the current step. Execute via **Plan Execution Flow** below. |
| No `.agent/handover.md` OR no active plan | Proceed to Step 3 |

**How to identify an active plan:**
1. Read `.agent/handover.md`
2. Look at the **Journey Status** table — find a row with `🔵 Active`
3. Look at the **Plan Execution Status** table — find the row with `🔵 Active`
4. Read the plan file referenced in that row
5. The plan file declares ordered steps, each specifying which skill(s) to invoke

---

## Step 3 — Check for Existing Plans

**Priority:** Third — execute existing plans before trying to generate new ones.

Check whether plan files exist in `plans/<journey>/` for the active journey.

| Outcome | Action |
|---------|--------|
| ✅ Pending plans exist (⬚ status) | Pick the next pending plan (lowest `NN` number), mark it 🔵 Active in `.agent/handover.md`, execute via **Plan Execution Flow** below. |
| ✅ All plans are ✅ Done | Journey is complete. Archive via `manage-context`. |
| ❌ No plan files exist | Proceed to **Step 4** |

---

## Step 4 — Generate Plans

**Priority:** Fourth — user has requirements but no plans yet.

The user has provided requirements (journey docs, screenshots, Screen.md, etc.) but no plans have been created. Route to the **Planner** at `references/planner/SKILL.md` to generate plans.

| Outcome | Action |
|---------|--------|
| ✅ Plan Registry generates plans | Plans are written to `plans/<journey>/`. Return to **Step 3** to begin execution. |
| ❌ Insufficient requirements to generate plans | Ask the user for more context (Screen.md, journey description, screenshots, etc.). |
| ❌ Intent is a single isolated task, not a journey | Fall through to **Step 5** |

The Planner uses a default generation strategy but supports user customization. See `references/planner/SKILL.md` for details.

---

## Step 5 — Match Intent to Domain (Fallback)

**Priority:** Fifth — handles one-off tasks that don't need plans.

**Read** `references/domain-registry/SKILL.md`. The registry has an Intent → Domain Routing table. Do not invoke it as a skill — use the Read tool to access its content.

| Outcome | Action |
|---------|--------|
| ✅ Single domain matches | Route to that domain's router SKILL.md. The domain router handles skill-level routing internally. |
| ✅ Multiple domains match | Present top 2–3 matching domains to the user, let them choose |
| ❌ No domain matches | Proceed to **Step 6** |

### When to Use Direct Domain Routing (skip plans)

Direct domain routing is appropriate when the user's intent is a **single, isolated task** — not part of a multi-step journey:

| Example Intent | Domain | Why Not a Plan |
|----------------|--------|----------------|
| "Push my form to AEM" | `infra` | Single deploy action, not a build workflow |
| "Add a visibility rule to panelX" | `rule-creator` | Single rule addition, form already exists |
| "Show me the API client for checkEnquiry" | `integration` | Information retrieval, no build needed |
| "Update the project reports" | `context-management` | Context management, not a build step |
| "Validate my Screen.md" | `analysis` | Single review action |
| "Create a custom date-picker component" | `content-author` | Single component creation |

---

## Step 6 — No Match

**Priority:** Last resort.

No plan, no domain, and no generation strategy matched the user's intent.

| Action |
|--------|
| Ask the user to clarify their intent. Do not guess. |

---

## Plan Execution Flow

When a plan is active (from Step 2 or Step 3), execute it using this flow:

```
Active plan selected
     │
     ▼
Read plan file from plans/<journey>/NN-<title>.md
     │
     ▼
Identify current step:
  ├─ New plan → start at first step
  └─ Resumed plan → start at the first incomplete step
     │
     ▼
For the current step, read:
  • skill     (which specific skill to invoke)
  • input     (what artifacts this step needs)
  • output    (what artifacts this step produces)
     │
     ▼
Resolve skill via Domain Registry
  Read references/domain-registry/SKILL.md → Read references/domain-registry/references/<domain>/SKILL.md
  (use Read tool — these are reference files, not invocable skills)
     │
     ▼
Execute the skill
     │
     ▼
On step completion → advance to next step in plan
```

### Step Resolution

To resolve a plan step to an executable skill:

1. Read the step's skill declaration from the plan file
2. Look up the skill in the Domain Registry's Skills Catalog → find which domain owns it
3. Read the domain's router SKILL.md → the domain router's routing table identifies the specific skill to invoke

If a step declares a skill that doesn't exist in the Domain Registry's catalog, **halt and report the error**. Do not guess or substitute.

### Post-Completion

After a skill completes:

1. Mark the current step as done in the plan
2. Check if the plan has more steps → if yes, execute the next step
3. If all steps are complete → mark the plan ✅ Done, run the **post-plan checkpoint** (see below)
4. Check if more plans remain for the journey → if yes, activate the next pending plan (return to Step 3)
5. If all plans are complete → journey is complete. Archive via `manage-context` to `.agent/history.md`

### Post-Plan Checkpoint

After each plan completes, present the user with these options. All local changes are preserved regardless of choice — skipped deployments can be done later at any time.

> *"This plan is complete. How would you like to proceed?"*

| Option | Deploy? | Update Reports? | Next Action |
|--------|---------|-----------------|-------------|
| **1. Deploy and update reports** | ✅ | ✅ | Deploy all changes, then update `.agent/` reports |
| **2. Update reports only** | ❌ | ✅ | Skip deployment, update `.agent/` reports |
| **3. Update reports and proceed** | ❌ | ✅ | Update `.agent/` reports, then start next plan |
| **4. Proceed to next plan** | ❌ | ❌ | Skip both, start next plan immediately |

**When deploying (option 1):**
1. **EDS code first** — If any files in `blocks/form/` were created or modified:
   1. **Validate** — Run `npm run lint` in `$FORMS_EDS_ROOT` to verify the changes pass lint. Fix any violations before continuing.
   2. **Commit and push:**
      ```bash
      git checkout -b <branch-name>
      git add blocks/form/
      git commit -m "<message>"
      git push origin <branch-name>
      ```
      Then open a PR on GitHub (provide the URL or use `gh pr create` if the `gh` CLI is available).
   3. **Wait for merge** — Ask the user to review and merge the PR.
   4. **Pull latest** — Once the user confirms the merge, run `git checkout main && git pull` in `$FORMS_EDS_ROOT`.
2. **AEM form content** is now authored directly through `forms-content-author` via the Sites Content MCP server — there is no separate deploy step for form content.

**When updating reports (options 1, 2, 3):** Route to `context-management` → `manage-context` to update `.agent/handover.md`, `.agent/history.md`, and `.agent/sessions.md`.

---

## Decision Summary

```
User Intent
     │
     ├─ No workspace?           → Step 1 → setup-workspace (hard gate)
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

**Key principle:** Every path either reaches a skill execution or an explicit "ask user" fallback. There are no silent failures or dead ends.