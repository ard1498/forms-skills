---
name: directory-structure
description: >
  Standard directory layout conventions for multi-skill systems.
  Covers flat, grouped, and deep skill trees with type annotations.
type: guidelines
---

# Skill Directory Structure

How to organize a skill tree's files and folders. Follows the [agentskills.io specification](https://agentskills.io) for per-skill layout, with conventions for multi-skill composition.

Every SKILL.md and asset file declares a `type` — see the [Skill Architecture Guide](README.md) for the full type reference.

---

## Per-Skill Layout (agentskills.io standard)

Every skill is a directory with at minimum a `SKILL.md`:

```
<skill-name>/
├── SKILL.md              # type: skill | router | domain | pipeline
├── references/           # Sub-skills or reference docs
│   ├── <sub-skill>/
│   │   └── SKILL.md      # type: skill | router | domain
│   └── <reference>.md
├── assets/               # Static resources, offloaded content
│   ├── guidelines.md     # type: guidelines
│   ├── routing-table.md  # type: routing-table
│   └── templates/
│       └── <template>.md
├── scripts/              # Executable code
│   └── <script>.sh
└── eval/                 # Test fixtures and evaluation plans
    ├── eval-plan.md
    └── fixtures/
```

**Rules:**
- `name` in SKILL.md frontmatter **must match** the directory name
- `type` in SKILL.md frontmatter **must match** the skill's role (see below)
- SKILL.md body should be **under 500 lines / 5,000 tokens** (routers: under 100 lines)
- Use relative paths for all file references

---

## Type by Layer

In a multi-layer skill tree, each layer uses specific types:

```
Level 0 (entry point)     → type: router       (orchestrator / gateway)
Level 1 (registries)      → type: router       (pipeline registry, domain registry)
Level 2 (grouping)        → type: domain        (domain routers)
                          → type: pipeline      (workflow definitions)
Level 3 (implementation)  → type: skill         (leaf skills — do the work)

Supporting files at any level:
  assets/routing-table.md → type: routing-table
  assets/guidelines.md    → type: guidelines
```

| Level | Type | Routing? | Implementation? | Max Lines |
|-------|------|----------|-----------------|-----------|
| 0 | `router` | Yes | No | 100 |
| 1 | `router` | Yes | No | 100 |
| 2 | `domain` | Yes | No | 100 |
| 2 | `pipeline` | Yes (phases) | No | No limit (workflow spec) |
| 3 | `skill` | No | Yes | 500 |
| Any | `routing-table` | N/A | N/A | No limit |
| Any | `guidelines` | N/A | N/A | No limit |

---

## Flat Layout (1–4 skills)

All skills are `type: skill`. No router needed:

```
my-skill-tree/
├── .claude-plugin/
│   └── plugin.json
└── skills/
    ├── skill-a/
    │   └── SKILL.md          # type: skill
    ├── skill-b/
    │   └── SKILL.md          # type: skill
    └── skill-c/
        └── SKILL.md          # type: skill
```

Each skill is standalone and triggered independently by its `description` field.

---

## Grouped Layout (5–10 skills)

Add a `type: router` at the top that dispatches to `type: skill` leaves:

```
my-skill-tree/
├── .claude-plugin/
│   └── plugin.json
└── skills/
    └── <orchestrator>/
        ├── SKILL.md              # type: router — dispatches to sub-skills
        ├── assets/
        │   ├── routing-table.md  # type: routing-table (if routing is complex)
        │   └── guidelines.md     # type: guidelines (if cross-cutting rules exist)
        └── references/
            ├── skill-a/
            │   └── SKILL.md      # type: skill
            ├── skill-b/
            │   └── SKILL.md      # type: skill
            └── skill-c/
                └── SKILL.md      # type: skill
```

The `type: router` SKILL.md is lean (< 100 lines) and links to `assets/` for details.

---

## Deep Layout (10+ skills, multi-phase workflows)

The full type stack: `router` → `router` (registries) → `domain` + `pipeline` → `skill`:

```
my-skill-tree/
├── .claude-plugin/
│   └── plugin.json
└── skills/
    └── <orchestrator>/
        ├── SKILL.md                          # type: router (gateway)
        ├── assets/
        │   ├── routing-table.md              # type: routing-table
        │   └── guidelines.md                 # type: guidelines
        │
        ├── references/
        │   ├── <pipeline-registry>/
        │   │   ├── SKILL.md                  # type: router (registry)
        │   │   ├── assets/
        │   │   │   ├── selection-rules.md    # type: routing-table
        │   │   │   ├── contribution-guide.md
        │   │   │   └── templates/
        │   │   │       └── pipeline-template.md  # type: pipeline (template)
        │   │   └── references/
        │   │       └── <workflow>.md          # type: pipeline (definition)
        │   │
        │   └── <domain-registry>/
        │       ├── SKILL.md                  # type: router (registry)
        │       ├── assets/
        │       │   ├── skills-catalog.md
        │       │   ├── contribution-guide.md
        │       │   └── templates/
        │       │       └── domain-template.md  # produces type: domain
        │       └── references/
        │           ├── <domain-a>/
        │           │   ├── SKILL.md          # type: domain
        │           │   └── references/
        │           │       ├── <skill-1>/
        │           │       │   └── SKILL.md  # type: skill (leaf)
        │           │       └── <skill-2>/
        │           │           └── SKILL.md  # type: skill (leaf)
        │           └── <domain-b>/
        │               ├── SKILL.md          # type: domain
        │               └── references/
        │                   └── ...           # type: skill (leaves)
        ├── scripts/
        └── bin/
```

---

## Convention Summary

| Convention | Rule |
|------------|------|
| **`type` field** | Every SKILL.md and typed asset file must declare `type` in frontmatter. |
| **`type: router`** | < 100 lines. Route only, never implement. |
| **`type: domain`** | < 100 lines. Route only, never implement. Groups related skills. |
| **`type: pipeline`** | Workflow definition. Phases delegate to domains — never implements directly. |
| **`type: skill`** | < 500 lines / 5,000 tokens. Does the actual work. |
| **`type: routing-table`** | Asset file. Routing algorithm offloaded from a router. |
| **`type: guidelines`** | Asset file. Cross-cutting constraints for multiple skills. |
| **`references/`** | Sub-skills (folders with SKILL.md) or reference docs. |
| **`assets/`** | Offloaded content: `routing-table`, `guidelines`, templates, catalogs. |
| **`assets/templates/`** | Templates for creating new items. Each template prescribes a fixed `type`. |
| **`scripts/`** | Executable code. Self-contained, with error handling. |
| **`eval/`** | Test plans and fixtures for evaluating skill quality. |
| **Directory name = `name` field** | Always. No exceptions. |

---

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Missing `type` in frontmatter | Contributors can't tell what the file does without reading it | Add `type` — it's required |
| `type: router` with > 100 lines | Loaded on every routing decision, wastes tokens | Offload to `type: routing-table` and `type: guidelines` assets |
| `type: skill` that also routes to sub-skills | Violates single-responsibility, bloats the file | Split into `type: router` + `type: skill` |
| `type: domain` that implements logic | Domains are routers — they dispatch, not implement | Move implementation to a `type: skill` leaf |
| Deeply nested references (3+ levels) | Hard to discover, slow to navigate | Flatten or use registries (`type: router`) |
| Guidelines duplicated across skills | Drift, contradictions | Consolidate in `type: guidelines` asset at parent level |
| `resources/` instead of `references/` + `assets/` | Non-standard naming, confuses the discovery model | Rename to standard directories |
| Template without a fixed `type` | Users don't know what type the output file should be | Every template must prescribe a fixed `type` |