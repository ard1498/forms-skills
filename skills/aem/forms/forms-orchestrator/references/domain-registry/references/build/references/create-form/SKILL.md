---
name: create-form
description: >
  Creates and modifies AEM Forms form.json and fragment.form.json files. Handles adding,
  modifying, and deleting fields and panels, then validates output using a bundled EDS
  form validator. Use when the user needs to create a form or fragment, or add, change,
  or remove fields. Triggers: create form, create fragment, add field, modify field,
  delete field, add panel, layout.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
allowed-tools: Read, Write, Edit, Bash
---

# Form Architect

Creates and modifies `form.json` and `fragment.form.json` files for AEM Forms.

---

## File Types

- **`.form.json`** — form or fragment content (fields, panels, layout)
- **`.rule.json`** — business logic for the form or fragment (managed by `add-rules` skill)

Fragment files have the same `.form.json` structure as forms and are authored identically.

---

## Critical Rules

1. **Act autonomously** — Never ask "Should I add this?" or "Where should I place this?" — just do it
2. **Report after, not before** — Make changes first, then explain what you did
3. **File location** — The user provides the path to the `.form.json` file to create or edit
4. **Variables belong in rules, not form fields** — When variables need to be initialized, delegate to `add-rules` skill. Do NOT create hidden fields for variables.

---

## Workflows

### 1. Create Form or Fragment

1. Scaffold a new `.form.json` with a root panel and fields:
    ```json
    {
      "jcr:primaryType": "nt:unstructured",
      "fieldType": "form",
      "sling:resourceType": "fd/franklin/components/form/v1/form",
      "fd:version": "2.1",
      "panelcontainer": {
        "jcr:primaryType": "nt:unstructured",
        "sling:resourceType": "core/fd/components/form/panelcontainer/v1/panelcontainer",
        "fieldType": "panel",
        "name": "main_panel",
        "jcr:title": "Main Panel",
        "first_name": {
          "jcr:primaryType": "nt:unstructured",
          "sling:resourceType": "core/fd/components/form/textinput/v1/textinput",
          "fieldType": "text-input",
          "name": "first_name",
          "jcr:title": "First Name",
          "required": true
        }
      }
    }
    ```
2. Add fields inside the panel. See [references/field-types.md](references/field-types.md) for all field types and layout options.
3. Validate (see [Validation](#validation-required-after-every-change)).
4. Report what was created.

### 2. Add Fields

1. Read the target `.form.json` to understand current structure.
2. Insert the new field node at the correct position (before submit button if present, otherwise at end of panel).
3. Validate (see [Validation](#validation-required-after-every-change)).
4. Report what was added.

### 3. Modify Fields

1. Read the target `.form.json`.
2. Locate the field by its `name` property.
3. Update the relevant properties.
4. Validate.
5. Report what changed.

### 4. Delete Fields

1. Read the target `.form.json`.
2. Locate the field by its `name` property.
3. Remove the field node entirely.
4. Validate.
5. Report what was removed.

---

## Validation (Required After Every Change)

Run the bundled validator after every `form.json` modification:

```bash
form-validate <path-to-form.json>
```

Example:
```bash
form-validate form/sample.form.json
```

- Exit 0 = valid. Exit 1 = errors found.
- If validation fails, fix the reported errors and re-run until it passes.
- For details on what is checked, read [references/validation-rules.md](references/validation-rules.md).
- Requires Node.js 14+ (ES modules). No npm install needed.

---

## Field Types, Layout & Examples

See [references/field-types.md](references/field-types.md) for the complete field types table, colspan layout rules, and JSON examples.

---

## Constraints

- Field names: **unique**, **snake_case**
- All fields must have `jcr:title`
- Radio/checkbox groups: **minimum 2 options**
- Pattern: valid JavaScript regex
- Min < max
- Dates: ISO 8601 format
- Dropdowns use `enum` (values) + `enumNames` (display labels)

## Tool Commands

| Tool | Command |
|------|---------|
| Validate form | `form-validate <path-to-form.json>` |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't find form file | Check `form/` folder for `<form-name>.form.json` |
| Field not found when modifying/deleting | Search by `"name"` property throughout the JSON |
| Name conflict when adding | Use a unique snake_case name |
| Validator reports errors | Fix all errors before proceeding — see validator output |

## Field Types Reference

See [references/field-types.md](references/field-types.md) for the complete catalog of valid field types with their `sling:resourceType`, `fieldType`, and key properties.
