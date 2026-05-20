---
name: manage-context
description: >
  Use when saving session progress, updating agent reports, or managing
  .agent/ memory files (handover.md, history.md, sessions.md). Opt-in —
  prompts user before updating.
  Triggers: update context, save progress, handover, session log, agent memory,
  update reports, save state, what did we do, session summary, generate report,
  progress report, track progress.
triggers:
  - update context
  - save progress
  - handover
  - session log
  - agent memory
  - update reports
  - save state
  - what did we do
  - session summary
  - generate report
  - progress report
  - track progress
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# Context Manager

Manages the `.agent/` directory — the agent's memory across sessions.

---

## When to Use

- After executing or implementing a plan (prompt the user first)
- User explicitly asks to save progress, update handover, or log the session
- At the end of a session when the user confirms they're done
- User asks "what did we do?" or "summarize this session"
- User asks to generate a progress report or status update
- At the end of a significant agentic task to capture decisions and context

**Do NOT** update `.agent/` files silently. Always ask the user first.

---

## Files

| File | Purpose | Update Mode |
|------|---------|-------------|
| `handover.md` | Latest project state snapshot — what's done, what's pending, how to resume | Overwrite |
| `history.md` | Append-only archive of previous handover snapshots with timestamps | Append |
| `sessions.md` | Chronological session log — date, agent, session ID, summary | Append |

> **Agentic context note:** These files collectively form the agent's persistent memory. `handover.md` is the active state, `history.md` is the archive, and `sessions.md` is the audit trail.

All files live in `.agent/` at the workspace root.

---

## User Prompt

After a plan is executed or a significant milestone is reached, ask:

> **Would you like me to update the project reports?**
> This saves the current progress to `.agent/` so the next session can pick up where we left off.

Only proceed if the user confirms. If declined, skip silently — do not ask again until the next plan completes.

---

## Update Procedure

When the user confirms, execute these steps in order:

### Step 1 — Archive current handover

Read `.agent/handover.md`. If it exists and is non-empty, append its content to `.agent/history.md` with a timestamp header:

```
---
## Archived: YYYY-MM-DD HH:MM

<previous handover.md content>
```

If `handover.md` does not exist or is empty, skip this step.

### Step 2 — Write new handover

Overwrite `.agent/handover.md` with a fresh snapshot using this template:

```
# Project Handover

**Last updated:** YYYY-MM-DD HH:MM
**Workspace:** <workspace name>
**Active journey:** <journey name> | **Active plan:** <plan number>

---

## Journey Status

| Journey | Total Plans | Completed | Status | Progress |
|---------|-------------|-----------|--------|----------|
| <journey-1> | N | X | 🔵 Active / ✅ Done / ⏸️ Paused | X/N (XX%) |
| <journey-2> | N | X | ⏸️ Paused | X/N (XX%) |

---

## Plan Execution Status — <active journey>

| Plan | Title | Phase(s) | Status | Summary |
|------|-------|----------|--------|---------|
| 01 | <title> | Build | ✅ Done | <one-line summary of what was delivered> |
| 02 | <title> | Logic | ✅ Done | <one-line summary> |
| 03 | <title> | Logic | 🔵 Active | <what's in progress> |
| 04 | <title> | Integrate, Logic | ⬚ Pending | |
| ... | ... | ... | ... | |

**Plan statuses:** ✅ Done — 🔵 Active — ⬚ Pending — ⏸️ Blocked — ❌ Failed

---

## Current Plan Details

**Plan:** <number> — <title>
**File:** `plans/<journey>/<plan-file>.md`
**Skills:** <skills this plan invokes>
**Depends on:** <plan numbers>

### What's Done (this session)

- <completed item 1>
- <completed item 2>

### What's Remaining (this plan)

- <next step 1>
- <next step 2>

### Key Files Modified

| File | Status | Notes |
|------|--------|-------|
| <path> | created/modified | <brief note> |

---

## How to Resume

<1-2 sentences: which plan, which step within that plan, which skill to invoke>
```

Keep it concise — aim for ≤ 60 lines. The Plan Execution Status table is the primary dashboard; Current Plan Details covers only the active plan.

When **multiple journeys** exist, show the Plan Execution Status table only for the active journey. Completed journeys show only their row in the Journey Status table (details are in `history.md`).

### Step 3 — Log session

Append a row to `.agent/sessions.md`. If the file doesn't exist, create it with the header first:

```
# Session Log

| Date | Agent | Session ID | Summary |
|------|-------|------------|---------|
```

Then append the row:

```
| YYYY-MM-DD | <agent name> | <session ID or —> | <one-line summary of what was accomplished> |
```

If the session ID is not available, use `—`.

### Step 4 — Archive completed journey (if applicable)

When **all plans** for a journey show status ✅ Done:

1. **Build a journey completion record** from the Plan Execution Status table:

```
---
## Journey Completed: <journey-name> — YYYY-MM-DD HH:MM

### Summary

| Metric | Value |
|--------|-------|
| Journey | <journey-name> |
| Plans executed | N |
| Start date | YYYY-MM-DD |
| Completion date | YYYY-MM-DD |
| Total screens | X |
| Total fields | X |
| Total rules | X |

### Plan Execution Log

| Plan | Title | Phase(s) | Summary |
|------|-------|----------|---------|
| 01 | <title> | Build | <summary> |
| 02 | <title> | Logic | <summary> |
| ... | ... | ... | ... |

### Key Artifacts

| Artifact | Path |
|----------|------|
| Form JSON | `repo/content/forms/af/<team>/<path>/<name>.form.json` |
| Rule store | `repo/content/forms/af/<team>/<path>/<name>.rule.json` |
| Form script | `blocks/form/scripts/form/<name>.js` (EDS repo root) |
| Screen docs | `journeys/<journey>/screens/*/Screen.md` |

### Lessons / Notes

- <any notable decisions, workarounds, or technical debt>
```

2. **Append** this record to `.agent/history.md`
3. **Update** `.agent/handover.md`:
   - Move the journey's row in Journey Status to ✅ Done
   - Remove that journey's Plan Execution Status table
   - If another journey is queued, promote it to active
   - If no journeys remain, set Active journey to `—`

---

## Progress Report

When the user asks for a progress report or status update, generate a concise summary from the current handover state without modifying any files:

```
# Progress Report — <date>

**Workspace:** <workspace name>
**Active journey:** <journey name> | **Plan:** <current plan number>

## Completed This Session
<bullet list of what was accomplished>

## Current Status
<one paragraph: what's done, what's in progress, what's next>

## Pending Actions
<bullet list of remaining steps>
```

This is read-only — do NOT update `.agent/` files just because a progress report was requested. Only update on explicit confirmation.

---

## Reading Context (Session Start)

When starting a new session, if `.agent/handover.md` exists, read it to understand:
- What phase the project is in
- What was completed previously
- What's pending
- Key file locations

Do NOT read `history.md` or `sessions.md` unless the user asks about past sessions. They exist for traceability, not for routine context loading.

---

## Rules

1. **Always ask before writing.** Never update `.agent/` files without user confirmation.
2. **Handover must be concise.** No more than 60 lines. The Plan Execution Status table is the primary dashboard — keep plan summaries to one line each.
3. **History is append-only.** Never modify or truncate `history.md`.
4. **Sessions is append-only.** Never modify or truncate `sessions.md`.
5. **No sensitive data.** Never write credentials, tokens, or secrets to `.agent/` files.
6. **Create if missing.** If any `.agent/` file doesn't exist, create it — don't error.