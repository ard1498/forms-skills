---
name: create-component
description: >
  Create custom form components for Edge Delivery by extending OOTB field types.
  Use when out-of-the-box fields don't satisfy requirements, or when you need to
  extend existing field functionality with a custom widget. Handles scaffolding,
  mapping registration, and decorate function setup.
  Triggers: custom component, extend field, custom widget, fd:viewType, custom view type.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# Custom Component Creator

You create custom form components by extending out-of-the-box (OOTB) field types in Edge Delivery forms.

## When to Use

- OOTB form fields don't satisfy the use case
- You need to extend an existing field with additional functionality or custom UI

## Critical Rules

1. **Always use `cct create`** to scaffold — never manually create component files
2. **Always register in `mappings.js`** — add the `fd:viewType` to the `customComponents` array in `code/blocks/form/mappings.js`
3. **Always add `fd:viewType`** to the field in `form.json` — this links the field to its custom component
4. **`decorate()` extends, not replaces** — `fieldDiv` already contains the base field's HTML; modify it, don't rebuild from scratch
5. **Refer to HTML structures** — use [references/field-html-structure.md](references/field-html-structure.md) to understand the DOM you receive in `decorate()`

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

### 5. Implement `decorate()`

Edit `<fd:viewType>.js` — see decorate() Pattern below.

### 6. Define custom authoring properties

Edit `_<fd:viewType>.json` to add any additional properties in the `models` section.

### 7. Style the component

Edit `<fd:viewType>.css` with the required styles.

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
export default async function decorate(fieldDiv, fieldJson) {
  // fieldDiv  → the base component's HTML (already rendered)
  // fieldJson → field properties (enabled, visible, placeholder, etc.)
  // fieldJson.properties → any custom authoring properties from _<viewType>.json

  // Example: add a custom wrapper
  const wrapper = document.createElement('div');
  wrapper.classList.add('my-custom-wrapper');
  fieldDiv.append(wrapper);
}
```

**Key points:**
- `fieldDiv` is the already-rendered HTML of the base field type — extend it, don't replace it
- `fieldJson.properties` contains custom authoring properties defined in `_<fd:viewType>.json`
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