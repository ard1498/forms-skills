# Definitions Reference

The `definitions/` directory contains the static, bundled catalogs used by the validator.
These files are sourced from the [AF2 KB](https://github.com/adobe-aem-forms/af2-docs/tree/main/spec/agent-kb)
and must not be discovered or loaded at runtime from external sources.

---

## `scope-functions.json`

Defines every OOTB function available on `globals.functions.*` in custom function code.

### Top-level shape

```json
{
  "kbSource": ["<url>"],
  "<functionName>": {
    "args": [ ... ],
    "semanticRules": [ ... ]
  },
  "deprecated": {
    "<oldFunctionName>": {
      "args": [ ... ],
      "replacement": "<newCallSyntax>"
    }
  }
}
```

### `args` — argument definitions

Each entry describes one positional argument:

| Field | Type | Description |
|---|---|---|
| `name` | string | Argument name (used in diagnostics) |
| `kind` | string[] | Accepted argument categories — see kinds below |
| `required` | boolean | Whether the argument must be present |
| `default` | any | (optional) Default value when argument is omitted |

**Argument kinds:**

| Kind | Matches |
|---|---|
| `qualifiedName` | A member expression resolving to a form field — e.g. `globals.form.panel1.field1` |
| `object` | An object literal — e.g. `{ value: "x" }` |
| `string` | A string literal — e.g. `"multipart/form-data"` |
| `number` | A number literal |
| `boolean` | A boolean literal |
| `identifier` | A variable reference (not validated further in v1) |
| `any` | Any kind accepted |

### `semanticRules` — deep validation rules

Semantic rules run after basic arg count/type checks and encode deeper constraints
specific to each function. The validator executes them in order.

**Currently defined rule types:**

#### `targetQualifiedName`

```json
{ "type": "targetQualifiedName", "arg": 0 }
```

The argument at position `arg` must resolve to a valid qualified name present in
the caller-provided `qualifiedNames` map. Used when a function targets a specific
form element (e.g. `setProperty(field, ...)` — `field` must be a known QN).

#### `optionalTargetQualifiedName`

```json
{ "type": "optionalTargetQualifiedName", "arg": 0 }
```

Same as `targetQualifiedName` but the argument is optional. If provided it must
resolve to a valid QN; if omitted the rule passes silently.
Used by `validate(element?)` where element defaults to the whole form.

#### `payloadKeysMatchType`

```json
{ "type": "payloadKeysMatchType", "targetArg": 0, "payloadArg": 1 }
```

The object argument at `payloadArg` may only contain property keys that are valid
for the type of the qualified name resolved from `targetArg`.
Used by `setProperty(field, props)` to ensure payload keys like `$visible`, `$value`
are legal for the target field's type (e.g. a `button` does not have `$value`).

> **Note:** `payloadKeysMatchType` is declared here for future Phase 5 enforcement.
> The current validator wires `targetQualifiedName` rules; full payload-key validation
> against resolved type is a planned enhancement.

### How to add a new OOTB function

1. Add an entry under `scope-functions.json` with the function name as the key.
2. Define `args` in positional order with appropriate `kind` and `required` values.
3. Add `semanticRules` — use `[]` if no deep validation is needed.
4. Update `kbSource` if the function comes from a new KB document.

Example — adding a hypothetical `scrollTo(element)`:

```json
"scrollTo": {
  "args": [
    { "name": "element", "kind": ["qualifiedName"], "required": true }
  ],
  "semanticRules": [
    { "type": "targetQualifiedName", "arg": 0 }
  ]
}
```

---

## `types.json`

Defines the AEM Forms field type catalog and runtime-exposed property lists used
to validate property access on form objects.

### Top-level shape

```json
{
  "kbSource": ["<url>", ...],
  "supportedFieldTypes": [ ... ],
  "groups": { ... },
  "runtime": { ... }
}
```

### `supportedFieldTypes`

Complete list of valid `fieldType` values. Any type referenced in `qualifiedNames`
that is not in this list (and is not `"form"` or `"panel"`) will produce a
`TYPE_UNKNOWN` diagnostic.

### `groups`

Named subsets of field types used for semantic grouping:

| Group | Purpose |
|---|---|
| `fieldLike` | All leaf input fields (text, dropdown, checkbox, etc.) |
| `containerLike` | Container types (`panel`, `form`) |
| `choiceLike` | Multi-option selection fields (`drop-down`, `radio-group`, `checkbox-group`) |

### `runtime`

Describes which properties are accessible on form objects in custom function code.
All property names use the `$` prefix convention (e.g. `$value`, `$visible`).

#### `commonExposedProperties`

Properties accessible on **every** field or panel via direct member access:

```js
globals.form.field1.$value
globals.form.panel1.$qualifiedName
```

#### `typeSpecificExposedProperties`

Additional read-only properties exposed only for specific types:

```json
"typeSpecificExposedProperties": {
  "checkbox": ["$checked"],
  "panel":    ["$qualifiedName", "$index", "$parent"]
}
```

#### `ruleModifiableCommon`

Properties that can be set on **every** field via `globals.functions.setProperty(field, { ... })`:

```js
globals.functions.setProperty(globals.form.field1, { $visible: false });
globals.functions.setProperty(globals.form.field1, { $value: "hello" });
```

#### `ruleModifiableByType`

Additional settable properties for specific field types:

```json
"ruleModifiableByType": {
  "panel":      ["$minItems", "$maxItems", "$minOccur", "$maxOccur"],
  "file-input": ["$accept", "$maxFileSize"],
  "checkbox":   ["$checked"]
}
```

#### `typeAliases`

Maps one type to another for property lookup purposes.
`"form": "panel"` means the form root is treated as a panel for property validation.

### How to add a new field type

1. Add the type string to `supportedFieldTypes`.
2. Add it to the appropriate `groups` entry (`fieldLike`, `containerLike`, or `choiceLike`).
3. If it has type-specific exposed properties, add an entry to `typeSpecificExposedProperties`.
4. If it has type-specific settable properties, add an entry to `ruleModifiableByType`.
5. Update `kbSource` if sourced from a new KB document.

### How to add a new runtime property

- **Common to all types**: add to `commonExposedProperties` (read-only) or `ruleModifiableCommon` (settable via `setProperty`).
- **Type-specific read-only**: add to `typeSpecificExposedProperties[fieldType]`.
- **Type-specific settable**: add to `ruleModifiableByType[fieldType]`.
- All entries must use the `$` prefix.
