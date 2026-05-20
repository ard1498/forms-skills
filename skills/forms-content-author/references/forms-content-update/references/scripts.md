# Script Reference

| Bundle | Location | Purpose | Exit codes |
|---|---|---|---|
| `validate-merge.bundle.js` | `forms-rule-creator/scripts/` | Validates merged `{ fd:rules, fd:events }` routing — checks expression vs event key placement. Returns `{ valid, errors, warnings }`. | 0=valid, 1=invalid |
| `filter-definition.bundle.js` | `forms-content-generate/scripts/` | Slim the definition to only requested component types. Use `--definition-file <path>` when MCP saved it to a file, or `--definition <json>` inline. Run before validate-patch and before passing to forms-content-generate. | 0=ok, 2=bad args |
| `validate-patch.bundle.js` | `forms-content-update/scripts/` | Type-check replace ops against definition | 0=valid, 1=errors, 2=bad args |
| `apply-rule-patch.bundle.js` | `forms-content-update/scripts/` | Build JSON Patch ops for fd:rules/fd:events from merged-rule + find-field result. Full properties replace (not per-key). | 0=ok, 1=error, 2=bad args |
| `find-field.bundle.js` | `forms-content-update/scripts/` | Find field/panel by name → capiKey + pointer + qualifiedId + type. Supports `--name` (single) and `--names "a,b"` (multi) | 0=found, 1=not found |
| `find-rule-refs.bundle.js` | `forms-content-update/scripts/` | Scan content model for fd:rules ASTs referencing a qualifiedId → `{ refs, total }` | 0=success |
| `rewrite-rule-refs.bundle.js` | `forms-content-update/scripts/` | Rewrite COMPONENT refs old→new in rule ASTs → `[{ fieldName, capiKey, fdKey, rewrittenAst }]` | 0=success |
| `resolve-insert-position.bundle.js` | `forms-content-update/scripts/` | Returns insert index in panel (before submit or append) | 0=ok, 1=panel not found |
| `list-form-fields.bundle.js` | `forms-content-update/scripts/` | Flat list of all fields with depth, pointer, componentType | always 0 |

**capi-key → JSON Pointer:** `"0:2:4"` → `/items/0/items/2/items/4`
Property pointer: append `/properties/<propName>`
