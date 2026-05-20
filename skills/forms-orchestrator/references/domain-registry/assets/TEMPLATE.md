---
name: <domain-id>
description: >
  <One-line purpose of this domain>
type: router
triggers:
  - <trigger keyword 1>
  - <trigger keyword 2>
  - <trigger keyword 3>
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# <Domain Name> — Domain Router

> **Base pattern:** This template is a forms-specific specialization of the [Skill Router Template](../../../../../docs/skill-architecture/skill-router-template.md). See the [Skill Architecture Guide](../../../../../docs/skill-architecture/README.md) for the generalized patterns (directory structure, routing tables, guidelines).

**ID:** `<domain-id>`
**Version:** 0.1
**Description:** <One-line purpose of this domain>

This router does not implement — it delegates. It matches user intents to the correct skill within this domain.

---

## Routing Table

First match wins.

| Intent | Examples | Skill |
|--------|----------|-------|
| <Intent category 1> | "<example phrase>", "<example phrase>" | `<skill-id-1>` |
| <Intent category 2> | "<example phrase>", "<example phrase>" | `<skill-id-2>` |
| <Intent category 3> | "<example phrase>", "<example phrase>" | `<skill-id-3>` |

> If the intent is ambiguous between two skills, present the options to the user and let them choose.

---

## Skills

All skills owned by this domain.

| # | Skill | Purpose | Triggers |
|---|-------|---------|----------|
| 1 | `<skill-id-1>` | <One-line purpose> | <comma-separated trigger keywords> |
| 2 | `<skill-id-2>` | <One-line purpose> | <comma-separated trigger keywords> |
| 3 | `<skill-id-3>` | <One-line purpose> | <comma-separated trigger keywords> |

### Skill Locations

| Skill | Path |
|-------|------|
| `<skill-id-1>` | [`references/<skill-id-1>/SKILL.md`](references/<skill-id-1>/SKILL.md) |
| `<skill-id-2>` | [`references/<skill-id-2>/SKILL.md`](references/<skill-id-2>/SKILL.md) |
| `<skill-id-3>` | [`references/<skill-id-3>/SKILL.md`](references/<skill-id-3>/SKILL.md) |

---

## Guard Policies

Guard policies are constraints that apply across all skills in this domain. They prevent unsafe or incorrect operations.

> **<guard-policy-id>:** <Description of what is forbidden and why. Example: "Never edit `.rule.json` directly. All business logic must go through `forms-rule-creator`.">

> **<guard-policy-id>:** <Description of another constraint.>

Remove this section if the domain has no guard policies. Most domains should have at least one.

---

## File Locations

Canonical paths for assets managed by skills in this domain.

| Asset | Path |
|-------|------|
| <Asset type 1> | `<canonical/path/pattern>` |
| <Asset type 2> | `<canonical/path/pattern>` |
| <Asset type 3> | `<canonical/path/pattern>` |

---

## Dependencies

Other domains or skills that this domain's skills may delegate to or depend on.

| Dependency | Direction | Reason |
|------------|-----------|--------|
| `<other-domain>` | This domain → `<other-domain>` | <Why this domain depends on or delegates to the other> |
| `<other-domain>` | `<other-domain>` → This domain | <Why the other domain feeds into this one> |

Remove this section if the domain has no cross-domain dependencies.

---

## Plan Integration

Which plan types commonly invoke skills in this domain.

| Plan Type | Typical Step(s) | Skill(s) Invoked |
|-----------|-----------------|------------------|
| `<plan-type>` | Step <N>: <Name> | `<skill-id>` |
| `<plan-type>` | Step <N>: <Name> | `<skill-id>` |

Remove this section if no plan types typically invoke this domain's skills.

---

## Extending This Domain

### Adding a New Skill

1. Create the skill folder: `skills/forms-<domain-id>/references/<skill-name>/`
2. Add a `SKILL.md` inside the skill folder — this is the skill's entry point
3. Add the skill to the **Routing Table** above with its intent patterns
4. Add the skill to the **Skills** table and **Skill Locations** table above
5. Register the skill in the domain registry (`references/domain-registry/SKILL.md`) — **Registry** table
6. If the skill manages new file types, add them to the **File Locations** table
7. If needed, add guard policies that apply to the new skill

### Creating a New Domain from This Template

1. Copy this file to `skills/forms-<domain-name>/SKILL.md`
2. Update the YAML frontmatter — set `name`, `description`, and `triggers`
3. Fill in the routing table — one row per skill in the domain
4. Fill in the skills table — catalog every skill with its purpose and triggers
5. Define guard policies — constraints that prevent unsafe operations
6. Fill in file locations — canonical paths for assets this domain manages
7. Map cross-domain dependencies if any exist
8. Map plan types that commonly invoke skills in this domain
9. Create skill sub-folders under `skills/forms-<domain-name>/references/<skill-name>/`
10. Register the domain in the domain registry `references/domain-registry/SKILL.md` — **Registry** table