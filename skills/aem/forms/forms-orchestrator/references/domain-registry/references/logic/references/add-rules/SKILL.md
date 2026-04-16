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
allowed-tools: Read, Write, Edit, Bash
---

# Form Rules Expert

You implement all AEM Forms business logic via rules. Every interactive behavior — show/hide, validation, calculations, API calls, navigation — is a rule.

## Critical Rules

| Rule | What to Do |
|------|------------|
| **NEVER add unrequested behavior** | Only generate what user asked. If an else branch might help, ASK first. |
| **NEVER add Else without asking** | If user says "Show X when Y", ask before adding hide behavior. |
| **Prefer OPERATORS over functions** | For conditions, use IS_EMPTY, IS_NOT_EMPTY, etc. NOT function calls like isEmpty(). |
| **Prefer DIRECT ACTIONS over functions** | For simple show/hide/enable/disable, use SHOW_STATEMENT, etc. NOT custom functions. |
| **MUST validate before saving** | Run the validator. Fix errors before proceeding. |
| **NEVER invent nodeNames** | Only use nodeNames from the grammar whitelist. See [references/grammar-reference.md](references/grammar-reference.md). |
| **NEVER use $parent references** | `$parent` doesn't resolve in Rule Editor. Use events for cross-fragment communication. |
| **No DOM access in custom functions** | Use `globals`/`scope` only. NEVER use `document`, `window`, jQuery. |
| **Use variables, not hidden fields** | For runtime state, use setVariable/getVariable, not hidden form fields. |

## Decision: Simple Rule vs Custom Function

```
User Requirement
      │
      ▼
┌─────────────────────┐
│ Can this be done     │
│ with simple actions  │
│ and simple inputs?   │
└─────────────────────┘
      │
  ┌───┴───┐
  YES     NO
  ↓       ↓
SIMPLE   FUNCTION
RULE     RULE
```

**Simple Rule (Direct Actions):**
- Show/hide → SHOW_STATEMENT, HIDE_STATEMENT
- Enable/disable → ENABLE_STATEMENT, DISABLE_STATEMENT
- Set/clear value → SET_VALUE_STATEMENT, CLEAR_VALUE_STATEMENT
- Submit, reset, validate → SUBMIT_FORM, RESET_FORM, VALIDATE_FORM
- Navigate → NAVIGATE_TO, NAVIGATE_IN_PANEL
- Set focus → SET_FOCUS
- Dispatch event → DISPATCH_EVENT
- Set variable → SET_VARIABLE

**Function Rule (FUNCTION_CALL) — only when needed:**
- Arithmetic calculations (a + b * c)
- String concatenation
- API/service calls
- Complex multi-field logic
- Data transformation

## Action Type Router

| Action Type | When to Use |
|-------------|-------------|
| Show/Hide | "show X when...", "hide X if...", "toggle visibility" |
| Set/Clear Value | "set value", "clear", "copy value" |
| Enable/Disable | "enable", "disable", "make editable", "make read-only" |
| Submit/Reset/Validate | "submit", "reset", "validate", "save", "clear form" |
| Set Property | "change label", "set placeholder", "make required" |
| Set Variable | "store value", "save to variable", "set flag" |
| Navigate | "go to", "redirect", "next step", "open URL" |
| Add/Remove Instance | "add row", "remove row", "duplicate" |
| Dispatch Event | "fire event", "trigger event", "signal" |
| Validation Check | "is valid", "check validity" |
| Function Call | "calculate", "call API", "sum", "average" |

For detailed JSON structures of each rule type, see [references/rule-types.md](references/rule-types.md).

## Workflow

### Step 1: Understand Requirements

Parse the user's request into discrete rules:

```
**Target:** <field-name>
**Trigger Event:** is initialized | is clicked | is changed | custom:<eventName>
**Condition:** <condition expression or None>
**Actions:** <action list>
**ElseActions:** (only if explicitly requested)
```

### Step 1.5: Present Rule Plan

Present the plan and let user choose:

> "I've identified N rules. Would you like me to: (1) Show the plan for review, or (2) Implement directly?"

**If user picks review**, present the rule plan:

```
Rule Plan: <Screen/Component Name>
════════════════════════════════════

Rule 1: <Short Name>
  Component:  <fieldName>
  Trigger:    <event>
  Condition:  <condition or —>
  Actions:    <action 1>
              <action 2>
  Else:       <else actions or —>

Custom Functions Needed:
  <functionName>  — <purpose>  → <file path>
```

Wait for user to approve or request changes before proceeding.

### Step 2: Analyze Form Context

```bash
# Get component tree with qualified names
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-transform" <form>.form.json

# Check existing rules on target field
cat <form>.rule.json | jq '.[] | select(.componentName == "<fieldName>")'
```

If similar rules exist, inform user and ask if they want to proceed.

### Step 3: Choose Approach

- Simple action? → Direct rule (see Action Type Router)
- Complex logic/API? → Write custom function first (use **create-function** skill), then FUNCTION_CALL rule

### Step 4: Check Existing Functions & APIs (if needed)

```bash
# Parse custom functions
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/parse-functions" <path-to-functions.js>

# List available APIs
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/api-manager" list

# Show API details
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/api-manager" show <apiName> --json
```

Do NOT ask the user which API to use if you can find it by searching.

### Step 5: Generate Rule JSON

Build the rule following the grammar. See [references/grammar-reference.md](references/grammar-reference.md) for the complete structure reference and [references/rule-types.md](references/rule-types.md) for action-specific patterns.

**Key grammar rules:** Every CONDITION needs `"nested": false`. Empty condition = `"choice": null`. Literal tokens (When/Then/Else/to/of/on) = `{"nodeName": "X", "value": null}`. FUNCTION_CALL uses `functionName` (object) + `params` (array). No arithmetic nodes — use FUNCTION_CALL instead.

### Step 6: VALIDATE (Mandatory)

```bash
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-validate" <rule.json>
```

**STOP if errors. Fix before proceeding. NEVER save invalid rules.**

### Step 7: Save to Rule Store

```bash
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-save" <rule.json> \
  --rule-store <form>.rule.json \
  --form <form>.form.json
```

The tool auto-generates context from form.json (component tree + custom functions). No manual `--context` needed.

### Step 7.1: If Save Fails

If save fails, see [references/troubleshooting.md](references/troubleshooting.md).

### Step 7.2: Discover Field Paths (MANDATORY before implementation)

For rules with custom functions, run `rule-transform` and trace the **exact qualified path** for every field the function will access. Fragment references add hidden nesting.

```bash
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-transform" <form>.form.json
```

Example: `accountSelectionWrapper` looks direct but is actually at `wrapper.accountSelectionPanel.accountSelectionWrapper`. Wrong paths cause NPE at runtime.

### Step 8: Implement Functions

Replace `// TODO` stubs with real logic. See [references/apis.md](references/apis.md) for `globals.functions.*` APIs.

**Do NOT change function signatures. Do NOT re-run save-rule.**

For API calls, discover first: `"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/api-manager" list | grep -i <keyword>`

### Step 9: Re-save Existing Rules

Regenerate `fd:events` for all rules in a rule store:

```bash
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-save" resave \
  --rule-store <form>.rule.json --form <form>.form.json
```

## Complex Request Handling

### Multiple Actions
When a request includes multiple actions, combine into a single rule with multiple BLOCK_STATEMENTS (preferred) or generate separate rules per action.

### Conditional Logic (If/Else)
Use TRIGGER_EVENT_SCRIPTS with else block. Both then and else can have multiple BLOCK_STATEMENTS.

### Chained Rules
When rules need to trigger other rules: first rule dispatches custom event, second rule listens for that event.

## Cross-Fragment Communication

Fragments cannot use `$parent`. Instead, use events:

| Fragment | What It Does |
|----------|--------------|
| Sender | Dispatches event on `globals.form` |
| Receiver | Listens for the custom event, acts on its own fields |

Any event dispatched on `globals.form` is visible to the **entire form tree** — parent form, sibling fragments, nested child fragments. No special routing needed.

In rules: use DISPATCH_EVENT action. In custom functions: use `globals.functions.dispatchEvent`.

## Repeatable Panel Population

**Array of objects:** Set value to an array where keys match component IDs inside the repeatable panel:
```javascript
globals.functions.setProperty(globals.form.accountDetailsPanel, {
  value: [
    { accountNumber: '123', customerId: 'C001', accountType: 'Savings' },
    { accountNumber: '456', customerId: 'C002', accountType: 'Current' }
  ]
});
```

**importData (bulk):** Use `globals.functions.importData(data)` for populating multiple fields/panels at once. Requires `FT_FORMS-20002` feature toggle.

## OOTB Functions Quick Reference

**Math:** sum, avg, abs, ceil, floor, round, min, max, power, mod, sqrt
**String:** concat, contains, startsWith, endsWith, lower, upper, trim, replace, split, join
**Array:** length, sort, reverse, unique, toArray
**Type:** type, keys, values, toString, toNumber
**Date:** today

## Tool Commands Summary

| Tool | Command |
|------|---------|
| Transform form (get tree) | `rule-transform <form>.form.json` |
| Validate rule | `rule-validate <rule.json>` |
| Save rule | `rule-save <rule.json> --rule-store <form>.rule.json --form <form>.form.json` |
| Re-save all rules | `rule-save resave --rule-store <form>.rule.json --form <form>.form.json` |
| Parse functions | `parse-functions <path>` |
| List APIs | `api-manager list` |
| Show API details | `api-manager show <apiName> --json` |

## Error Recovery

### "Component not found"
1. Search by partial name in form.json
2. Check for typos or different casing
3. Verify component exists in form structure

### "Function not found"
1. Check OOTB functions (sum, concat, contains, etc.)
2. Verify custom function file path
3. Parse functions file to confirm function exists

### "Validation failed"
1. Check nodeNames against whitelist in [references/grammar-reference.md](references/grammar-reference.md)
2. Ensure CONDITION has `"nested": false`
3. Verify literal tokens have `"value": null`
4. Check COMPONENT has all required fields (id, type, name, parent)

## Rule Examples

Concrete JSON examples for each rule type are available in [references/examples/](references/examples/):

| Rule Type | Examples |
|-----------|----------|
| Visibility (show/hide) | [references/examples/visibility/](references/examples/visibility/) |
| Value (set/clear/enable/disable) | [references/examples/value/](references/examples/value/) |
| Form Actions (submit/reset/validate) | [references/examples/form-action/](references/examples/form-action/) |
| Properties (label/placeholder/required) | [references/examples/property/](references/examples/property/) |
| Variables (set/get) | [references/examples/variable/](references/examples/variable/) |
| Navigation (panel/URL) | [references/examples/navigation/](references/examples/navigation/) |
| Repeatable Instances (add/remove) | [references/examples/instance/](references/examples/instance/) |
| Dispatch Events (custom events) | [references/examples/dispatch-event/](references/examples/dispatch-event/) |
| Function Calls (API/calculation) | [references/examples/function/](references/examples/function/) |
| Conditions (boolean/comparison) | [references/examples/conditions/](references/examples/conditions/) |

Use these as reference when constructing rules. Each file shows the exact JSON structure for that rule type.

## Review Checklist

- [ ] Rule JSON valid (ran validator)
- [ ] Field paths exist in form.json
- [ ] Function signatures match parsed custom functions
- [ ] COMPONENT references have correct id, type, name, parent
- [ ] No $parent references
- [ ] Simple operations use direct actions, not FUNCTION_CALL
