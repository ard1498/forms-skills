---
name: forms-integration
description: >
  Domain router for API & data-integration skills. Routes user intents
  to the correct integration skill based on the operation requested.
type: domain
triggers:
  - API
  - FDM
  - sync APIs
  - add API
  - build client
  - OpenAPI
  - cURL
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# Integration — Domain Router

- **ID:** `integration`
- **Version:** 0.1
- **Description:** Routes API and data-integration intents to the appropriate skill. This router does not implement — it delegates.

---

## Routing Table

First match wins.

| Intent | Skill |
|--------|-------|
| Sync APIs from AEM FDM, discover APIs | `manage-apis` |
| Add new API definition, cURL → OpenAPI | `manage-apis` |
| Build / rebuild JS API clients | `manage-apis` |
| List / show API details | `manage-apis` |

> All integration intents currently route to `manage-apis`, which handles the full API lifecycle (sync, define, build, inspect).

---

## Skills

All skills owned by this domain.

| # | Skill | Purpose | Triggers |
|---|-------|---------|----------|
| 1 | `manage-apis` | Sync FDM, add API definitions, build JS clients | API, FDM, sync APIs, add API, build client, OpenAPI, cURL |

### Skill Locations

| Skill | Path |
|-------|------|
| `manage-apis` | [`references/manage-apis/SKILL.md`](references/manage-apis/SKILL.md) |

---

## Guard Policies

Guard policies are constraints that apply across all skills in this domain. They prevent unsafe or incorrect operations.

> **no-guessing-endpoints:** Never guess API endpoints or service URLs. Mark any unknowns as `TBD` and ask the user for the correct value.

> **staging-before-live:** API client files must be generated into the staging path (`refs/apis/api-clients/`) first, then promoted to the live path (`blocks/form/api-clients/`) only after validation.

---

## File Locations

Canonical paths for assets managed by skills in this domain.

| Asset | Path |
|-------|------|
| API clients (live) | `blocks/form/api-clients/` (in `$FORMS_EDS_ROOT`) |
| API clients (staging) | `refs/apis/api-clients/` |
| API definitions | `refs/apis/` |

---

## Dependencies

Other domains or skills that this domain's skills may delegate to or depend on.

| Dependency | Direction | Reason |
|------------|-----------|--------|
| `rule-creator` | `rule-creator` → This domain | Rule creator domain may call `manage-apis` when creating custom functions that need API clients |

---

## Plan Integration

How this domain participates in plan-driven execution.

| Plan Type | Skill(s) Invoked | Role |
|-----------|-------------------|------|
| Integration plans | `manage-apis` | Syncs API definitions, builds JS API clients, and wires up data integrations |

---

## Extending This Domain

### Adding a New Skill

1. Create the skill folder: `references/integration/references/<skill-name>/`
2. Add a `SKILL.md` inside the skill folder — this is the skill's entry point
3. Add the skill to the **Routing Table** above with its intent patterns
4. Add the skill to the **Skills** table and **Skill Locations** table above
5. Register the skill in the domain registry (`domains/SKILL.md`) — both the **Skills Catalog** and **Intent → Domain Routing** tables
6. If the skill manages new file types, add them to the **File Locations** table
7. If needed, add guard policies that apply to the new skill