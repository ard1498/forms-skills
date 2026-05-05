---
name: forms-infra
description: >
  Domain router for infrastructure skills — workspace setup.
type: domain
triggers:
  - setup
  - workspace
  - credentials
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.2"
---

# Infra — Domain Router

**ID:** `infra`
**Version:** 0.2
**Description:** Domain router for infrastructure skills — workspace setup.

This router does not implement — it delegates. It matches user intents to the correct skill within this domain.

---

## Routing Table

First match wins.

| Intent | Examples | Skill |
|--------|----------|-------|
| Set up workspace, initialize project, configure credentials, system prereqs | "set up my workspace", "configure credentials" | `setup-workspace` |

> If the intent doesn't match the above, it belongs in another domain (e.g. git operations belong in the user's EDS repo using native git commands).

---

## Skills

All skills owned by this domain.

| # | Skill | Purpose | Triggers |
|---|-------|---------|----------|
| 1 | `setup-workspace` | Initialize project, configure credentials | setup, workspace, credentials, initialize |

### Skill Locations

| Skill | Path |
|-------|------|
| `setup-workspace` | [`references/setup-workspace/SKILL.md`](references/setup-workspace/SKILL.md) |

---

## Guard Policies

Guard policies are constraints that apply across all skills in this domain. They prevent unsafe or incorrect operations.

> **delegation-only:** This router does not implement — it delegates. All execution is performed by the individual skills listed in the routing table.

---

## File Locations

Canonical paths for assets managed by skills in this domain.

| Asset | Path |
|-------|------|
| Forms | `repo/content/forms/af/<team>/<path>/<name>.form.json` |
| Rule stores | `repo/content/forms/af/<team>/<path>/<name>.rule.json` |
| EDS code | `blocks/form/` (in `$FORMS_EDS_ROOT`) |

---

## Dependencies

Other domains or skills that this domain's skills may delegate to or depend on.

| Dependency | Direction | Reason |
|------------|-----------|--------|
| All other domains | Other domains → `infra` | All other domains depend on infra for initial workspace setup |

---

## Plan Integration

How this domain participates in plan-driven execution.

| When | Skill(s) Invoked | Role |
|------|-------------------|------|
| Before any plans — workspace setup | `setup-workspace` | Initializes project, configures credentials, verifies prerequisites |
| End of each plan's validate + deploy step | (none — native git) | Use `git add blocks/form/ && git commit && git push` directly in `$FORMS_EDS_ROOT` |

---

## Extending This Domain

### Adding a New Skill

1. Create the skill folder: `references/infra/references/<skill-name>/`
2. Add a `SKILL.md` inside the skill folder — this is the skill's entry point
3. Add the skill to the **Routing Table** above with its intent patterns
4. Add the skill to the **Skills** table and **Skill Locations** table above
5. Register the skill in the domain registry (`domains/SKILL.md`) — both the **Skills Catalog** and **Intent → Domain Routing** tables
6. If the skill manages new file types, add them to the **File Locations** table
7. If the skill manages config files, add them to the **Config Files** table
8. If needed, add guard policies that apply to the new skill