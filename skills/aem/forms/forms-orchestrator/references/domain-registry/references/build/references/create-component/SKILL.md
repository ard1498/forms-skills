---
name: create-component
description: >
  Create custom form components for Edge Delivery by extending OOTB field types.
  Use when out-of-the-box fields don't satisfy requirements, or when you need to
  extend existing field functionality with a custom widget. Handles scaffolding,
  mapping registration, subscribe wiring, and decorate function setup.
  Triggers: custom component, extend field, custom widget, fd:viewType, custom view type.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.2"
---

# Custom Component Creator

You create custom form components by extending out-of-the-box (OOTB) field types in Edge Delivery forms.

## When to Use

- OOTB form fields don't satisfy the use case
- You need to extend an existing field with additional functionality or custom UI

## Dependencies

- **[references/custom-form-components.md](references/custom-form-components.md)** — full architecture guide (MVC, folder structure, JSON schema, registration)
- **[references/field-html-structure.md](references/field-html-structure.md)** — HTML structure and properties for every OOTB field type
- **[references/subscribe-api.md](references/subscribe-api.md)** — subscribe function API reference, callback patterns, child subscriptions
- **[scripts/validate-registration.js](scripts/validate-registration.js)** — browser MCP diagnostic to verify the component loads

## Critical Rules

1. **Always use `cct create`** to scaffold — never manually create component files
2. **Always register in `mappings.js`** — add the `fd:viewType` to the `customComponents` array in `code/blocks/form/mappings.js`
3. **Always add `fd:viewType`** to the field in `form.json` — this links the field to its custom component
4. **`decorate()` extends, not replaces** — `fieldDiv` already contains the base field's HTML; modify it, don't rebuild from scratch
5. **Refer to HTML structures** — use [references/field-html-structure.md](references/field-html-structure.md) to understand the DOM you receive in `decorate()`
6. **Always use `{ listenChanges: true }`** — all new components must use the recommended subscribe pattern (see [references/subscribe-api.md](references/subscribe-api.md))

## Workflow

### 1. Identify base type and view type

- **`base_type`**: the OOTB field to extend (see Base Types table below)
- **`fd:viewType`**: custom identifier — lowercase, hyphen-separated (e.g., `countdown-timer`)

### 2. Add field to form.json

Add a field using the `base_type`'s `fieldType` and `sling:resourceType`, then add `fd:viewType`:

```json
"my_field": {
  "fieldType": "<base_type>",
  "sling:resourceType": "<base sling:resourceType>",
  "fd:viewType": "<your-view-type>",
  "name": "my_field",
  "jcr:title": "My Custom Field"
}
```

### 3. Scaffold the component

```bash
cct create <base_type> <fd:viewType>
```

This creates three files in `components/<fd:viewType>/`:

| File | Purpose |
|------|---------|
| `<fd:viewType>.js` | Component logic — exports `decorate()` |
| `<fd:viewType>.css` | Component styling |
| `_<fd:viewType>.json` | Custom authoring properties |

### 4. Register in mappings.js

Add your `fd:viewType` to the `customComponents` array in `code/blocks/form/mappings.js`:

```js
let customComponents = ['range', 'employer-search', '<fd:viewType>'];
```

### 5. Implement `decorate()` with subscribe wiring

Edit `<fd:viewType>.js`. Read [references/field-html-structure.md](references/field-html-structure.md) to understand the base HTML structure your component receives.

Use the `subscribe` function from `rules/index.js` with `{ listenChanges: true }` to connect the component to its field model. See [references/subscribe-api.md](references/subscribe-api.md) for the full API reference.

| If the component... | Pattern |
|---------------------|---------|
| Reacts to own field value/enum/visible changes | `{ listenChanges: true }` (recommended for all new components) |
| Watches child items inside a panel | `{ listenChanges: true }` on parent + `subscribe()` on each child wrapper element |

Key implementation points:
- Access custom properties via `fieldJson.properties.<propName>`
- Modify the `fieldDiv` (DOM node) — it already contains the OOTB HTML
- Dispatch `new Event('change', { bubbles: true })` on the underlying input when value changes programmatically
- Return `fieldDiv` from `decorate`

See decorate() Pattern below for the full template.

### 6. Define custom authoring properties

Edit `_<fd:viewType>.json` to add any additional properties in the `models` section. Read [references/custom-form-components.md](references/custom-form-components.md) section "Defining New Properties for Custom Components" for guidance.

Reference shared field containers where possible:
```json
{ "...": "../../models/form-common/_basic-validation-fields.json#/fields" }
```

Add only fields unique to this component explicitly.

### 7. Style the component

Edit `<fd:viewType>.css` with the required styles.

### 8. Build

```bash
npm run build:json
```

This compiles and merges all component JSON definitions into the served schema. Run this after adding or modifying the `_<fd:viewType>.json` file.

### 9. Validate (optional, requires browser MCP)

If you have a running form URL where the component is in use, validate that it loads correctly:

1. Navigate to the form URL using `browser_navigate`
2. Wait for the form to finish loading
3. Read [scripts/validate-registration.js](scripts/validate-registration.js) and inject it via `evaluate_script`, passing the component name as argument
4. Interpret results:

| Check | Pass | Fail action |
|-------|------|-------------|
| Form model | Form loaded | Ensure form URL is correct |
| Field using component | Field found with matching `:type` | Add to `mappings.js` and set `fd:viewType` in JSON |
| DOM component loaded | `componentStatus=loaded` | Check browser console for import errors |

## Tool Commands

| Action | Command |
|--------|---------|
| Scaffold component | `cct create <base_type> <fd:viewType>` |

The `cct` tool is available as a CLI. Run from the project root.

## Base Types

| base_type | Use For |
|-----------|---------|
| `text-input` | Single-line text entry |
| `number-input` | Numeric values |
| `email` | Email addresses |
| `telephone-input` | Phone numbers |
| `date-input` | Date values |
| `text` | Display-only text |
| `drop-down` | Select from options |
| `checkbox` | Single boolean toggle |
| `checkbox-group` | Multiple selections |
| `radio-group` | Single selection from options |
| `file-input` | File uploads |
| `button` | Clickable actions |
| `panel` | Container / grouping |
| `image` | Image display |

## File Structure (after scaffolding)

```
components/
└── <fd:viewType>/
    ├── <fd:viewType>.js       # decorate() function
    ├── <fd:viewType>.css      # Styles
    └── _<fd:viewType>.json    # Authoring properties
```

## decorate() Pattern

```js
import { subscribe } from '../../rules/index.js';

export default function decorate(fieldDiv, fieldJson, container, formId) {
  // fieldDiv  → the base component's HTML (already rendered)
  // fieldJson → field properties (enabled, visible, placeholder, etc.)
  // fieldJson.properties → any custom authoring properties from _<viewType>.json
  // formId    → the form's identifier

  const { myProp } = fieldJson?.properties || {};
  let model = null;

  subscribe(fieldDiv, formId, (_fieldDiv, fieldModel, eventType, payload) => {
    if (eventType === 'register') {
      model = fieldModel;
      // one-time setup: prefill DOM, attach event listeners
    } else if (eventType === 'change') {
      payload?.changes?.forEach((change) => {
        if (change?.propertyName === 'value') {
          // sync DOM with new model value
        } else if (change?.propertyName === 'enum' || change?.propertyName === 'enumNames') {
          // re-render options
        }
      });
    }
  }, { listenChanges: true });

  return fieldDiv;
}
```

**Key points:**
- `fieldDiv` is the already-rendered HTML of the base field type — extend it, don't replace it
- `fieldJson.properties` contains custom authoring properties defined in `_<fd:viewType>.json`
- Always use `{ listenChanges: true }` for new components
- For panel/container components with children, call `subscribe()` on each child wrapper inside the `'register'` callback — see [references/subscribe-api.md](references/subscribe-api.md) for the child pattern
- Refer to [references/field-html-structure.md](references/field-html-structure.md) for the exact HTML structure of each base type

## Examples

### Countdown Timer (extends `number-input`)

- **base_type**: `number-input` — captures a numeric duration value
- **fd:viewType**: `countdown-timer`

```bash
cct create number-input countdown-timer
```

Then register: add `'countdown-timer'` to `customComponents` in `mappings.js`.

### Card Choice (extends `radio-group`)

- **base_type**: `radio-group` — single selection from a set of options
- **fd:viewType**: `card-choice`

```bash
cct create radio-group card-choice
```

Then register: add `'card-choice'` to `customComponents` in `mappings.js`.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Component not rendering | Check that `fd:viewType` is added to `customComponents` in `mappings.js` |
| `decorate()` not called | Verify `fd:viewType` in `form.json` matches the component folder name exactly |
| Invalid base_type error | Use only valid base types from the table above |
| Styles not loading | Ensure CSS file name matches `<fd:viewType>.css` exactly |
| Using `model.subscribe()` on children | Use `subscribe(childEl, formId, cb, { listenChanges: true })` from `rules/index.js` instead |
| Forgetting `npm run build:json` | New properties won't appear in authoring — run after adding/modifying JSON schema |
| Change event not propagating | Dispatch `new Event('change', { bubbles: true })` on the underlying input |
| Infinite loop on value change | Guard `model.value` updates with value comparison — don't set inside a value change handler unconditionally |

## Example Workflow

**User**: "Create a custom slider component based on number-input that has min, max, and step properties"

1. Scaffold: `cct create number-input custom-slider`
2. Edit `_custom-slider.json`: add `min`, `max`, `step` fields
3. Edit `custom-slider.js`: create `<input type="range">`, wire `subscribe` with `{ listenChanges: true }` to sync value
4. Edit `custom-slider.css`: style the range input
5. Add `'custom-slider'` to `customComponents` in `mappings.js`
6. Add `fd:viewType: custom-slider` to the field in `form.json`
7. Run `npm run build:json`
8. Validate on running form (optional)