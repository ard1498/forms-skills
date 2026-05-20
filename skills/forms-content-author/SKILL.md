---
name: forms-content-author
description: >
  Use when user wants to create, add, modify, delete, move, or read AEM
  Adaptive Form fields, panels, fragments, or form-level settings via the
  Sites Content MCP API.
  Triggers: create form, add field, add panel, add fragment, change property,
  delete field, move field, show fields, set required, rename, add options.
type: router
triggers:
  - create form
  - add field
  - add panel
  - add fragment
  - change property
  - delete field
  - move field
  - show fields
  - set required
  - rename
  - add options
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# Forms Content Author

Routes form authoring requests to the appropriate sub-skill based on intent.

---

## Sub-Skill Usage

`forms-content-update` and `forms-content-generate` are internal sub-skills — they are **not registered as top-level skills** and cannot be invoked via the `Skill` tool. They are loaded automatically when this skill loads — their SKILL.md content is already in context.

`forms-rule-creator` is a **registered top-level skill** — invoke it via the `Skill` tool.

**To follow an internal sub-skill:** read its instructions directly from context. Do NOT call the `Skill` tool for `forms-content-update` or `forms-content-generate`.

If an internal sub-skill's content is not in context, load it with the `Read` tool:
```
Read $SKILL_DIR/references/forms-content-update/SKILL.md
Read $SKILL_DIR/references/forms-content-generate/SKILL.md
```

---

## 0. MCP Check

Before anything, verify the Sites Content MCP tools are available (e.g. `get-aem-sites`; the configured server alias may vary, such as `aem-sites-content` or `sites-mcp`). If not, stop and show:

```
The forms-content-author skill requires the Sites Content MCP server.

Local AEM (localhost:4502):
  claude mcp add aem-sites-content -- node /tmp/aem-sites-contentapi-mcp-server/build/index.js
  Env: AEM_AUTHOR_URL=http://localhost:4502  AEM_AUTHOR_AUTH_PARAMETER=admin:admin  ASSETS_ACCESS_TOKEN=dummy

AEM as a Cloud Service:
  claude mcp add --transport http aem-sites-content https://mcp.adobeaemcloud.com/adobe/mcp/content
  Auth: IMS OAuth (browser login opens automatically)

Restart Claude Code after adding the MCP server.
```

---

## 0.5. Page Resolution

Before routing to any sub-skill, resolve the user's page reference to a `pageId`.

**Rules:**
- If the user gave **no path or pageId** at all → stop immediately and ask:
  > "Please provide the JCR path or pageId of the form you want to work on (e.g. `/content/forms/af/my-site/my-form`)."
  Do NOT call `get-aem-sites`, do NOT guess, do NOT proceed.
- If the user gave a **JCR path** (starts with `/`):
  ```
  get-aem-pages(publishPath: "<path>") → items[0].pageId → PAGE_ID
  ```
  If `items` is empty → **stop immediately**. Report: "No page found at path `<path>`. Please verify the path and try again."
  - Do NOT use the raw path as a `pageId`
  - Do NOT call `get-aem-page-content` or any other tool with the path
  - Do NOT call `get-aem-sites` to find alternatives
  - Do NOT proceed with any authoring action until the user provides a valid path
- If the user gave a **pageId** (does not start with `/`):
  ```
  PAGE_ID = <value as-is>
  ```

Store `PAGE_ID` and pass it to all sub-skill calls in place of any `pageId` argument. Never pass a raw path as `pageId` to `get-aem-page-content` or any other MCP tool.

Exception: `create-form` — the user provides a template source path/pageId, not a target. Resolution for `sourcePageId` is handled inside `forms-content-update` §3.

---

## 1. Intent Classification → Sub-Skill Routing

Classify the request, then invoke the appropriate sub-skill:

| Intent | Keywords | Sub-Skill |
|---|---|---|
| `create-form` | "create", "new form", "scaffold" | `forms-content-update` |
| `add-field` | "add", "insert", "put a", "I need a" | `forms-content-update` |
| `add-panel` | "add section", "add panel", "group these" | `forms-content-update` |
| `add-fragment` | "add fragment", "reusable section" | `forms-content-update` |
| `modify-property` | "change", "set", "update", "rename" (unconditional make-required with no condition) | `forms-content-update` |
| `delete-field` | "remove", "delete", "drop" | `forms-content-update` |
| `move-field` | "move", "reorder", "before", "after" | `forms-content-update` |
| `read-structure` | "show", "list", "what fields", "describe" | `forms-content-update` |
| `add-options` | "add options to", "choices for", "values for" | `forms-content-update` |
| `set-metadata` | "set title", "set submit action", "prefill", "schema" | `forms-content-update` |
| `add-rule` | "when", "if", "show/hide", "validate", "calculate", "required when", "make X required when" | `forms-rule-creator` |

`forms-content-generate` is not routed to directly — it is used internally by `forms-content-update` to construct and validate component payloads before AEM calls.

**Intent disambiguation — "make X required when Y":**
- `modify-property` (no condition) — "make address required" (always required, no condition) → set `required: true` via patch
- `add-rule` (with condition) — "make address required when full_name is filled" → VALIDATE_EXPRESSION → `fd:validate`. **Never use `fd:visible` or `fd:enabled` for this.**

**`add-field` — never ask for clarification:** When the user says "add [field type] field", proceed immediately. Use defaults for everything unspecified:
- `name`: snake_case from field type (e.g. "email field" → `email`, "phone number" → `phone_number`)
- `jcr:title`: Title Case from field type (e.g. "Email", "Phone Number")
- Position: end of the first panel (last item in root container)
- Properties: only required ones — nothing else

Do **not** ask about name, label, position, validation, placeholder, or any other detail unless explicitly provided.

**Compound requests** (e.g. "add a phone field and make it required when country is US"):
1. Add the field: `patch-aem-page-content`.
2. Re-fetch: `get-aem-page-content(pageId)` — get the **post-patch** CONTENT_MODEL. Never reuse the pre-patch model.
3. Run `find-field.bundle.js` with `--content-model '<POST_PATCH_CONTENT_MODEL>'` to get the rule target's `capiKey` + `pointer`.
4. You MUST write a text response containing exactly this block before making any further tool calls:
   ```
   RULE HANDOFF
   ────────────
   field:       <fieldName> (capiKey: <capiKey>, pointer: <pointer>)
   rule intent: <exact rule portion from user request>
   model:       post-patch
   ```
5. Proceed with **→ Rule Authoring Flow** (find-field already done — start at step 3).

**Pure `add-rule` requests** (rule only — no field add):
1. `get-aem-page-content(pageId)` → CONTENT_MODEL + eTag
2. Follow **→ Rule Authoring Flow** below from step 1.

Rule intent patterns: `when`, `if...then`, `show when`, `hide when`, `required when`, `calculate`, `set value when`, `on click`, `on change`, `dispatch event`

### Rule Authoring Flow

0. **Write content model to file first** — use the `Write` tool to save `response.data` from `get-aem-page-content` to `/tmp/content-model.json`. The value must be the object starting with `{"id":"jcr:content",...}` — NOT wrapped in `{"data":...}`. All find-field and transform-content-model calls in this workflow use `--content-model-file /tmp/content-model.json`.

1. Resolve ALL fields mentioned in the rule intent (target field + every referenced field) in one call (use `--content-model-file` — never pass large JSON inline):
   ```bash
   node $SKILL_DIR/references/forms-content-update/scripts/find-field.bundle.js \
     --content-model-file /tmp/content-model.json \
     --names "<targetField>,<refField1>,<refField2>,..."
   # → [{ name, qualifiedId, pointer, capiKey, ... }]
   ```
   Save: `pointer` of the **target field** (needed for apply-rule-patch in §11).
   Save: `qualifiedId` of **all fields** (passed to forms-rule-creator as pre-resolved IDs — skip its step 6).

2. Write this text response as a GATE before any forms-rule-creator steps:
   ```
   RULE HANDOFF
   ────────────
   target:      <targetField> (pointer: <pointer>)
   all fields:  <name>: <qualifiedId>, ...
   rule intent: <exact rule portion from user request>
   model:       current
   ```
3. `forms-rule-creator` builds the rule using the qualifiedIds from step 1 — **skip its step 6** (already resolved).
4. Use the `Write` tool to save the `{ fd:rules, fd:events }` output to `/tmp/merged-rule.json`.
5. Pass `{ pointer, eTag }` to `forms-content-update` → Apply Rule/Event Workflow (§11)

---

## 2. Batch Operations Rule

Always batch all ops for a single user request into **one** `patch-aem-page-content` call.

**MUST NOT** make separate patch calls per field. Build a single `ops` array containing all add/replace/remove operations, then call `patch-aem-page-content` once:
```json
[
  { "op": "add", "path": "/items/0/items/3", "value": { /* field 1 */ } },
  { "op": "add", "path": "/items/0/items/4", "value": { /* field 2 */ } }
]
```
Calling patch twice for two fields is always wrong — it wastes an eTag round-trip and risks a conflict on the second call.

Exceptions (the only cases requiring multiple patch calls):
- Move/reorder (remove + add require an eTag refresh between them — two round-trips are mandatory)
- Rule authoring after add-field (different operation type, handled by `forms-rule-creator`)

Each patch call increments the eTag and is applied atomically.

---

## Evals

Run deterministic script evals (no token needed):
```bash
node evals/scripts/run-evals.js
node evals/scripts/run-evals.js --filter find-field   # subset
```

Run LLM evals (Bedrock bearer token or `ANTHROPIC_API_KEY`):
```bash
# Bedrock
AWS_BEARER_TOKEN_BEDROCK=<token> AWS_REGION=us-east-1 node evals/scripts/run-llm-evals.js

# Direct Anthropic API
ANTHROPIC_API_KEY=<key> node evals/scripts/run-llm-evals.js

node evals/scripts/run-llm-evals.js --filter routing/01 --verbose  # single scenario
```
