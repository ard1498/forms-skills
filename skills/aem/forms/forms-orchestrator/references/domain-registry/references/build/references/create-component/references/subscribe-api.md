# Subscribe API Reference

## Overview

The `subscribe` function (exported from `blocks/form/rules/index.js`) connects a custom component's DOM element to its form field model. It is the primary bridge between the view layer and the runtime model.

All new custom components should use `{ listenChanges: true }`.

## Function signature

```js
subscribe(fieldDiv, formId, callback, { listenChanges: true })
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `fieldDiv` | `HTMLElement` | The field's DOM wrapper. Must have `dataset.id` matching the field model's id (every rendered field wrapper has this automatically). |
| `formId` | `string` | The form's identifier (`htmlForm.dataset.id`). |
| `callback` | `Function` | See callback signatures below. |
| `options` | `Object` | Always pass `{ listenChanges: true }` for new components. |

## Callback signatures

The callback receives different arguments depending on the event type:

### Register event (always delivered, once)

```js
callback(fieldDiv, fieldModel, 'register')
```

Called once when the form model is ready. Use this for one-time setup: storing the model reference, reading initial state, attaching DOM event listeners.

### Change event (delivered on every model property change)

```js
callback(fieldDiv, fieldModel, 'change', payload)
```

Called on every `fieldChanged` event for this field. `payload.changes` is an array of:

```js
{ propertyName: string, currentValue: any, prevValue: any }
```

Common `propertyName` values: `value`, `enum`, `enumNames`, `visible`, `enabled`, `valid`, `label`, `properties`.

---

## Standard pattern (recommended for all new components)

```js
import { subscribe } from '../../rules/index.js';

export default function decorate(fieldDiv, fieldJson, container, formId) {
  let model = null;

  const handleModelChange = (changes) => {
    changes?.forEach((change) => {
      if (change?.propertyName === 'value') {
        // sync DOM with new value
      } else if (change?.propertyName === 'enum' || change?.propertyName === 'enumNames') {
        // re-render options
      }
    });
  };

  subscribe(fieldDiv, formId, (_fieldDiv, fieldModel, eventType, payload) => {
    if (eventType === 'register') {
      model = fieldModel;
      // one-time setup: prefill, DOM listeners, etc.
    } else if (eventType === 'change') {
      handleModelChange(payload?.changes);
    }
  }, { listenChanges: true });

  return fieldDiv;
}
```

---

## Child component subscriptions (panel/container components)

For panel or container components that need to watch child items, use `subscribe()` on each child's DOM wrapper element. Do **not** use `model.subscribe()` -- use the same `subscribe()` function from `rules/index.js`.

### How to find child models

Children can be found by `fieldType` (OOTB type) or by `':type'` (custom component name set via `fd:viewType` in JSON schema). The `:type` property is how the runtime identifies which custom component to load -- it matches against the `customComponents` / `OOTBComponentDecorators` arrays in `mappings.js`.

```js
// By fieldType (OOTB field type):
const checkbox = model.items?.find((item) => item.fieldType === 'checkbox');

// By :type (custom component or fd:viewType):
const modal = model.items?.find((item) => item[':type'] === 'modal');
```

### How to find child DOM elements

Each child field in the DOM has a wrapper with `data-id` matching the model's `id`. Use `[data-id="..."]` selector (not `#id`, which selects the inner input element).

```js
import { subscribe } from '../../rules/index.js';

export default function decorate(element, fd, container, formId) {
  subscribe(element, formId, (_element, model, eventType, payload) => {
    if (eventType === 'register') {
      // Find child models by fieldType or :type
      const checkbox = model.items?.find((item) => item.fieldType === 'checkbox');

      // Subscribe to child changes using their DOM wrapper elements
      if (checkbox) {
        const checkboxWrapper = element.querySelector(`[data-id="${checkbox.id}"]`);
        subscribe(checkboxWrapper, formId, (_el, _childModel, childEvent, childPayload) => {
          if (childEvent === 'register') {
            // child one-time setup
          } else if (childEvent === 'change') {
            childPayload?.changes?.forEach((change) => {
              if (change?.propertyName === 'value') {
                // react to checkbox value change
              }
            });
          }
        }, { listenChanges: true });
      }
    } else if (eventType === 'change') {
      // handle parent panel property changes (e.g., properties, visible)
    }
  }, { listenChanges: true });
}
```

### Important: use `[data-id="..."]` not `#id`

```js
// CORRECT: selects the field wrapper (has dataset.id)
const childEl = element.querySelector(`[data-id="${child.id}"]`);

// WRONG: selects the inner input/button element (no dataset.id)
const childEl = element.querySelector(`#${child.id}`);
```

---

## How `:type` works (component identification)

When `fd:viewType` is set in a component's JSON schema, the runtime stores it as the field's `:type` property. The `componentDecorator` function in `mappings.js` extracts `fd[':type']` and checks it against `customComponents` and `OOTBComponentDecorators` arrays to decide which component JS to load.

This means:
- **Parent finding children by `:type`**: `model.items?.find(item => item[':type'] === 'modal')` -- used when a child is itself a custom component
- **Parent finding children by `fieldType`**: `model.items?.find(item => item.fieldType === 'checkbox')` -- used when a child is a standard OOTB field

---

## Legacy pattern (still works, not recommended for new code)

The older pattern without `{ listenChanges: true }` uses `fieldModel.subscribe()` inside the register callback. This still works for backward compatibility but should not be used in new components.

```js
// LEGACY -- do not use for new components
subscribe(fieldDiv, formId, (_fieldDiv, fieldModel) => {
  model = fieldModel;

  fieldModel.subscribe((e) => {
    e.payload?.changes?.forEach((change) => {
      // handle property changes
    });
  }, 'change');
});
```

---

## Migration: legacy to new pattern

The new pattern receives the same `payload` as the form's `fieldChanged` event; that payload has the same `{ changes, field }` shape as the legacy `fieldModel.subscribe(..., 'change')` event's `e.payload`. So `payload.changes` in the new callback is identical to `e.payload.changes` in the legacy callback -- migration is a direct replacement.

### Before (legacy):

```js
subscribe(fieldDiv, formId, (_fieldDiv, fieldModel) => {
  model = fieldModel;
  fieldModel.subscribe((e) => {
    const { payload } = e;
    payload?.changes?.forEach((change) => {
      if (change?.propertyName === 'enumNames') { /* ... */ }
      else if (change?.propertyName === 'value') { /* ... */ }
    });
  }, 'change');
});
```

### After (recommended):

```js
subscribe(fieldDiv, formId, (_fieldDiv, fieldModel, eventType, payload) => {
  if (eventType === 'register') {
    model = fieldModel;
  } else if (eventType === 'change') {
    payload?.changes?.forEach((change) => {
      if (change?.propertyName === 'enumNames') { /* ... */ }
      else if (change?.propertyName === 'value') { /* ... */ }
    });
  }
}, { listenChanges: true });
```
