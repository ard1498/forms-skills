---
name: skill-architecture
description: >
  Architectural patterns and templates for building multi-skill systems.
  Extends the agentskills.io specification with patterns for skill routers,
  routing tables, guidelines, and directory structure conventions.
---

# Skill Architecture Guide

This guide defines **architectural patterns** for organizing complex multi-skill systems. It extends the [agentskills.io specification](https://agentskills.io) — which defines the per-skill format (`SKILL.md`, `scripts/`, `references/`, `assets/`) — with patterns for composing skills into larger systems.

> **When do you need this?** If your skill tree has 5+ skills and any form of routing, orchestration, or phased execution, these patterns will help you keep it consistent, lean, and maintainable.

---

## Skill Types

Every SKILL.md and asset file declares a `type` in its frontmatter. The type is the single most important field — it tells contributors and agents what role this file plays without reading the body.

### SKILL.md Types

These types apply to SKILL.md files — the nodes in a skill tree.

| Type | Role | Routes? | Implements? | Template |
|------|------|---------|-------------|----------|
| `router` | Top-level gateway that dispatches to sub-skills, registries, or other routers | Yes | No | [skill-router-template.md](skill-router-template.md) |
| `domain` | Groups related skills under a named domain, routes intents to leaf skills | Yes | No | Specialization — e.g., domain-template.md |
| `pipeline` | Defines a multi-phase workflow as a directed graph of phases | Yes (phases) | No | Specialization — e.g., pipeline-template.md |
| `skill` | Leaf node that does actual implementation work | No | Yes | *(none — leaf skills are freeform per agentskills.io)* |

**Key rules:**
- Every SKILL.md **must** have exactly one `type`
- `router` and `domain` types never implement — they dispatch only
- `pipeline` types define phase graphs but don't implement phases — they delegate to domains
- Only `type: skill` files do real work (create files, run scripts, modify code)
- The `type` field goes right after `description` in the frontmatter

### Asset File Types

These types apply to asset files (`.md` files in `assets/`) — supporting documents offloaded from routers.

| Type | Role | Lives In | Template |
|------|------|----------|----------|
| `routing-table` | Routing algorithm offloaded from a router SKILL.md | `assets/routing-table.md` | [routing-table-template.md](routing-table-template.md) |
| `guidelines` | Cross-cutting constraints shared across multiple skills | `assets/guidelines.md` | [guidelines-template.md](guidelines-template.md) |

Asset files are loaded on demand — they don't consume tokens until explicitly referenced.

### Frontmatter Examples

A leaf skill:
```
---
name: add-rules
description: >
  Add business rules to AEM Adaptive Forms.
type: skill
license: Apache-2.0
---
```

A router:
```
---
name: forms-orchestrator
description: >
  Skill Gateway for AEM Forms. Routes to pipelines and domains.
type: router
license: Apache-2.0
---
```

A domain:
```
---
name: analysis
description: >
  Domain router for analysis & documentation skills.
type: domain
license: Apache-2.0
---
```

A pipeline:
```
---
name: build-journey
description: >
  End-to-end pipeline: requirements → analysis → build → deploy.
type: pipeline
license: Apache-2.0
---
```

---

## Architectural Layers

A complex skill system stacks types in layers, from top to bottom:

```
┌─────────────────────────────────────┐
│  type: router                        │  ← entry point, pure dispatcher
│  (orchestrator / gateway)            │
└──────────────────┬──────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────┐    ┌──────────────┐
│ type: router  │    │ type: router  │  ← registries (pipeline registry,
│ (registries)  │    │ (registries)  │    domain registry)
└──────┬───────┘    └──────┬───────┘
       │                   │
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ type: pipeline│    │ type: domain  │  ← workflow graphs / skill containers
│ (phase DAGs)  │    │ (domain       │
│               │    │  routers)     │
└──────┬───────┘    └──────┬───────┘
       │                   │
       ▼                   ▼
┌──────────────────────────────────────┐
│  type: skill                          │  ← leaf nodes — do the actual work
│  (implementation)                     │
└──────────────────────────────────────┘

Supporting files (loaded on demand):
  type: routing-table  → assets/routing-table.md
  type: guidelines     → assets/guidelines.md
```

Not every skill tree needs all layers. Use what fits:

| Complexity | Recommended Types |
|------------|-------------------|
| 1–4 skills | `skill` only — flat, no routing needed |
| 5–10 skills | One `router` at the top + `skill` leaves |
| 10–20 skills | `router` → `domain` → `skill` (group skills into domains) |
| 20+ skills or phased workflows | `router` → `router` (registries) → `pipeline` + `domain` → `skill` |

---

## Templates

Each type has a corresponding template that defines the required sections and structure.

| Template | Produces Type | Purpose |
|----------|--------------|---------|
| [**Skill Router Template**](skill-router-template.md) | `router` | SKILL.md for any generic dispatcher (orchestrator, registry) |
| [**Routing Table Template**](routing-table-template.md) | `routing-table` | Asset file for routing logic offloaded from a router |
| [**Guidelines Template**](guidelines-template.md) | `guidelines` | Asset file for cross-cutting constraints |
| [**Directory Structure**](directory-structure.md) | *(layout guide)* | Standard directory layout for all types |

Skill trees may also define **specialized templates** that extend the generic router template for specific types:

| Specialization | Produces Type | Defined By | Location |
|---------------|--------------|-----------|----------|
| Domain Router Template | `domain` | `aem/forms` | `domains/assets/templates/domain-template.md` |
| Pipeline Template | `pipeline` | `aem/forms` | `pipelines/assets/templates/pipeline-template.md` |

> **Leaf skills** (`type: skill`) don't need a template — they follow the freeform [agentskills.io](https://agentskills.io) format. Keep them under 500 lines / 5,000 tokens.

---

## Key Principles

### 1. Routers are lean

Router SKILL.md files (`type: router`, `type: domain`) should be **under 100 lines**. They contain:
- YAML frontmatter (with `type`)
- A routing diagram or table (the core dispatch logic)
- Links to `assets/` files for everything else

Heavy content goes into typed asset files:
- Routing algorithms → `assets/routing-table.md` (`type: routing-table`)
- Constraints & conventions → `assets/guidelines.md` (`type: guidelines`)
- Contribution guides → `assets/contribution-guide.md`
- Templates → `assets/templates/`

### 2. Progressive disclosure

Following the agentskills.io principle, skills load in layers:

| Layer | Loaded | Token budget |
|-------|--------|-------------|
| `name` + `description` + `type` (frontmatter) | At startup, for all skills | ~100 tokens |
| SKILL.md body (instructions) | When skill is activated | < 5,000 tokens |
| `references/`, `assets/`, `scripts/` | On demand during execution | As needed |

This is why routers stay lean — they're loaded on every routing decision. Asset files (`type: routing-table`, `type: guidelines`) are loaded only when their content is needed.

### 3. Consistent directory conventions

| Directory | Purpose | Contains Types |
|-----------|---------|---------------|
| `references/` | Sub-skills or reference documentation | `router`, `domain`, `pipeline`, `skill` |
| `assets/` | Static resources offloaded from SKILL.md | `routing-table`, `guidelines`, templates, catalogs |
| `scripts/` | Executable code (bash, python, JS) | N/A |

### 4. Naming

- Directory names = `name` field in frontmatter (per agentskills.io spec)
- Lowercase, hyphens only: `analyze-requirements`, `build-journey`
- Router SKILL.md headings include their role: `# <Name> — Domain Router`, `# <Name> — Pipeline Registry`

---

## Type Relationships

How the types interact in a running system:

```
User Intent
     │
     ▼
[type: router]  ←── reads [type: routing-table] to decide
     │
     ├──→ matches a pipeline? ──→ [type: pipeline] defines phases
     │         │                        │
     │         │                  each phase declares
     │         │                  domain + skill
     │         │                        │
     │         ▼                        ▼
     ├──→ [type: router]  ←── registry resolves domain/skill
     │         │
     │         ▼
     └──→ [type: domain]  ←── reads [type: guidelines] for constraints
               │
               ▼
         [type: skill]    ←── does the actual work
```

| From | To | Relationship |
|------|----|-------------|
| `router` | `router` | Dispatches to sub-routers (registries) |
| `router` | `domain` | Routes intents directly to a domain |
| `router` | `pipeline` | Selects a pipeline for multi-phase workflows |
| `pipeline` | `domain` | Each phase declares a domain + skill |
| `domain` | `skill` | Routes to the leaf skill that implements |
| `router` / `domain` | `routing-table` | Reads routing logic (asset, loaded on demand) |
| `router` / `domain` | `guidelines` | Reads constraints (asset, loaded on demand) |

---

## Getting Started

1. **New skill tree?** Start with [Directory Structure](directory-structure.md) to set up the layout.
2. **Need a dispatcher?** Use the [Skill Router Template](skill-router-template.md) — produces `type: router`.
3. **Router getting long?** Offload routing logic to a [Routing Table](routing-table-template.md) (`type: routing-table`) and constraints to a [Guidelines](guidelines-template.md) file (`type: guidelines`).
4. **Need to group skills?** Create domain routers (`type: domain`) — use a domain template if your skill tree has one, or adapt the generic router template.
5. **Need multi-phase workflows?** Create pipeline definitions (`type: pipeline`) — use a pipeline template if your skill tree has one.
6. **Building a leaf skill?** Just follow [agentskills.io](https://agentskills.io) — set `type: skill` and keep it under 500 lines.