---
name: add-rules
description: >
  ENTRY POINT for all AEM Forms business logic. Implements visibility, validation,
  value computation, navigation, custom functions, events, and more. Routes to
  appropriate rule types. Use for show/hide, validate, set value, enable/disable,
  calculate, navigate, dispatch event, submit, and any business logic.
  Triggers: show/hide, validate, set value, enable/disable, calculate, business logic,
  form rules, navigate, dispatch event, submit.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Form Rules — Workflow

Every rule has two parts: a **custom function** (THEN logic) and a **visual rule** (FUNCTION_CALL trigger).

Before starting, read [references/patterns.md](references/patterns.md) for critical rules and cross-fragment patterns.

---

### Step 1: Understand Requirements

Parse requirements into discrete rules from Screen.md, business-logic-spec.md, or direct prompts.

### Step 2: Analyze Form Context

```bash
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-transform" <form>.form.json
cat <form>.rule.json | jq '.[] | select(.componentName == "<fieldName>")'
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/parse-functions" <path-to-functions.js>
```

### Step 3: Create Rule Plan Spec

**Always create before writing any code.** Save to: `journey/<journey>/screens/<screen>/rule-plan-<descriptive-name>.md`

Use a descriptive name based on what the rules cover (e.g., `rule-plan-bank-selection.md`, `rule-plan-initial-visibility.md`). Multiple specs can exist per screen — one per feature or rule batch.

```markdown
# Rule Plan Spec — {Screen Name}

## Rules Checklist

- [ ] **Rule 1** — {trigger} → {action summary} ({fragment})
- [ ] **Rule 2** — {trigger} → {action summary} ({fragment})

---

## Rule 1: {Rule Name}

**Rule on:** {which .form.json and .rule.json this rule is saved to}
**Trigger:** `{fieldName}` — {is clicked | is changed | custom:{eventName}}
**Function:** `{functionName}` in `{file.js}`
**Logic:**
- {action 1}
- {action 2}

**Status:** [ ] Stub → [ ] Rule saved → [ ] Implemented

---

## Files to Create/Update

| File | Functions |
|------|-----------|
| `code/blocks/form/scripts/fragment/{name}.js` | `{func1}`, `{func2}` |

## Open Questions

| Question | Impact |
|----------|--------|
```

**STOP here until the user approves.** The user may:
- Ask to modify the plan — **update the spec file** with their changes before proceeding
- Ask open questions — answer them and update the spec's Open Questions section
- Approve as-is — proceed to Step 4

The spec is a living document. Update it whenever the plan changes during implementation.

### Step 4: Create Stub Custom Functions

```javascript
/**
 * Handles bank selection — handles primary-vs-alternate bank selection.
 * @name handleBankSelected Handle Bank Selected
 * @param {scope} globals - AEM Forms globals
 */
function handleBankSelected(globals) {
  // TODO: implement in Phase 2
}
export { handleBankSelected };
```

Confirm parseable: `"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/parse-functions" <file>.js`

**Signature must not change after this step.**

### Step 5: Generate Rule JSON

| Condition | Template |
|-----------|----------|
| No IF condition | `templates/rule-no-condition.json` |
| Single comparison | `templates/rule-with-comparison.json` |
| AND / OR conditions | `templates/rule-with-boolean.json` |

Fill `{{PLACEHOLDER}}` values from `rule-transform` and `parse-functions` output. Remove all `_comment`, `_note`, `_template` keys.

### Step 6: Validate and Save

```bash
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-validate" <rule.json>
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-save" <rule.json> --rule-store <form>.rule.json --form <form>.form.json
```

If save fails, see [references/troubleshooting.md](references/troubleshooting.md).

**STOP here — ask user to verify rules in AEM Forms rule editor before proceeding.**

### Step 7: Discover Field Paths (MANDATORY before implementation)

Run `rule-transform` and trace the **exact qualified path** for every field the function will access. Fragment references add hidden nesting.

```bash
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-transform" <form>.form.json
```

Example: `accountSelectionWrapper` looks direct but is actually at `wrapper.accountSelectionPanel.accountSelectionWrapper`. Wrong paths cause NPE at runtime.

### Step 8: Implement Functions

Replace `// TODO` stubs with real logic. See [references/apis.md](references/apis.md) for `globals.functions.*` APIs.

**Do NOT change function signatures. Do NOT re-run save-rule.**

For API calls, discover first: `"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/api-manager" list | grep -i <keyword>`

---

## Move Rule to Different Component

1. Extract rule JSON from rule store (find by UUID)
2. Update COMPONENT `id`, `name`, `type`, `parent` to new target
3. Remove old `fd:rules`/`fd:events` from source in form.json
4. Clear old store entry
5. Re-validate and save with `rule-save`

## Re-save Existing Rules

```bash
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-save" resave --rule-store <form>.rule.json --form <form>.form.json
```
