---
name: forms-integration
description: >
  Use when user wants to manage API definitions, add FDMs, build API clients,
  or wire external data sources to a form.
  Triggers: API, FDM, sync APIs, add API, build client, OpenAPI, cURL.
type: router
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

Routes API and data-integration intents to the appropriate skill. This router does not implement — it delegates.

---

## Routing Table

First match wins.

| Intent | Skill |
|--------|-------|
| Sync APIs from AEM FDM, discover APIs | `manage-apis` |
| Add new API definition, cURL → OpenAPI | `manage-apis` |
| Build / rebuild JS API clients | `manage-apis` |
| List / show API details | `manage-apis` |

## Skills

All skills owned by this domain.

| # | Skill | Path | Purpose | Triggers |
|---|-------|------|---------|----------|
| 1 | `manage-apis` | [`references/manage-apis/SKILL.md`](references/manage-apis/SKILL.md) | Sync FDM, add API definitions, build JS clients | API, FDM, sync APIs, add API, build client, OpenAPI, cURL |

## Guard Policies

| Policy | Rule |
|--------|------|
| `no-guessing-endpoints` | Never guess API endpoints or service URLs. Mark any unknowns as `TBD` and ask the user for the correct value. |
| `staging-before-live` | API client files must be generated into the staging path (`refs/apis/generated/api-clients/`) first, then promoted to the live path (`blocks/form/api-clients/`) only after validation. |

## File Locations

| Asset | Path |
|-------|------|
| API clients (live) | `blocks/form/api-clients/` (in `$FORMS_EDS_ROOT`) |
| API clients (staging) | `refs/apis/generated/api-clients/` |
| API definitions | `refs/apis/` |

## Dependencies

| Dependency | Direction | Reason |
|------------|-----------|--------|
| `rule-creator` | `rule-creator` → This domain | Rule creator domain may call `manage-apis` when creating custom functions that need API clients |

## Plan Integration

How this domain participates in plan-driven execution.

| Plan Type | Skill(s) Invoked | Role |
|-----------|-------------------|------|
| Integration plans | `manage-apis` | Syncs API definitions, builds JS API clients, and wires up data integrations |

## Extending This Domain

### Adding a New Skill

- Create `references/integration/references/<skill-name>/SKILL.md` as the skill's entry point
- Add the skill to the **Routing Table** and merged **Skills** table above
- Register the skill in the domain registry (`skills/forms-orchestrator/references/domain-registry/SKILL.md`)
- If the skill manages new file types or needs guard policies, add rows to the relevant tables above
