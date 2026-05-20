---
name: forms-custom-components
description: >
  Use when out-of-the-box AEM Adaptive Form fields do not meet requirements,
  or when extending a field with a custom EDS widget using the fd:viewType
  pattern.
  Triggers: custom component, extend field, custom widget, fd:viewType,
  custom view type, custom AEM form component, EDS form component.
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

1. **Always use `npm run create:custom-component`** to scaffold — never manually create component files
2. **Always register in `mappings.js`** — add the `fd:viewType` to the `customComponents` array in `blocks/form/mappings.js` (EDS repo root)
3. **Always add `fd:viewType`** to the field in `form.json` — this links the field to its custom component
4. **`decorate()` extends, not replaces** — `fieldDiv` already contains the base field's HTML; modify it, don't rebuild from scratch
5. **Refer to HTML structures** — use [references/field-html-structure.md](references/field-html-structure.md) to understand the DOM you receive in `decorate()`
6. **Always use `{ listenChanges: true }`** — all new components must use the recommended subscribe pattern (see [references/subscribe-api.md](references/subscribe-api.md))
7. **Match the child pattern to the base type** — behavior depends on whether the base has child **field models** or enum **options**:
   - **Panel/container bases** (`panel`, custom containers — `model.items` is populated, each child wrapper has `data-id`): find children via `model.items`, resolve each wrapper with `element.querySelector('[data-id="${child.id}"]')`, and call `subscribe()` on that wrapper. Do **not** locate child field wrappers with class selectors, and do **not** attach DOM event listeners to child internals to detect field state — react through child `subscribe` callbacks.
   - **Enum-based bases** (`checkbox-group`, `radio-group`, `drop-down` — options have `id` but no `data-id`, no `model.items`): options are enum entries, not field models. Iterate option wrappers (`.checkbox-wrapper`, `.radio-wrapper`, `<option>`) to transform option UI, and react to selection via the parent field's `value`/`enum` change through `subscribe(fieldDiv, ..., { listenChanges: true })`.

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

Run from the EDS repo root (`$FORMS_EDS_ROOT`):

```bash
npm run create:custom-component -- --name <fd:viewType> --base <base_type>
```

This creates three files in `blocks/form/components/<fd:viewType>/`:

| File | Purpose |
|------|---------|
| `<fd:viewType>.js` | Component logic — exports `decorate()` |
| `<fd:viewType>.css` | Component styling |
| `_<fd:viewType>.json` | Custom authoring properties |

### 4. Register in mappings.js

Add your `fd:viewType` to the `customComponents` array in `blocks/form/mappings.js` (EDS repo root):

```js
let customComponents = ['range', 'employer-search', '<fd:viewType>'];
```

### 5. Implement `decorate()` with subscribe wiring

Edit `<fd:viewType>.js`. Read [references/field-html-structure.md](references/field-html-structure.md) to understand the base HTML structure your component receives.

Use the `subscribe` function from `rules/index.js` with `{ listenChanges: true }` to connect the component to its field model. See [references/subscribe-api.md](references/subscribe-api.md) for the full API reference.

| If the component... | Pattern |
|---------------------|---------|
| Reacts to its own field value/enum/visible changes | `subscribe(fieldDiv, formId, cb, { listenChanges: true })` |
| Extends an enum-based base (`checkbox-group`, `radio-group`, `drop-down`) to customize option UI | Iterate option wrappers (`.checkbox-wrapper`, `.radio-wrapper`, `<option>`) inside the `'register'` callback to transform their DOM; react to group `value`/`enum` changes via the parent `subscribe` callback. Options have no child field models, so `subscribe()` per option does not apply. |
| Extends a panel/container base with child **field** models (`model.items` populated) | `subscribe` on parent, then inside `'register'` find each child via `model.items` and call `subscribe(childWrapper, ...)` on the child's `[data-id]` wrapper. Do **not** locate child field wrappers with class selectors. |

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
| Scaffold component | `npm run create:custom-component -- --name <fd:viewType> --base <base_type>` |

Run from the EDS repo root (`$FORMS_EDS_ROOT`).

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
- When the base has child **field** models (`model.items` populated — panel/container), drive child behavior through `subscribe()` on each child's `[data-id]` wrapper (see child template below)
- When the base is enum-based (`checkbox-group`, `radio-group`, `drop-down`), options are not field models — iterate option wrappers to transform option UI
- Refer to [references/field-html-structure.md](references/field-html-structure.md) for the exact HTML structure of each base type

### Child subscription template (panel/container components with `model.items`)

```js
subscribe(fieldDiv, formId, (_fieldDiv, model, eventType) => {
  if (eventType === 'register') {
    model.items?.forEach((child) => {
      const childWrapper = fieldDiv.querySelector(`[data-id="${child.id}"]`);
      if (!childWrapper) return;
      subscribe(childWrapper, formId, (_el, _childModel, childEvent, childPayload) => {
        if (childEvent === 'register') {
          // one-time child setup
        } else if (childEvent === 'change') {
          childPayload?.changes?.forEach((change) => {
            if (change?.propertyName === 'value') {
              // react to child value change via model, not DOM events
            }
          });
        }
      }, { listenChanges: true });
    });
  }
}, { listenChanges: true });
```

**Anti-patterns for panel/container components (do not do this when children are field models):**

```js
// WRONG: class-based lookup of child FIELD wrappers in a panel
fieldDiv.querySelectorAll('.field-wrapper').forEach((childFieldEl) => {
  // bypasses model.items + [data-id] lookup
});

// WRONG: listening to DOM events on child field internals to detect field state
fieldDiv.querySelectorAll('input').forEach((input) => {
  input.addEventListener('change', () => { /* read value from model, via child subscribe instead */ });
});
```

These anti-patterns **do not apply** to enum-based bases — iterating `.checkbox-wrapper`, `.radio-wrapper`, or `<option>` is correct for `checkbox-group`, `radio-group`, and `drop-down` extensions because those options are not field models.

## Examples

### Countdown Timer (extends `number-input`)

- **base_type**: `number-input` — captures a numeric duration value
- **fd:viewType**: `countdown-timer`

```bash
npm run create:custom-component -- --name countdown-timer --base number-input
```

Then register: add `'countdown-timer'` to `customComponents` in `mappings.js`.

### Card Choice (extends `radio-group`)

- **base_type**: `radio-group` — single selection from a set of options
- **fd:viewType**: `card-choice`

```bash
npm run create:custom-component -- --name card-choice --base radio-group
```

Then register: add `'card-choice'` to `customComponents` in `mappings.js`.

## Modal / Overlay Components

Modal and overlay panels are custom components backed by `panel` as the base type. They are initially hidden in `form.json` and shown/hidden by rules or custom functions. Use `forms-custom-components` to attach CSS + JS behavior to a standard panel.

### Pattern overview

1. **Model the modal as a hidden panel** in `form.json`:

```json
"confirmModal": {
  "fieldType": "panel",
  "sling:resourceType": "core/fd/components/form/panelcontainer/v1/panelcontainer",
  "fd:viewType": "confirm-modal",
  "name": "confirmModal",
  "jcr:title": "Confirm",
  "visible": false
}
```

2. **Scaffold and register:**

```bash
npm run create:custom-component -- --name confirm-modal --base panel
```

Add `'confirm-modal'` to `customComponents` in `mappings.js`.

3. **Implement `decorate()`** — add a backdrop, apply CSS transitions, and wire the close gesture:

```js
import { subscribe } from '../../rules/index.js';

export default function decorate(fieldDiv, fieldJson, container, formId) {
  fieldDiv.classList.add('modal-panel');

  // Backdrop — click outside to close
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.addEventListener('click', () => {
    // Dispatch a close event; the rule wired to the close button handles hiding
    fieldDiv.dispatchEvent(new CustomEvent('modal:close', { bubbles: true }));
  });
  fieldDiv.prepend(backdrop);

  subscribe(fieldDiv, formId, (_el, _model, eventType, payload) => {
    if (eventType === 'change') {
      payload?.changes?.forEach((change) => {
        if (change?.propertyName === 'visible') {
          // Sync backdrop visibility with panel visibility
          backdrop.style.display = change.currentValue ? 'block' : 'none';
        }
      });
    }
  }, { listenChanges: true });

  return fieldDiv;
}
```

4. **Style** `confirm-modal.css` — position the panel as a fixed overlay and style the backdrop.

5. **Wire visibility rules** in `forms-rule-creator` — use SHOW_STATEMENT / HIDE_STATEMENT on the modal panel from any trigger (button click, API error, custom event).

> **Key point:** Showing/hiding is always done via the form model (rules or `globals.functions.setProperty`), never by toggling CSS `display` directly. The `subscribe` callback on the `visible` property is how the component learns it was shown/hidden so it can sync any secondary DOM (like the backdrop).

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Component not rendering | Check that `fd:viewType` is added to `customComponents` in `mappings.js` |
| `decorate()` not called | Verify `fd:viewType` in `form.json` matches the component folder name exactly |
| Invalid base_type error | Use only valid base types from the table above |
| Styles not loading | Ensure CSS file name matches `<fd:viewType>.css` exactly |
| Using `model.subscribe()` on children | Use `subscribe(childEl, formId, cb, { listenChanges: true })` from `rules/index.js` instead |
| For panel/container bases: locating child **field** wrappers by class selectors | Use `model.items` + `element.querySelector('[data-id="${child.id}"]')`, then `subscribe()` on the wrapper. (Does **not** apply to enum-based bases — see next row.) |
| For panel/container bases: reading child field values via DOM `change` listeners on child `<input>` elements | Read child values from the child's `subscribe` callback `payload.changes` instead — don't attach listeners to child field internals |
| For `checkbox-group` / `radio-group` extensions: trying `subscribe()` on each `.checkbox-wrapper` / `.radio-wrapper` | Options are enum entries, not field models (no `data-id`). Iterate option wrappers to transform UI; react to selection via the parent's `subscribe` callback on `value`/`enum` changes |
| Forgetting `npm run build:json` | New properties won't appear in authoring — run after adding/modifying JSON schema |
| Change event not propagating | Dispatch `new Event('change', { bubbles: true })` on the underlying input |
| Infinite loop on value change | Guard `model.value` updates with value comparison — don't set inside a value change handler unconditionally |

## Example Workflow

**User**: "Create a custom slider component based on number-input that has min, max, and step properties"

1. Scaffold: `npm run create:custom-component -- --name custom-slider --base number-input`
2. Edit `_custom-slider.json`: add `min`, `max`, `step` fields
3. Edit `custom-slider.js`: create `<input type="range">`, wire `subscribe` with `{ listenChanges: true }` to sync value
4. Edit `custom-slider.css`: style the range input
5. Add `'custom-slider'` to `customComponents` in `mappings.js`
6. Add `fd:viewType: custom-slider` to the field in `form.json`
7. Run `npm run build:json`
8. Validate on running form (optional)