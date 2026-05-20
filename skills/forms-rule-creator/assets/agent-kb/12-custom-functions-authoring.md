> Source: https://github.com/adobe-aem-forms/af2-docs/blob/gh-pages/spec/agent-kb/12-custom-functions-authoring.md

# Custom Functions Authoring
Purpose: Define how to register, structure, and safely use runtime custom functions; and how to annotate them with JSDoc so the rule editor parser produces a correct function definition.
Use when: Asked how to add or write a custom function.
Do not use when: Asked which built-in function to call directly in rules.
Input: Custom function intent and required side effects.
Output: Registration pattern, JSDoc authoring constraints, allowed APIs, and usage rules.
Related primary: `INDEX.md`.
Related secondary: `13-custom-function-helper-apis.md`.

## Registration Lifecycle
- Register: `FunctionRuntime.registerFunctions({ <name>: <customFnOrDefinition> })`
- Unregister: `FunctionRuntime.unregisterFunctions(...names)`
- Override behavior: custom function name collisions override runtime default functions with the same name.

## Supported Function Shapes
- Plain function:
  - Signature: `(...args, globals) => any`
  - Runtime passes expression positional args plus `globals`.
- Function definition object:
  - Shape: `{ _func: (args, data, interpreter) => any, _signature: [] }`
  - Use this when interpreter/data internals are required.

## Runtime Context Available In Plain Functions
- `globals.form`: form-level runtime object.
- `globals.field`: current field runtime object.
- `globals.event`: current event payload/context.
- `globals.$fragment`: fragment-scoped runtime node.
- `globals.functions`: helper APIs for side effects.

## `globals.functions` Helper APIs
- Detailed contracts are in `13-custom-function-helper-apis.md`.
- This file intentionally keeps only authoring-level guidance.

## Form vs Fragment Scope Guidance
- Authoring classification rule:
  - If JSON has `properties["fd:fragment"] === true`, author as fragment-scoped logic.
  - If `fd:fragment` is absent, author as form-scoped logic.
- For fragment JSON (`fd:fragment=true`), prefer `globals.$fragment` for reusable behavior across multiple host forms.
- Use `globals.form` only for explicitly form-wide behavior.
- Runtime-safe fallback pattern (for shared functions used in both contexts):
```ts
const scope = (globals.field?.fragment && globals.field.fragment !== '$form')
  ? globals.$fragment
  : globals.form;
```

## What To Write In Custom Functions
- Pure compute functions: derive/return values only.
- Controlled side effects via `globals.functions` APIs.
- Validation or event orchestration when needed by authored behavior.
- State storage policy:
  - Use `setVariable/getVariable` for transient runtime state (request ids, flags, temporary statuses).
  - Use hidden fields only when state must be exported/submitted with form data.


## JSDoc Authoring for the Rule Editor Parser

Write the function as a top-level `function` declaration with JSDoc, then export it. The runtime registers it automatically — no `FunctionRuntime.registerFunctions` call is needed in authored files.

| Constraint | Rule |
| --- | --- |
| Function declaration | Top-level `function` declarations only. `async function` and `function*` are silently ignored by the parser. |
| `@name` | Function identifier used in rules. Required when the exported name differs from the declared name; otherwise the declared name is used. |
| `globals` param | Always declare as the last parameter: `@param {SCOPE} globals`. The parser strips it from `args` and `impl` automatically — never include it in the `params` array when building a rule. |
| Optional params | Wrap the name in brackets: `@param {STRING} [paramName]`. The parser sets `isMandatory: false` for that arg. |
| Supported type tokens | `STRING`, `NUMBER`, `BOOLEAN`, `DATE`, `ARRAY`, `OBJECT`, `PROMISE`, `SCOPE`. |
| Namespacing | `@memberof Namespace` prefixes the function `id` as `Namespace.functionName` in parsed output. |
| Error handler | `@errorHandler` sets `isErrorHandler: true` on the parsed definition — used for WSDL/invoke failure callbacks. |
| `this` context | `@this currentComponent` changes `impl` to `.apply(this, [$1,...])` — use when the function needs the current field as its `this` context. |

### Example

```js
/**
 * Fetches PAN from Aadhaar number.
 * @name fetchPanFromAadhaar
 * @param {STRING} aadhaarNumber - Aadhaar number to look up
 * @param {SCOPE} globals
 * @returns {STRING} PAN number
 */
function fetchPanFromAadhaar(aadhaarNumber, globals) {
    // implementation
}
export { fetchPanFromAadhaar };
```

Parsed output (parser strips `globals` from args and impl):
```json
{
  "id": "fetchPanFromAadhaar",
  "name": "fetchPanFromAadhaar",
  "type": "STRING",
  "args": [{ "type": "STRING", "name": "aadhaarNumber", "isMandatory": true }],
  "impl": "$0($1)"
}
```


## Common Mistakes
- Calling `globals.functions` APIs directly in rule expressions — they are only available inside custom function bodies.
- Ignoring `properties["fd:fragment"]` and hardcoding form scope for reusable fragment logic.
- Reusing deprecated wrappers (`reset`) in new custom logic.
- Using `async function` or `function*` — the parser silently ignores these; use a plain `function` declaration.
- Including `globals` in the rule's `params` array — the parser strips it automatically.
