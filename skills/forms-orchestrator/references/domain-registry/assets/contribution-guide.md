---
name: domain-contribution-guide
description: >
  How to add new domains and skills to the domain registry.
---

# Domain Contribution Guide

## Domain Template

All domain router `SKILL.md` files must follow the standard domain template:

[`templates/domain-template.md`](templates/domain-template.md)

The template defines these required sections in order:

| # | Section | Purpose |
|---|---------|---------|
| 1 | YAML frontmatter | `name`, `description`, `type: domain`, `triggers`, `license`, `metadata` |
| 2 | `# <Name> — Domain Router` | Heading with ID, Version, Description |
| 3 | `## Routing Table` | Intent → skill mapping (first match wins) |
| 4 | `## Skills` | Numbered catalog of all skills + Skill Locations sub-table |
| 5 | `## Guard Policies` | Cross-skill constraints in blockquote format |
| 6 | `## File Locations` | Canonical paths for assets managed by this domain |
| 7 | `## Dependencies` | Cross-domain dependencies (omit if none) |
| 8 | `## Plan Integration` | Which plan types commonly invoke this domain's skills (omit if none) |
| 9 | `## Extending This Domain` | Instructions for adding new skills |

---

## Adding a New Domain

1. Copy the domain template from [`templates/domain-template.md`](templates/domain-template.md) to `references/<domain-name>/SKILL.md`
2. Fill in the YAML frontmatter — set `name`, `description`, and `triggers`
3. Fill in the routing table — one row per skill in the domain
4. Fill in the skills table — catalog every skill with its purpose and triggers
5. Define guard policies — constraints that prevent unsafe operations
6. Fill in file locations — canonical paths for assets this domain manages
7. Map cross-domain dependencies if any exist
8. Map plan types that commonly invoke skills in this domain
9. Create skill sub-folders under `references/<domain-name>/references/<skill-name>/`
10. Register the domain in the **Registry** table in the domain registry's [`SKILL.md`](../SKILL.md)
11. Register each skill in the **Skills Catalog** in [`assets/skills-catalog.md`](skills-catalog.md)
12. Add the domain's intent patterns to the **Intent → Domain Routing** table in [`assets/skills-catalog.md`](skills-catalog.md)

---

## Adding a New Skill to an Existing Domain

1. Create the skill folder under `references/<domain>/references/<skill-name>/`
2. Add a `SKILL.md` inside the skill folder
3. Update the domain's router `SKILL.md` — add the skill to **Routing Table**, **Skills**, and **Skill Locations** (per the [domain template](templates/domain-template.md))
4. Register the skill in the **Skills Catalog** in `assets/skills-catalog.md` with its triggers
5. Add the skill's intent patterns to the **Intent → Domain Routing** table in `assets/skills-catalog.md`

---

## Script References in SKILL.md

When a skill needs to invoke a CLI tool (e.g., `api-manager`, `rule-validate`, `api-skill`), follow these rules:

### Always use `${CLAUDE_PLUGIN_ROOT}`

```
"${CLAUDE_PLUGIN_ROOT}/skills/forms-shared/scripts/<tool-name>" <args>
"${CLAUDE_PLUGIN_ROOT}/skills/forms-rule-creator/scripts/<tool-name>" <args>
```

### Rules

| # | Rule |
|---|------|
| 1 | **Use `${CLAUDE_PLUGIN_ROOT}` for all script paths** — never construct paths from the skill's base directory. Claude Code injects a `Base directory for this skill:` header into each skill at runtime — this is for resolving skill-local files (`assets/`, `references/`), **not** for locating scripts. |
| 2 | **Always include the module name** — `${CLAUDE_PLUGIN_ROOT}` points to the plugin root (the directory containing `.claude-plugin/`). Scripts live in the owning module: `forms-shared/scripts/`, `forms-rule-creator/scripts/`. |
| 3 | **Never hardcode absolute paths** — no `/Users/...` or machine-specific paths in any SKILL.md. Use `${CLAUDE_PLUGIN_ROOT}` for plugin-relative paths and `<cwd>/<name>` style placeholders for documentation examples. |
| 4 | **Use relative paths only for skill-local assets** — files within the skill's own directory tree (e.g., `assets/`, `references/`) should use relative paths from the SKILL.md, not `${CLAUDE_PLUGIN_ROOT}`. |

### Example

```
# ✅ Correct — uses CLAUDE_PLUGIN_ROOT with module segment
"${CLAUDE_PLUGIN_ROOT}/skills/forms-shared/scripts/api-manager" list

# ❌ Wrong — missing module segment
"${CLAUDE_PLUGIN_ROOT}/scripts/api-manager" list

# ❌ Wrong — hardcoded absolute path
"/Users/alice/forms-skills/skills/forms-shared/scripts/api-manager" list

# ❌ Wrong — relative path from skill base directory
"../../../../../../scripts/api-manager" list
```
