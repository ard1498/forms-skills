---
name: create-form
description: >
  Creates and modifies AEM Forms form.json and fragment.form.json files. Handles adding,
  modifying, and deleting fields and panels, fragment integration, and validates output
  using a bundled EDS form validator. Use when the user needs to create a form or fragment,
  add or integrate fragments, or add, change, or remove fields. Triggers: create form,
  create fragment, add field, add fragment, modify field, delete field, add panel, layout.
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

1. **Always check for fragments first** — before creating custom fields, check `refs/metadata.json` for existing fragments
2. **Act autonomously** — Never ask "Should I add this?" or "Where should I place this?" — just do it
3. **Prefer fragments over custom fields** — if a fragment matches, use it instead of creating individual fields
4. **Report after, not before** — Make changes first, then explain what you did
5. **File location** — The user provides the path to the `.form.json` file to create or edit
6. **Variables belong in rules, not form fields** — When variables need to be initialized, delegate to `add-rules` skill. Do NOT create hidden fields for variables.
7. **Always validate** — run the form validator after every edit

---

## Fragment vs Custom Field

```
User requests fields
        ↓
Read refs/metadata.json
        ↓
┌─────────────────────────────────────┐
│ Does a fragment match the request?  │
└─────────────────────────────────────┘
        ↓                    ↓
      YES                   NO
        ↓                    ↓
  Fragment Workflow     Custom Field Workflow
```

### Fragment Workflow

**When:** A fragment in `refs/metadata.json` matches the user's request.

1. **Read fragment metadata:**
    ```json
    // refs/metadata.json
    {
      "loginScreen": {
        "folderPath": "/content/dam/formsanddocuments/.../fragments",
        "originalPath": "/content/forms/af/.../fragments/loginScreen",
        "localFile": "loginScreen.form.json",
        "localRuleFile": "loginScreen.rule.json",
        "fragment": true
      }
    }
    ```
2. **Verify fragment contents** — read `refs/<localFile>` to confirm it has the needed fields.
3. **Add fragment to form.json:**
    ```json
    "<unique_name>": {
      "sling:resourceType": "core/fd/components/form/fragment/v1/fragment",
      "fieldType": "panel",
      "aueComponentId": "form-fragment",
      "name": "<unique_name>",
      "jcr:title": "<Display Title>",
      "fragmentPath": "<originalPath from metadata>",
      "minOccur": 1
    }
    ```
4. **Handle edge cases:**
    - **Name conflict** → use alternative name (e.g., `home_address` if `address` exists)
    - **Replacing existing fields** → remove old fields, place fragment in same position
    - **Placement unclear** → add at end of form, before any submit button
5. **Validate** (see [Validation](#validation-required-after-every-change)).

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

## Field Types, Layout, Constraints & Examples

See [references/field-types.md](references/field-types.md) for the complete field types table, property details, constraints, colspan layout rules, and JSON examples.

## Tool Commands

| Tool | Command |
|------|---------|
| Validate form | `form-validate <path-to-form.json>` |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No fragments available | `refs/metadata.json` empty or missing → create custom fields |
| Fragment name conflict | Use alternative unique name |
| User wants custom, not fragment | Skip fragment check, create custom fields |
| Multiple fragments match | Pick the one with best field coverage |
| Can't find form file | Check `form/` folder for `<form-name>.form.json` |
| Field not found when modifying/deleting | Search by `"name"` property throughout the JSON |
| Name conflict when adding | Use a unique snake_case name |
| Validator reports errors | Fix all errors before proceeding — see validator output |
