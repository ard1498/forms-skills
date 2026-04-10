---
name: routing-table-template
description: >
  Template for routing table asset files. Use when a router SKILL.md's
  routing logic is too complex to keep inline.
type: routing-table
---

# Routing Table Template

Use this template when your router SKILL.md's routing logic exceeds a simple table — e.g., it has multi-step algorithms, decision trees, precedence rules, or resolution logic.

> **Produces type:** `routing-table` — Asset files created from this template must have `type: routing-table` in their frontmatter. This type signals that the file contains routing logic offloaded from a `type: router` or `type: domain` SKILL.md.

> **Where this file lives:** `<skill>/assets/routing-table.md`
> **Referenced from:** The router's SKILL.md via a markdown link

---

## Template

Copy and adapt the sections below.

### Routing Algorithm

```
---
name: routing-table
description: >
  Routing algorithm for <router-name>. Defines the step-by-step logic
  for matching user intents to sub-skills.
type: routing-table
---

# Routing Algorithm

Step-by-step routing logic for `<router-name>`.

---

## Decision Flow

Describe the routing algorithm as a numbered sequence. Each step is a decision point.

1. **<Gate / Precondition>** — <condition to check>
   - If true → <action: route to skill, halt, prompt user>
   - If false → continue to step 2

2. **<Check active state>** — <is there an active task/plan/session?>
   - If yes → <resume it>
   - If no → continue to step 3

3. **<Primary match>** — <match intent against primary dispatch table>
   - If matched → <route to matched target>
   - If no match → continue to step 4

4. **<Fallback match>** — <match intent against fallback dispatch table>
   - If matched → <route to matched target>
   - If no match → continue to step 5

5. **<No match>** — Ask user to clarify

---

## Dispatch Tables

### Primary Dispatch

| Priority | Intent Pattern | Target | Confidence |
|----------|---------------|--------|------------|
| 1 | <pattern> | `<skill-id>` | High |
| 2 | <pattern> | `<skill-id>` | High |
| 3 | <pattern> | `<skill-id>` | Medium — confirm with user |

### Fallback Dispatch

| Intent Pattern | Target |
|---------------|--------|
| <broad pattern> | `<skill-id>` |

---

## Precedence Rules

Define what happens when multiple matches occur.

| Condition | Resolution |
|-----------|-----------|
| Multiple targets match with equal confidence | Present options to user, let them choose |
| Active state exists + new intent conflicts | Active state takes precedence unless user explicitly overrides |
| Explicit request by name/ID | Always wins, regardless of other rules |

---

## Resolution Logic

If this router resolves references (e.g., pipeline phases → domain skills), document the resolution algorithm here.

1. Look up `<key>` in `<table>` → get `<result>`
2. Validate `<result>` exists → if not, halt and report error
3. Route to `<result>`
```

---

## When to Use This Template

| Scenario | Use This? |
|----------|-----------|
| Router has a simple intent → skill table (< 10 rows, no precedence) | No — keep inline in SKILL.md |
| Router has multi-step decision logic | **Yes** |
| Router has precedence rules or conflict resolution | **Yes** |
| Router resolves references across registries | **Yes** |
| Multiple dispatch tables (primary + fallback) | **Yes** |
````
