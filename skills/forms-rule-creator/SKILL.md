---
name: forms-rule-creator
description: "Generates AEM Forms business rules from CONTENT_MODEL and a natural language rule intent. Produces { fd:rules, fd:events } ready for patching onto the form. Use when: creating show/hide, validate, calculate, event, or format rules for AEM Adaptive Form fields. Triggers: when, if, show when, hide when, required when, calculate, set value when, on click, on change, validate, dispatch event."
compatibility: "Requires Node.js. Scripts are pre-bundled in scripts/ — no npm install at runtime. Invoked by the forms-content-authoring orchestrator; not a standalone skill."
---

# forms-rule-creator Skill

Generate AEM Forms business rules from a CONTENT_MODEL (Sites Content API format) and a natural language prompt.
Produces `{ fd:rules, fd:events }` ready for insertion into the rule store.

> **Script paths:** Rule creator CLIs (`content-model-to-tree`, `validate-rule`, `generate-formula`, `validate-merge`, `parse-functions`) are in `$SKILL_DIR/skills/forms-rule-creator/scripts/`. Content-update scripts (`find-field`, `apply-rule-patch`, etc.) are in `$SKILL_DIR/skills/forms-content-author/forms-content-update/scripts/`. No `npm install` required.

## Inputs

Receives from `forms-content-update` (compound request) or from the orchestrator (pure rule request):

1. **CONTENT_MODEL** — post-patch content model from `get-aem-page-content`  
   For compound requests: use the model AFTER the field add has been confirmed, not the pre-patch model.
2. **field** — name of the field the rule targets (e.g. `phone`)
3. **capiKey** — AEM capi-key for the field (e.g. `"0:2:3"`)
4. **pointer** — JSON pointer for the field (e.g. `"/items/0/items/2/items/3"`)
5. **Prompt** — natural language description of the rule to create
6. **Custom functions JS** (optional) — file with `@name`-annotated function JSDoc

## Workflow

### Step 1: Determine STATEMENT type from prompt

Map the prompt intent to a STATEMENT type:

| Prompt intent | STATEMENT type | fd:* key |
|--------------|----------------|----------|
| When [event], then [action] | EVENT_SCRIPTS | `fd:click`, `fd:change`, `fd:init` |
| Calculate / set value of X using formula | CALC_EXPRESSION | `fd:calc` |
| Clear value of X | CLEAR_EXPRESSION | `fd:calc` |
| Validate X / make X required when Y | VALIDATE_EXPRESSION | `fd:validate` |
| Make X required when [condition] | VALIDATE_EXPRESSION | `fd:validate` — **NOT `fd:visible` or `fd:enabled`** |
| Format display of X | FORMAT_EXPRESSION | `fd:format` |
| Show X when [condition] | SHOW_EXPRESSION | `fd:visible` |
| Hide X when [condition] | VISIBLE_EXPRESSION | `fd:visible` |
| Enable X when [condition] | ACCESS_EXPRESSION | `fd:enabled` |
| Disable X when [condition] | DISABLE_EXPRESSION | `fd:enabled` |

### Step 2: Load grammar files

Look up the STATEMENT type in the matrix at the bottom and **Read each listed grammar file before Step 8**. Without these files the rule AST format is unknown and validate-rule will fail.

**Skip a file if its full content is already visible in this conversation's context** (i.e. you read it for an earlier rule in this session). Only Read files that are not yet in context.

Example for SHOW_EXPRESSION:
```
Read $SKILL_DIR/skills/forms-rule-creator/assets/grammar/visibility-expressions.md
Read $SKILL_DIR/skills/forms-rule-creator/assets/grammar/conditions.md
Read $SKILL_DIR/skills/forms-rule-creator/references/component-lookup.md
```

### Step 3: Load agent-kb articles

Look up the STATEMENT type in the matrix at the bottom and Read each listed article.

**Skip an article if its full content is already visible in this conversation's context.**

Example:
```
Read $SKILL_DIR/skills/forms-rule-creator/assets/agent-kb/05-rule-events-by-scenario.md
Read $SKILL_DIR/skills/forms-rule-creator/assets/agent-kb/06-rule-properties-by-field-type.md
```

### Step 4: Run `content-model-to-tree.bundle.js` → treeJson

Write the content model to `/tmp/content-model.json` first (using the `Write` tool), then pass it via `--content-model-file`. Do NOT pass large JSON inline — shell quoting fails on complex content models.

```bash
node $SKILL_DIR/skills/forms-rule-creator/scripts/content-model-to-tree.bundle.js \
  --content-model-file /tmp/content-model.json
# Output: { success: true, treeJson: {...} }
# Writes /tmp/treeJson.json automatically
```

The CONTENT_MODEL comes from `get-aem-page-content` (`response.data`). For compound requests, use the post-patch model. Steps 6, 9, and the apply-rule-patch workflow (§11 of forms-content-update) also reuse `/tmp/content-model.json`.

### Step 5: Run `parse-functions.bundle.js` (skip if no functions file)

```bash
node $SKILL_DIR/skills/forms-rule-creator/scripts/parse-functions.bundle.js <functions.js>
# Output: { success: true, customFunction: [...], imports: [...] }
```

Save `customFunction[]` to `/tmp/customFunctions.json` for subsequent tool calls.

### Step 6: Resolve component IDs — REQUIRES step 4 to have run first

> **Skip this step** if the orchestrator's Rule Authoring Flow step 1 already resolved all field IDs — use those `qualifiedId` values directly.

If not already resolved, extract all field names from the rule intent (e.g. `"show phone when country is US"` → `["phone", "country"]`) and pass CONTENT_MODEL **inline**:

```bash
node $SKILL_DIR/skills/forms-content-author/forms-content-update/scripts/find-field.bundle.js \
  --content-model '<CONTENT_MODEL_JSON>' \
  --names "phone,country"
# → [{ name, found, qualifiedId, type, displayName, capiKey, pointer }]
```

Use `qualifiedId` as the COMPONENT node `id` in the rule AST. Use `type` for scope validation.
If any field returns `found: false`: stop and ask the user to confirm the field name.

### Step 7: Write custom function if required

- Load `assets/agent-kb/12-custom-functions-authoring.md` + `assets/agent-kb/13-custom-function-helper-apis.md`
- Write the function following the JSDoc pattern defined there
- Store the function in `blocks/form/functions.js` (EDS repo root, i.e. `$FORMS_EDS_ROOT/blocks/form/functions.js`) — this is the only file AEM discovers custom functions from
- Re-run `parse-functions.bundle.js` on the updated file
- Re-save `/tmp/customFunctions.json`

### Step 8: Generate rule AST JSON

Using the grammar file(s) for the STATEMENT type, construct the rule AST. All COMPONENT nodes must be resolved from treeJson — never hand-constructed.

### Step 9: Validate — loop until `valid: true`

```bash
node $SKILL_DIR/skills/forms-rule-creator/scripts/validate-rule.bundle.js \
  /tmp/rule.json \
  --tree /tmp/treeJson.json \
  --functions /tmp/customFunctions.json \
  --storage-path <fd:key>
# Output: { valid: true, errors: [], warnings: [] }
# Exit code 0 = valid, 1 = invalid
```

Fix any errors using the `code` field and the grammar files, then re-validate.

### Step 10: Generate formula

```bash
node $SKILL_DIR/skills/forms-rule-creator/scripts/generate-formula.bundle.js \
  /tmp/rule.json \
  --tree /tmp/treeJson.json \
  --functions /tmp/customFunctions.json \
  --event <fd:key>
# Output: { success: true, formulaValid: true, fdRules: {...}, fdEvents: {...} }
```

### Step 11: Merge input and output

Only proceed when BOTH `valid: true` (Step 9) AND `formulaValid: true` (Step 10).

Merge the raw rule AST and compiled output from `generate-formula.bundle.js` into the final JCR properties:

**`fd:rules`** = raw rule AST merged with `fdRules`:
- Raw rule AST (e.g. `{ "fd:visible": ["<stringified JSON>"] }`) — stored so the rule editor can re-open the rule
- `fdRules` contains compiled expressions (e.g. `{ "visible": "<formula>" }`) — used by the AF runtime

**`fd:events`** = `fdEvents` directly (e.g. `{ "click": ["<script>"] }`)

Note: `fdRules`/`fdEvents` use camelCase because `fd:rules`/`fd:events` are not valid JS property shorthand (colon in the name).

### Step 11.5: Validate merge routing

Before outputting the result, validate that `fd:rules` and `fd:events` are correctly populated:

```bash
echo '{ "fd:rules": ..., "fd:events": ... }' > /tmp/merged-rule.json
node $SKILL_DIR/skills/forms-rule-creator/scripts/validate-merge.bundle.js /tmp/merged-rule.json
# Output (valid): { valid: true, errors: [], warnings: [], fdRulesNode: {...}, fdEventsNode: {...} }
# Output (invalid): { valid: false, errors: [...], warnings: [] }
# fdRulesNode / fdEventsNode are only present when the respective object is non-empty.
# Exit 0 = valid, Exit 1 = invalid
```

If `valid: false`, read each error's `code` and `fix` field and correct the merge:

| Error code | What went wrong | Fix |
|---|---|---|
| `EVENT_COMPILED_IN_FD_RULES` | Event compiled script is in `fd:rules["<key>"]` — must not be there | Remove `fd:rules["<key>"]`; move value to `fd:events["<key>"]` |
| `EVENT_MISSING_FROM_FD_EVENTS` | Event compiled script missing from `fd:events` | Set `fd:events["<key>"] = [compiled_script]` |
| `FD_EVENTS_VALUE_NOT_ARRAY` | `fd:events["<key>"]` is a string, not an array | Wrap in array: `fd:events["<key>"] = [value]` |
| `EXPRESSION_BARE_KEY_MISSING` | Compiled formula not in `fd:rules["<key>"]` | Set `fd:rules["<key>"] = compiled_formula_string` |
| `EXPRESSION_BARE_KEY_IS_ARRAY` | `fd:rules["<key>"]` is an array instead of formula string | Use `content[0]` as a string, not the array |
| `FD_KEY_NOT_ARRAY` | `fd:rules["fd:<key>"]` is not an array | Set `fd:rules["fd:<key>"] = [JSON.stringify(ruleAst)]` |
| `ORPHANED_BARE_KEY` | Bare key in `fd:rules` with no matching `fd:<key>` AST | Add `fd:rules["fd:<key>"]` or remove the orphaned key |

Re-run `validate-merge.bundle.js` after each fix until `valid: true`.

### Step 12: Output

Return the merged result to the orchestrator:
```json
{
  "fd:rules": { "fd:visible": ["<stringified rule JSON>"], "visible": "<compiled formula>" },
  "fd:events": {}
}
```

For event rules (`fd:click`, `fd:init`, etc.), `fd:rules` has only the raw AST entry and `fd:events` has the compiled scripts.

`forms-content-update §11` receives this output and handles patching onto AEM — it inspects the existing content model, decides `op`/`path`, and uses Node.js `JSON.stringify` to produce the encoded patch.

`forms-content-update §11` reads `fd:rules` and `fd:events` to build the respective child node properties, and only creates a separate `fd:events` child node when `fdEvents` is non-empty.

---

## Grammar + Agent KB Loading Matrix

| STATEMENT type | Load grammar files | Load agent-kb articles |
|----------------|--------------------|------------------------|
| EVENT_SCRIPTS (no condition) | `event-scripts.md`, `block-statements.md`, `component-lookup.md` | `05` always; `08` if FUNCTION_CALL; `13` if custom fn globals |
| EVENT_SCRIPTS (with condition) | + `conditions.md` | + `06`/`09` for property access in condition |
| CALC_EXPRESSION / CLEAR_EXPRESSION | `calc-expression.md`, `component-lookup.md` | `07`; `08` if OOTB function |
| VALIDATE_EXPRESSION | `validate-expression.md`, `conditions.md`, `component-lookup.md` | `06`, `09` |
| FORMAT_EXPRESSION | `format-expression.md`, `component-lookup.md` | `07` |
| SHOW_EXPRESSION / VISIBLE_EXPRESSION | `visibility-expressions.md`, `conditions.md`, `component-lookup.md` | `05` always; `06` for property conditions |
| ACCESS_EXPRESSION / DISABLE_EXPRESSION | `enabled-expressions.md`, `conditions.md`, `component-lookup.md` | `05` always; `06` for property conditions |
| Custom function needed | (any above) | `12`, `13` |
| Always | `tools-reference.md` | `05` |

**Rule:** Load the minimum set. Do NOT load all grammar files for every request.

---

## Constraints

- No mandatory Function Rule pattern — BLOCK_STATEMENTs used directly in EVENT_SCRIPTS
- COMPONENT nodes always resolved from treeJson — never hand-constructed
- Event names always confirmed against `assets/agent-kb/05-rule-events-by-scenario.md` — no guessing
- `validate-rule.bundle.js` must exit 0 before `generate-formula.bundle.js` runs
- `generate-formula.bundle.js` must return `formulaValid: true` before outputting result
- Output is `{ fd:rules, fd:events }` object only — no file writes
- CONTENT_MODEL for compound requests: always use post-patch model (after field confirmed present)
