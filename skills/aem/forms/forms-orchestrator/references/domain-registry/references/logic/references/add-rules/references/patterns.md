# Patterns & Rules — Form Rules

## Critical Rules

| Rule | Why |
|------|-----|
| **NEVER add unrequested behavior** | Only generate what user asked. Ask before adding else branches or extra validation. |
| **Use variables, not hidden fields** | `setVariable`/`getVariable` for intermediate data. Keeps form model clean. |
| **NEVER pass field references as function args** | Access fields via `globals.fragment.<fieldName>` inside the function body. The visual rule `params` array is always `[]`. |
| **NEVER use $parent references** | `$parent` doesn't resolve. Use events for cross-fragment communication (see below). |
| **No DOM access in custom functions** | Only `globals`/`scope` — never `document.querySelector`, `window`, or jQuery. |
| **Validate before saving** | Run `"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-validate" rule.json`. Fix errors before proceeding. |
| **Use template for rule JSON** | Always start from `templates/` — never write rule JSON from scratch. |

---

## Cross-Fragment Communication

When a rule in one fragment needs to affect fields in another fragment, use custom events. Events dispatched on `globals.form` are visible to the **entire form tree** — parent, siblings, and nested children.

**Pattern:**
- **Sender fragment:** Custom function dispatches event on `globals.form` with optional payload
- **Receiver fragment:** Rule listens for the custom event, calls its own custom function to act on its own fields

**Example:** Button click in `chooseall` fragment needs to show a panel in `accountselection` fragment:
1. `chooseall` rule on button click -> function dispatches `custom:bankSelected` with `{ bank: 'PRIMARY' }`
2. `accountselection` rule on wrapper panel listens for `custom:bankSelected` -> function shows/hides panels

This replaces `$parent` references entirely.

---

## Complex Requests

- **Multiple actions** -> One rule with multiple BLOCK_STATEMENTS (preferred over separate rules)
- **If/else** -> TRIGGER_EVENT_SCRIPTS with else block
- **Chained rules** -> First rule dispatches custom event, second rule listens

---

## Grammar Quick Reference

See [grammar-reference.md](grammar-reference.md) for full JSON structure, valid nodeNames, and trigger events.

**Source of truth:** `"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-grammar"`

**Key rules:** CONDITION needs `"nested": false`. Empty condition = `"choice": null`. Literal tokens = `"value": null`. FUNCTION_CALL uses `functionName` (object) + `params` (array).
