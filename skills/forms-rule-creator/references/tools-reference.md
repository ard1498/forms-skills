# CLI Tools Reference

All tools are pre-bundled in `$SKILL_DIR/scripts/`. Run with `node $SKILL_DIR/scripts/<name>.jsh` (Node.js) or `<name>` (SLICC — auto-discovered as commands). No `npm install` required.

All tools write JSON to stdout and exit non-zero on failure.

---

## `transform-jcr`

Converts a raw JCR export to treeJson used by all other tools.

```bash
node $SKILL_DIR/scripts/transform-jcr.jsh <jcr.json>
node $SKILL_DIR/scripts/transform-jcr.jsh --stdin
```

**Output (success):**
```json
{ "success": true, "treeJson": { "id": "$form", "items": [...] }, "outputPath": "/tmp/treeJson.json" }
```

**Output (failure):**
```json
{ "success": false, "error": "..." }
```

**Exit code:** 0 on success, 1 on failure.

---

## `transform-content-model`

Converts a Sites Content API content model to treeJson.

```bash
node $SKILL_DIR/scripts/transform-content-model.jsh <content-model.json>
node $SKILL_DIR/scripts/transform-content-model.jsh --content-model-file <path>
node $SKILL_DIR/scripts/transform-content-model.jsh --stdin
```

**Output (success):**
```json
{ "success": true, "treeJson": { "id": "$form", "items": [...] }, "outputPath": "/tmp/treeJson.json" }
```

**Output (failure):**
```json
{ "success": false, "error": "..." }
```

**Exit code:** 0 on success, 1 on failure.

---

## `parse-functions`

Parses a custom functions JS file into a structured array.

```bash
node $SKILL_DIR/scripts/parse-functions.jsh <functions.js>
node $SKILL_DIR/scripts/parse-functions.jsh --stdin
```

**Output (success):**
```json
{
  "success": true,
  "customFunction": [
    { "name": "myFn", "id": "myFn", "args": [...] }
  ],
  "imports": ["import something from './module.js';"]
}
```

**Output (failure):**
```json
{ "success": false, "error": "..." }
```

**Exit code:** 0 on success, 1 on failure.

---

## `find-field`

Looks up one or more fields in a treeJson scope tree. Matches against `name`, `displayName` (case-insensitive), `path`, or qualified `id` — tried in that order.

```bash
node $SKILL_DIR/scripts/find-field.jsh --tree <treeJson.json> --name <value>
node $SKILL_DIR/scripts/find-field.jsh --tree <treeJson.json> --names <v1,v2,...>
```

**Output (single, found):**
```json
{ "found": true, "qualifiedId": "$form.textfield1", "name": "textfield1", "displayName": "Full Name", "type": "AFCOMPONENT|FIELD|TEXT FIELD|STRING", "fieldType": "text-input", "isPanel": false }
```

**Output (single, not found):**
```json
{ "found": false, "name": "Full Name" }
```

**Output (multi):**
```json
[{ "name": "Full Name", "found": true, "qualifiedId": "$form.textfield1", ... }, ...]
```

**Exit code:** 0 = found (all found for multi), 1 = not found, 2 = bad args.

---

## `validate-rule`

Validates a rule AST object against the grammar and scope.

```bash
node $SKILL_DIR/scripts/validate-rule.jsh <rule.json> --tree <treeJson.json> \
  [--functions <cf.json>] [--storage-path <fd:calc>] [--toggles <toggles.json>]
```

- `<rule.json>` — file containing the rule AST (`nodeName: 'ROOT'`)
- `--tree` — treeJson from `transform-jcr` or `transform-content-model`
- `--functions` — `.customFunction` array from `parse-functions` output
- `--storage-path` — fd:* key for context validation (e.g. `fd:calc` rejects EVENT_SCRIPTS)
- `--toggles` — JSON object of feature toggle overrides

**Output (valid):**
```json
{ "valid": true, "errors": [], "warnings": [] }
```

**Output (invalid):**
```json
{
  "valid": false,
  "errors": [
    {
      "code": "GRAMMAR_SEQUENCE_MISMATCH",
      "path": "$.items[0].choice.items",
      "message": "...",
      "alternatives": ["COMPONENT", "to", "EXPRESSION"]
    }
  ],
  "warnings": []
}
```

**Error codes:**
- `GRAMMAR_SEQUENCE_MISMATCH` — wrong number or order of items in a sequence node
- `GRAMMAR_NODE_INVALID` — node is not an object
- `GRAMMAR_NODE_NAME_MISSING` — node lacks `nodeName`
- `GRAMMAR_MODEL_MISMATCH` — sequence node uses `choice` or vice versa
- `SEMANTIC_FUNCTION_UNKNOWN` — function not in scope; `available[]` lists known functions
- `SEMANTIC_FUNCTION_ARITY_MISMATCH` — wrong number of params
- `SEMANTIC_MEMBER_COMPONENT_UNKNOWN` — component ID not found in treeJson
- `SEMANTIC_MEMBER_PROPERTY_INVALID` — property not valid for that field type; `available[]` lists valid ones
- `CONTEXT_STATEMENT_MISMATCH` — STATEMENT type not allowed in this fd:* context

**Exit code:** 0 if valid, 1 if invalid.

---

## `generate-formula`

Transforms a rule AST to `fd:rules` + `fd:events` and validates the formula.

```bash
node $SKILL_DIR/scripts/generate-formula.jsh <rule.json> --tree <treeJson.json> \
  [--functions <cf.json>] [--event <fd:click>] [--toggles <toggles.json>]
```

- `--event` — fd:* key override (inferred from `ruleJson.eventName` or STATEMENT type if omitted)

**Output (success):**
```json
{
  "success": true,
  "input": { "fd:click": ["{...ruleJson stringified}"] },
  "fdEvents": { "click": ["submitForm()"] },
  "fdRules": {},
  "formulaValid": true
}
```

**Output (failure):**
```json
{ "success": false, "error": "...", "formulaValid": false }
```

**Exit code:** 0 on success, 1 on failure.

---

## `merge-formula`

Merges a `generate-formula` output into a `{ "fd:rules": {...}, "fd:events": {...} }` object ready for insertion into the rule store.

```bash
node $SKILL_DIR/scripts/merge-formula.jsh <generate-formula-output.json>
```

**Output:**
```json
{ "fd:rules": { "fd:calc": ["...formula..."] }, "fd:events": {} }
```

**Exit code:** 0 on success, 1 on error.
