---
name: forms-context-management
description: >
  Use when user wants to save session progress, update agent reports, or
  manage context across sessions.
  Triggers: update context, save progress, session log, update reports,
  handover, agent memory.
type: router
triggers:
  - update reports
  - save progress
  - handover
  - session log
  - agent memory
  - save state
  - session summary
  - context management
  - generate report
  - update report
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# Context Management — Domain Router

## Routing Table

First match wins.

| Intent | Examples | Skill |
|--------|----------|-------|
| Update project reports, save progress, handover | "update reports", "save progress", "write handover" | `manage-context` |
| Session summary, recall past work | "what did we do", "session summary", "session log" | `manage-context` |

## Skills

| # | Skill | Purpose | Triggers |
|---|-------|---------|----------|
| 1 | `manage-context` | Update project reports, save progress, session log | update reports, save progress, handover, session log, agent memory, save state, session summary |

### Skill Locations

| Skill | Path |
|-------|------|
| `manage-context` | `references/manage-context/SKILL.md` |

## Guard Policies

After each plan completes, the orchestrator prompts **"Would you like me to update the project reports?"** — if confirmed, routes here; never updates silently.

## File Locations

| Asset | Path |
|-------|------|
| Project state snapshot | `.agent/handover.md` |
| Archived handovers | `.agent/history.md` |
| Session log | `.agent/sessions.md` |

## Dependencies

All plans may invoke the context domain at post-plan checkpoints for report updates.

## Plan Integration

Invoked at post-plan checkpoints to update project reports (handover, history, session log). After each plan completes its validate + deploy step, the orchestrator offers to run `manage-context` for report updates.

## Extending This Domain

- Create `references/<skill-name>/SKILL.md` → register in **Skills** table and **Skill Locations**.
- Add a routing entry in **Routing Table** for the new skill's intents.
- Update **triggers** in frontmatter for any new trigger phrases.