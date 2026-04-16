# Creating Custom Form Components

This guide explains how to create custom components for the Form block, which follows an MVC (Model-View-Controller) architecture. It covers the structure, authorable properties, extension mechanism, and best practices for custom components.

---

## Architecture Overview
- **Model:** Defined by the JSON schema for each field/component. Authorable properties are specified in the corresponding JSON file (see `blocks/form/models/form-components`).
- **View:** The HTML structure for each field type is described in [field-html-structure.md](./field-html-structure.md). This is the base structure your component will extend or modify.
- **Controller/Component Logic:** Implemented in JavaScript, either as OOTB (out-of-the-box) or custom components.

---

## OOTB Components
- OOTB (out-of-the-box) components are located in `blocks/form/models/form-components`.
- Each OOTB component has a JSON file defining its authorable properties (e.g., `_text-input.json`, `_drop-down.json`).
- These properties are available to authors in the form builder and are passed to the component as part of the field definition (`fd`).
- The base HTML structure for each OOTB component is documented in [field-html-structure.md](./field-html-structure.md).

---

## Custom Components: Structure & Placement
- Custom components reside in the `blocks/form/components` folder.
- Each custom component must be placed in its own folder, named after the component (e.g., `countdown-timer`).
- Inside the folder, you must have:
  - `countdown-timer.js` (main logic)
  - `countdown-timer.css` (optional, for styles)
- The name of the folder and the JS/CSS files must match.

---

## Defining New Properties for Custom Components
- If you need to capture new properties for your custom component, **create a new JSON file** in `blocks/form/models/form-components` that extends an existing component definition.
- This is typically done by referencing the base component and adding or overriding properties as needed.
- The new JSON file should include the new properties under the `properties` or `fields` section.
- **Example: Countdown Timer**
  - See `_countdown-timer.json` for a real-world example. This file defines a custom component that extends the base button component and adds new properties like `initialText`, `finalText`, `time`, and `retries`.
  - These properties are defined in the `fields` array of the JSON file, making them available to authors in the form builder.
- The custom component can also be identified using the `:type` property, which can be set as `fd:viewType` in the JSON file (e.g., `fd:viewType: countdown-timer`). This allows the system to recognize and load the correct custom component.
- Any new properties added in the JSON definition are available in the field definition as `properties.<propertyName>` in your component's JS logic.

---

## Extending OOTB Components
- Custom components **must extend** from a predefined set of OOTB components.
- The system identifies which custom component to load using two mechanisms:
  1. **`:type`** (set via `fd:viewType` in the JSON schema) — checked against both `customComponents` and `OOTBComponentDecorators` in `mappings.js`.
  2. **`properties.variant`** (set in authoring) — checked against `customComponents` only.
- When either matches a registered name, the system loads the corresponding JS and CSS files from `blocks/form/components/<name>/`.
- The custom component is then applied to the base HTML structure of the OOTB component, allowing you to enhance or override its behavior and appearance.

---

## Component JS API
- Your custom component's JS file **must export a default function** (commonly called `decorate`).
- **Signature:**
  ```js
  export default function decorate(element, fd, container, formId) {
    // element: The HTML structure of the OOTB component you are extending
    // fd: The JSON field definition (all authorable properties)
    // container: The parent element (fieldset or form)
    // formId: The id of the form
    // ... your logic here ...
  }
  ```
- You can modify the `element`, add event listeners, inject additional markup, etc.
- Access any new properties you defined in your JSON as `fd.properties.<propertyName>`.

---

## Listening to Field Changes: How `subscribe` Works
- The `subscribe` function (from `blocks/form/rules/index.js`) connects your component to its field model. Always use `{ listenChanges: true }` for new components.
- **Callback Signature:**
  - `callback(element, fieldModel, 'register')` — called once when the model is ready
  - `callback(element, fieldModel, 'change', payload)` — called on every property change (when `listenChanges` is true)
  - `payload.changes` is an array of `{ propertyName, currentValue, prevValue }`
- For the full API reference, callback patterns, and child subscription examples, see [subscribe-api.md](./subscribe-api.md).
- **Example: Countdown Timer**
  ```js
  import { subscribe } from '../../rules/index.js';

  export default function decorate(fieldDiv, fieldJson, container, formId) {
    const { initialText, finalText, time } = fieldJson?.properties;

    let model = null;

    subscribe(fieldDiv, formId, (_fieldDiv, fieldModel, eventType, payload) => {
      if (eventType === 'register') {
        model = fieldModel;
        // one-time setup...
      } else if (eventType === 'change') {
        payload?.changes?.forEach((change) => {
          if (change?.propertyName === 'value') {
            // react to value changes
          }
        });
      }
    }, { listenChanges: true });
  }
  ```
- **Panel/container components** that watch child items should call `subscribe()` on each child's DOM wrapper inside the parent's `'register'` callback. Find child wrappers with `element.querySelector('[data-id="${child.id}"]')` and find child models by `fieldType` or `':type'`. See [subscribe-api.md](./subscribe-api.md) for the full child pattern.

---

## Reusing and Extending Fields in Custom Components

When defining fields in your custom component's JSON (for any field group—basic, validation, help, etc.), follow these best practices for maintainability and consistency:

- **Reuse standard/shared fields** by referencing existing shared containers or field definitions (e.g., `../form-common/_basic-input-placeholder-fields.json#/fields`, `../form-common/_basic-validation-fields.json#/fields`). This ensures you inherit all standard options without duplicating them.
- **Add only new or custom fields** explicitly in your container. This keeps your schema DRY and focused.
- **Remove or avoid duplicating fields** that are already included via references. Only define fields that are unique to your component's logic.
- **Reference help containers and other shared content** (e.g., `../form-common/_help-container.json`) as needed for consistency and maintainability.

**Minimal Example: Container in a Custom Component JSON**
```json
{
  "component": "container",
  "name": "validation",
  "label": "Validation",
  "collapsible": true,
  "fields": [
    { "...": "../form-common/_basic-validation-fields.json#/fields" },
    { "component": "number", "name": "minAge", "label": "Minimum Age", "valueType": "number", "description": "Minimum age allowed for date of birth." },
    { "component": "number", "name": "maxAge", "label": "Maximum Age", "valueType": "number", "description": "Maximum age allowed for date of birth." }
  ]
}
```

---

## Best Practices
- **Keep your component logic focused**: Only add/override what is necessary for your custom behavior.
- **Leverage the base structure**: Use the OOTB HTML as your starting point.
- **Use authorable properties**: Expose configurable options via the JSON schema.
- **Namespace your CSS**: Avoid style collisions by using unique class names.
- **Test with different field values and events**.

---

## References
- [field-html-structure.md](./field-html-structure.md): Base HTML structures and properties for all field types.
- [subscribe-api.md](./subscribe-api.md): Subscribe function API reference and patterns.
- `blocks/form/models/form-components`: OOTB and custom component property definitions.
- `blocks/form/components`: Place for your custom components.
