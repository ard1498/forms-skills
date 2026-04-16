---
name: create-function
description: >
  Creates AEM Forms custom JavaScript functions with proper JSDoc annotations for the
  visual rule editor. Handles async API patterns, form-level composition, fragment
  re-exports, scope/globals usage, and parser compatibility. Use for calculations,
  API calls, data transformations, or complex multi-field logic. NOT for simple
  show/hide or enable/disable (use add-rules skill with direct actions instead) 
  or set-value operations. Custom functions use globals.functions.* APIs to interact 
  with the form model.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
allowed-tools: Read, Write, Edit, Bash
---

# Custom Function Implementation

Create JavaScript functions for AEM Adaptive Forms rule expressions.

## When to Use

- User needs custom business logic as a reusable function
- Calculations, validations, API calls, data transformations
- Complex multi-field logic that can't be done with simple rule actions

**Do NOT use for:** Simple show/hide, enable/disable, set value — use the **add-rules** skill with direct action statements instead.
---

## Mandatory: Derive Field Paths from treeJson

If your custom function references fields via `globals.fragment.*` or `globals.form.*`, you MUST run `transform-form.js` first to get the correct hierarchical paths. NEVER manually walk the form JSON to construct these paths.

```bash
# Run transform to get treeJson with pre-computed ids
node scripts/rule_coder/bridge/cli/transform-form.js <form>.form.json
```

The treeJson output contains an `id` field for each component (e.g. `$form.panel1.subpanel.fieldName`). Map these to your custom function code:

| treeJson `id` | Fragment JS (`globals.fragment`) | Form JS (`globals.form`) |
|----------------|----------------------------------|--------------------------|
| `$form.panel1.field1` | `globals.fragment.panel1.field1` | `globals.form.panel1.field1` |
| `$form.panel1.nested.field2` | `globals.fragment.panel1.nested.field2` | `globals.form.panel1.nested.field2` |

**Steps:**
1. Run `transform-form.js` on the relevant form/fragment `.form.json`
2. Find the target fields in the treeJson output by searching for their `name` or `id`
3. Use the `id` value (replacing `$form` with `globals.fragment` or `globals.form` based on file location) in your function code

**Skip this step only if** the function does not reference any fields directly (e.g. it only operates on parameters passed in).

---

## Critical Rule: No DOM Access

Custom functions ONLY interact with the form model via `globals`/`scope`.

| ❌ Don't | ✅ Do |
|----------|-------|
| `document.querySelector(...)` | `globals.form.panel.field.$value` |
| `element.classList.add(...)` | `globals.functions.setProperty(field, {...})` |
| `new CustomEvent(...)` | `globals.functions.dispatchEvent(target, "custom:event")` |
| `fetch(url)` | `globals.functions.request({url, method, body})` |

---

## Critical Rule: Fragment vs Form Field Access

When referencing fields in a custom function, use the correct globals property based on where the JS file lives:

| JS file location | Use | Why |
|-----------------|-----|-----|
| `fragment/*.js` | `globals.fragment.<fieldName>` | `globals.form` always points to the root form — when the fragment is embedded, `globals.form.<fieldName>` breaks. `globals.fragment` always resolves to the fragment's own root regardless of embedding context. |
| `form/*.js` | `globals.form.<fieldName>` | Form-level scripts run in the root form context — `globals.form` is the correct root reference. |

**NEVER use `globals.form` for direct field/property access inside fragment JS files.** Always use `globals.fragment` for fields within the fragment.

Event dispatch is the explicit exception: use `globals.fragment` when dispatching events scoped to the fragment, and use `globals.form` only when you intentionally target the root form (for example, to notify the parent form from within a fragment).
### Examples

```javascript
// Fragment JS (code/blocks/form/scripts/fragment/my-fragment.js)
function hideButton(globals) {
    globals.functions.setProperty(globals.fragment.submitBtn, { visible: false });
}

// Fragment JS — event dispatch always uses globals.form (not globals.fragment)
function notifyParent(globals) {
    globals.functions.dispatchEvent(globals.form, 'custom:myEvent');
}

// Form-level JS (code/blocks/form/scripts/form/my-form.js)
function hideButton(globals) {
    globals.functions.setProperty(globals.form.submitBtn, { visible: false });
}

// WRONG in fragment JS — globals.form breaks when fragment is embedded
// function hideButton(globals) {
//     globals.functions.setProperty(globals.form.submitBtn, { visible: false });
// }
```

**Exception — event dispatch:** For cross-fragment communication, always use `globals.form` regardless of file location. Events dispatched on the form root are visible to the entire form tree:

```javascript
// Always use globals.form for event dispatch — works everywhere
globals.functions.dispatchEvent(globals.form, 'custom:myEvent');
```

---

## Function Format

### Required Pattern: Declaration + Export

```javascript
import { someHelper } from './libs.js';

/**
 * Brief description
 * @name myFunction My Function Display Name
 * @param {string} param - Parameter description
 * @param {scope} globals - Globals object
 */
function myFunction(param, globals) {
    // implementation
}

export { myFunction };
```

### CRITICAL: Export Limitation

```javascript
// ❌ DOES NOT WORK - Parser returns empty array
export function myFunction(param) { return param; }

// ✅ WORKS - Regular function + export at end
function myFunction(param) { return param; }
export { myFunction };
```

### NOT Supported as Exported Functions

- `export function` (inline export)
- `async function` (won't appear in visual rule editor)
- Generator functions, class methods, rest parameters

## Async Pattern: Helper + Sync Wrapper

```javascript
import { leadcreationapi } from './api-clients/leadcreationapi.js';

// Internal helper (CAN use async/await)
async function fetchHelper(custId, globals) {
    const response = await leadcreationapi({ mobileNo: custId }, globals);
    if (!response.ok) throw new Error('Failed');
    return response.body;
}

// ✅ Exported function (MUST be sync for rule editor)
/**
 * @name fetchCustomer Fetch Customer
 * @param {string} custId - Customer ID
 * @param {scope} globals - Globals object
 */
function fetchCustomer(custId, globals) {
    fetchHelper(custId, globals)
        .then(function(data) {
            globals.functions.setProperty(globals.form.name, { value: data.name });
        })
        .catch(function(err) { console.error(err); });
}

export { fetchCustomer };
```

**Key rules:**
- **Exported functions** (with JSDoc `@name`) **MUST be sync** — async won't appear in rule editor
- **Helper functions** (internal) **CAN use async/await**

**CRITICAL: Always use generated api-clients for API calls — NEVER call APIs directly.**

| Don't | Do |
|-------|-----|
| `globals.functions.request({ url: '/api/...', method: 'POST', ... })` | `import { myApi } from './api-clients/myApi.js'; await myApi(params, globals)` |
| `fetch('/api/...')` | import and use the generated client |

Generated api-clients live at `refs/apis/generated/api-clients/` and are imported as `./api-clients/<apiName>.js` (they are copied alongside the custom function files). Each client:
- Is async: `await <apiName>(params, globals)`
- Returns `{ ok: boolean, status: number, body: object }`
- Handles URL, method, headers, and body structure internally

To find the right client: `api-manager list | grep -i <keyword>` or `api-manager show <apiName> --json`.

---

## Form-Level Composition (CRITICAL)

AEM runtime loads **only the form-level `customFunctionsPath`**. Fragment-level scripts are for authoring only. At runtime, ALL functions — from all fragments at every nesting level — must be reachable from the single form-level script via the import chain.

### The Full Chain (3 levels)

```
Child fragment JS
  → exported from child
  → imported + re-exported by parent fragment JS
  → imported + re-exported by form-level JS
  → loaded by AEM runtime
```

If any level in this chain is missing, AEM runtime throws **"Unknown function"** errors.

### Architecture

```
code/blocks/form/scripts/
├── form/
│   └── my-form.js              ← Form-level script (loaded by AEM runtime)
│                                  imports from ALL referenced fragment scripts
├── fragment/
│   ├── parent-fragment.js      ← Parent fragment script
│   │                              imports from its child fragment scripts
│   └── child-fragment.js       ← Child fragment script
│                                  exports its own functions only
└── script-libs/
    └── libs.js                 ← Shared utilities, API clients
```

### Level 1 — Child Fragment: Export its own functions

```javascript
// fragment/child-fragment.js

/**
 * @name childFunction Child Function
 * @param {scope} globals - Globals object
 */
function childFunction(globals) { /* ... */ }

export { childFunction };
```

### Level 2 — Parent Fragment: Import from child + re-export everything

When a fragment embeds another fragment, its JS must import all child functions and re-export them alongside its own.

```javascript
// fragment/parent-fragment.js
import { childFunction } from './child-fragment.js';  // ← import from child

/**
 * @name parentFunction Parent Function
 * @param {scope} globals - Globals object
 */
function parentFunction(globals) { /* ... */ }

export { parentFunction, childFunction };  // ← re-export child functions too
```

### Level 3 — Form Script: Import from all fragments + re-export everything

```javascript
// form/my-form.js
import { parentFunction, childFunction } from '../fragment/parent-fragment.js';
import { standaloneFunction } from '../fragment/standalone-fragment.js';

/**
 * @name formInit Form Init
 * @param {scope} globals - Globals object
 */
function formInit(globals) { /* form-level logic */ }

export {
  formInit,              // Form-level own function
  parentFunction,        // From parent-fragment
  childFunction,         // From child-fragment (via parent-fragment)
  standaloneFunction,    // From standalone-fragment
};
```

### Rules

| Rule | Details |
|------|---------|
| **Child fragment exports its own functions** | Every function defined in a fragment JS must be in its `export {}` |
| **Parent fragment re-exports child functions** | When fragment A is embedded inside fragment B, `fragment-b.js` must import + re-export all functions from `fragment-a.js` |
| **Form script re-exports everything** | Form-level JS imports from all directly referenced fragment scripts and re-exports all functions |
| **Use unique function names** | Functions across all fragments and the form must never share the same name |
| **When adding a new function to any fragment** | (1) Export it from that fragment's JS, (2) add re-export in every parent fragment JS up the chain, (3) add re-export in form-level JS |

## Fragment Functions: Pass Specific Fields

```javascript
// ❌ Fragment root doesn't appear in Form Object dropdown
function handle(fragment, globals) { ... }

// ✅ Pass specific fields as {object} parameters
/**
 * @name handleBankSelection Handle Bank Selection
 * @param {object} bankDropdown - Bank dropdown field
 * @param {object} hiddenBankName - Hidden field for bank name
 * @param {scope} globals - Globals object
 */
function handleBankSelection(bankDropdown, hiddenBankName, globals) {
    globals.functions.setProperty(hiddenBankName, { value: bankDropdown.$value });
    globals.functions.dispatchEvent(globals.form, 'custom:bankSelected');
}
```

**Cross-fragment:** child fragments CANNOT reference parent via `$parent`. Use events.

## JSDoc Reference

### Required Tags

| Tag | Example |
|-----|---------|
| Description | `/** Calculates total price */` |
| `@param` | `@param {string} name - User name` |
| `@returns` | `@returns {number} The calculated total` |
| `@name` | `@name calculateTotal Calculate Total Price` |

### Parameter Types

| JSDoc Type | AEM Type | Notes |
|------------|----------|-------|
| `string` | STRING | |
| `number` | NUMBER | |
| `boolean` | BOOLEAN | |
| `date` | DATE | |
| `object` | OBJECT/AFCOMPONENT | Form components (fields, panels) |
| `scope` | SCOPE | Globals — MUST be last argument |
| `string[]` | STRING[] | Array types supported |

Omit `@returns` for void functions.

## Tool Commands

| Tool | Command |
|------|---------|
| Parse functions | `parse-functions <path-to-js>` |
| List APIs | `api-manager list` |
| Show API details | `api-manager show <name> --json` |
| Build API clients | `api-manager build` |

## After Writing: Sync customFunctionsPath (Mandatory)

After writing a custom function JS file, **always** update `customFunctionsPath` in the corresponding fragment's `form.json`.

### Why
`save-rule.js` resolves the JS file path as: `code/` + `customFunctionsPath` (leading `/` stripped).
The correct value must match the actual file location under `code/`.

### Convention

| JS file written to | customFunctionsPath to set |
|--------------------|---------------------------|
| `code/blocks/form/scripts/fragment/<name>.js` | `blocks/form/scripts/fragment/<name>.js` |
| `code/blocks/form/scripts/form/<name>.js` | `blocks/form/scripts/form/<name>.js` |

### Steps

1. Derive the correct value by stripping the `code/` prefix from the JS file path.
2. Locate the fragment's `form.json` — typically `repo/content/forms/af/**/<fragment-name>.form.json`.
3. Set or update `customFunctionsPath` at the root of the form.json:

```bash
# Example: file written to code/blocks/form/scripts/fragment/etbaccountselectionscreen.js
# Set in repo/content/forms/af/.../etbaccountselectionscreen-v1.form.json:
# "customFunctionsPath": "blocks/form/scripts/fragment/etbaccountselectionscreen.js"
```

4. If the fragment `form.json` is not known at the time of function creation, note it as a follow-up action.

---

## After Writing: Update Import Chain (Mandatory for Fragment Functions)

When you write a function to a **fragment JS file** (not a form-level JS), the AEM runtime will not see it unless it is re-exported all the way up to the form-level script. Missing this causes "Unknown function" errors at runtime.

Do this immediately after writing the fragment function — do not leave it as a follow-up.

### Steps

**Step 1 — Find the parent fragment(s)** that embed this child fragment:

```bash
# Replace <child-fragment-name> with the fragment's name as it appears in fragmentPath
grep -r "<child-fragment-name>" repo/content/forms/af/ --include="*.form.json" -l
```

Look for `fragmentPath` fields in form.json files. Each match is a parent that embeds this child.

**Step 2 — Update each parent fragment JS** to import the new function and add it to `export {}`:

```javascript
// parent-fragment.js — add import at top
import { newFunction } from './child-fragment.js';

// Add to export list
export { existingFunction, newFunction };
```

**Step 3 — Walk up the chain** — repeat Step 1 using the parent fragment's name to find *its* parent, all the way to the form-level JS.

**Step 4 — Update form-level JS** with the same import + re-export:

```javascript
// form.js — add import
import { newFunction } from '../fragment/parent-fragment.js';

// Add to export list
export { ..., newFunction };
```

### Why this matters

AEM runtime only loads the single `customFunctionsPath` on the root form. Fragment JS files are for authoring only — they are NOT loaded at runtime unless the function is re-exported through the entire chain to the form-level script.

### Quick check

After updating the chain, verify each level has the function in its `export {}`:

```bash
grep -n "newFunction" code/blocks/form/scripts/fragment/*.js code/blocks/form/scripts/form/*.js
```

---

## After Writing: Validate the Custom Function (Optional)

After writing or editing a custom function file, ask the user:

> "Would you like to run the validator on this file? It catches qualified name typos, wrong `globals.functions.*` calls, missing scope params, and property access on the wrong field type — all before runtime."

Only proceed with the steps below if the user says **yes**. If the user says **no**, skip this section entirely.

### Step 1 — Generate qualified names for the form

The validator needs a map of every field path in the form (and its type). Generate it from the form/fragment's `.form.json`:

```bash
# For a fragment file (globals.fragment.* accesses)
node <skill-dir>/generate-qualified-names.js \
  repo/content/forms/af/<project>/<path>/<fragment-name>.form.json \
  --out /tmp/qn.json

# For a form-level file (globals.form.* accesses)
node <skill-dir>/generate-qualified-names.js \
  repo/content/forms/af/<project>/<path>/<form-name>.form.json \
  --out /tmp/qn.json
```

Where `<skill-dir>` is the directory containing this SKILL.md (the `create-function` skill directory).

Fragment detection is automatic — `$fragment.*` keys are emitted only when the input is a fragment. The generator also inlines child fragments that are already on disk, so their fields appear in the map too.

### Step 2 — Run the CLI validator

```bash
node <skill-dir>/cli.js \
  code/blocks/form/scripts/fragment/<your-file>.js \
  --qualified-names /tmp/qn.json
```

**Clean output:**
```
OK
```

**With errors:**
```
QUALIFIED_NAME_UNKNOWN: unknown qualified name: form.panel1.nonExistentField (12:5)
FUNCTION_UNKNOWN: unknown function setVal (18:3)
PROPERTY_INVALID: property '$foo' not valid for type 'text-input' (24:9)
```

Add `--format json` to get machine-readable output with full diagnostic details.

### Diagnostic codes quick reference

| Code | What it means |
|------|---------------|
| `SYNTAX_ERROR` | File is not valid JavaScript — fix the parse error before re-running |
| `EXPORT_NO_FUNCTION` | A name in `export {}` has no matching `function` declaration in the file |
| `SCOPE_PARAM_MISSING` | Function has no `@param {scope}` JSDoc tag (only an error when `requireScopeParam` is true) |
| `SCOPE_PARAM_LAST` | The scope param is not the last argument in the function signature |
| `QUALIFIED_NAME_UNKNOWN` | Field path doesn't exist in the form — check spelling and panel nesting |
| `QUALIFIED_NAME_INVALID_ROOT` | Path uses `globals.other.*` instead of `globals.form.*` or `globals.fragment.*` |
| `QUALIFIED_NAME_MISSING_TYPE` | Field exists in the qualified names map but has no `type` — regenerate the map |
| `TYPE_UNKNOWN` | The field's type is not in the supported types catalog — may be a custom component |
| `PROPERTY_INVALID` | Accessing a property not valid for that field type (e.g. `.$label` on a panel) |
| `CUSTOM_PROPERTY_INVALID` | A `.$properties.*` path goes deeper than any declared `customProperties` for that field |
| `FUNCTION_UNKNOWN` | Called `globals.functions.X` where `X` is not a known scope function |
| `ARG_COUNT_INVALID` | Wrong number of arguments for a scope function |
| `ARG_MISSING` | A required argument is absent from the call |
| `ARG_TYPE_INVALID` / `ARG_ORDER_INVALID` | Wrong argument type or swapped arguments (e.g. object where qualifiedName expected) |

### When to skip

Skip the validator only if the function takes no `globals` parameter and makes no `globals.form.*` / `globals.fragment.*` accesses (i.e. it's a pure utility with no form model interaction).

---

## Best Practices

1. Always include JSDoc with description and param/return types
2. Use descriptive `@name` for rule editor discoverability
3. Validate inputs — check for null/undefined before processing
4. Keep functions focused — one function, one purpose
5. Use meaningful parameter names

## Additional Resources

- [references/api-patterns.md](references/api-patterns.md) — API integration patterns (api-clients, direct request, error handling)
- [references/implementation-patterns.md](references/implementation-patterns.md) — Code examples (calculations, validation, data transformation)
- [references/scope-functions-reference.md](references/scope-functions-reference.md) — Complete globals.functions API reference
