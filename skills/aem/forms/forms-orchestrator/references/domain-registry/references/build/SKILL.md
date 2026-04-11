---
name: build
description: Domain router for form structure & component skills
type: domain
triggers:
  - create form
  - add field
  - add panel
  - scaffold
  - fragment
  - layout
  - custom component
  - viewType
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# Build — Domain Router

| | |
|---|---|
| **ID** | `build` |
| **Version** | 0.1 |
| **Description** | Routes form-building intents to the correct skill — scaffolding, form creation/modification, and custom component development. |

## Routing Table

> **First match wins.**

| Intent Pattern | Skill |
|---|---|
| Scaffold new empty form, bootstrap form template | `scaffold-form` |
| Create / modify form JSON, add field, add panel, add fragment, layout | `create-form` |
| Custom component, extend OOTB field type, custom viewType | `create-component` |

## Skills

| # | Skill | Purpose | Triggers |
|---|---|---|---|
| 1 | `scaffold-form` | Bootstrap a new empty form template | scaffold, bootstrap form, new form template |
| 2 | `create-form` | Create / modify form JSON — fields, panels, fragments | create form, add field, add panel, fragment, layout |
| 3 | `create-component` | Build custom components / extend OOTB field types | custom component, viewType, extend field type |

### Skill Locations

| Skill | Path |
|---|---|
| `scaffold-form` | `skills/aem/forms/skills/references/domains/references/build/scaffold-form/` |
| `create-form` | `skills/aem/forms/skills/references/domains/references/build/create-form/` |
| `create-component` | `skills/aem/forms/skills/references/domains/references/build/create-component/` |

## Guard Policies

> Never hand-write `form.json` from scratch.
>
> Fields/panels → `create-form`.
> Empty forms → `scaffold-form`.
> Custom components → `create-component`.

## File Locations

| Asset | Canonical Path |
|---|---|
| Forms | `repo/content/forms/af/<team>/<path>/<name>.form.json` |
| Rule stores | `repo/content/forms/af/<team>/<path>/<name>.rule.json` |
| Custom components | `code/components/<view-type>/` |

## Dependencies

| Domain | Relationship |
|---|---|
| **analysis** | Consumes `Screen.md` artifacts as input for form creation |
| **logic** | Rules are applied to forms created by build skills |

## Plan Integration

How this domain participates in plan-driven execution.

| Plan Type | Skill(s) Invoked | Role |
|-----------|-------------------|------|
| Structure plans | `scaffold-form`, `create-form` | Scaffolds new forms and generates/modifies form JSON from analyzed requirements |
| Workflow plans | `create-form`, `create-component` | Adds panels/fields for workflow screens and builds custom components for non-standard field types |

## Extending This Domain

1. **Create the skill folder** under this domain's directory with a `SKILL.md` and any supporting assets.
2. **Register the skill** by adding a row to the *Skills* table and the *Skill Locations* sub-table above.
3. **Add a routing entry** in the *Routing Table* — place it in priority order (first match wins).
4. **Update Guard Policies** if the new skill introduces constraints that other skills must respect.
5. **Update triggers** in the YAML front-matter so the domain router can match new intents.