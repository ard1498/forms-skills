---
name: create-form
description: >
  Create and modify AEM Adaptive Form JSON files with proper field types, panel structure,
  colspan layout, and fragment integration. Handles fragment-first workflow and custom field
  creation. Use when building a new form, adding fields, modifying panels, or integrating
  fragments. Triggers: create form, add field, add panel, add fragment, modify form, layout.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
allowed-tools: Read, Write, Edit, Bash
---

# Form Architect

You design and modify `form.json` files to create well-structured AEM Adaptive Forms.

## Critical Rules

1. **Always check for fragments first** — before creating custom fields, check `refs/metadata.json` for existing fragments
2. **Act autonomously** — never ask "Should I add this?" or "Where should I place this?" — just do it
3. **Prefer fragments over custom fields** — if a fragment matches, use it instead of creating individual fields
4. **Report after, not before** — make changes first, then explain what you did
5. **Form location** — main form is always in `form/<form-name>.form.json`
6. **Variables belong in rules** — when variables need initializing, delegate to the **add-rules** skill. Do NOT create hidden fields for variables
7. **Always validate** — run the form validator after every edit

## Project Structure

```
<workspace>/
├── form/
│   ├── <form-name>.form.json      # Main form content
│   ├── <form-name>.rule.json      # Business logic (add-rules skill)
│   └── metadata.json              # Form sync metadata
├── refs/
│   ├── metadata.json              # Fragment registry
│   ├── <fragment>.form.json       # Fragment content
│   └── <fragment>.rule.json       # Fragment rules
└── code/                          # Custom functions (create-function skill)
```

## Decision Tree

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

## Fragment Workflow

**When:** A fragment in `refs/metadata.json` matches the user's request.

### Step 1: Read fragment metadata

```json
// refs/metadata.json
{
  "loginScreen": {
    "folderPath": "/content/dam/formsanddocuments/.../fragments",
    "originalPath": "/content/forms/af/.../fragments/loginScreen",
    "localFile": "loginScreen.form.json",
    "localRuleFile": "loginScreen.rule.json"
  }
}
```

### Step 2: Verify fragment contents

Read `refs/<localFile>` to confirm it has the needed fields.

### Step 3: Add fragment to form.json

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

### Step 4: Handle edge cases
- **Name conflict** → use alternative name (e.g., `home_address` if `address` exists)
- **Replacing existing fields** → remove old fields, place fragment in same position
- **Placement unclear** → add at end of form, before any submit button

### Step 5: Validate
```bash
form-validate <path-to-form.json>
```

## Custom Field Workflow

**When:** No fragment matches, or user explicitly wants custom fields.

### Step 1: Read current form
Read `form/<form-name>.form.json`.

### Step 2: Add/modify fields
Use valid field types from [references/field-types.md](references/field-types.md).

### Step 3: Validate
```bash
form-validate <path-to-form.json>
```

The validator checks:
- Valid fieldTypes
- Required properties (name, fieldType)
- Property types (string, boolean, number, array)
- Enum values (colspan, orientation, etc.)
- Constraints (minLength <= maxLength, etc.)
- Name format (must start with letter, alphanumeric + underscore only)

If validation fails, fix the reported errors before proceeding.

### Step 4: Report changes

## Form Structure

```
form
└── panelcontainer
    └── main_form_panel  ← fields go here
```

Minimal form.json root:
```json
{
  "jcr:primaryType": "nt:unstructured",
  "fieldType": "form",
  "sling:resourceType": "fd/franklin/components/form/v1/form",
  "fd:version": "2.1"
}
```

## Layout: Colspan

`colspan` controls field width (1–12 columns, **as string**).

| colspan | Width |
|---------|-------|
| "12" | Full width |
| "6" | Half width |
| "4" | Third width |
| "3" | Quarter width |

**Nesting:** colspan multiplies. A `"colspan": "6"` field inside a `"colspan": "6"` panel = 1/4 total width.

## Constraints

- Field names: **unique**, **snake_case**
- All fields must have `jcr:title`
- Radio/checkbox groups: **minimum 2 options**
- Pattern: valid JavaScript regex
- Min < max
- Dates: ISO 8601 format
- Dropdowns use `enum` (values) + `enumNames` (display labels)

## Examples

### Custom field — phone number:
```json
"phone_number": {
  "jcr:primaryType": "nt:unstructured",
  "sling:resourceType": "core/fd/components/form/textinput/v1/textinput",
  "fieldType": "text-input",
  "name": "phone_number",
  "jcr:title": "Phone Number",
  "placeholder": "+1234567890",
  "pattern": "^\\+?[1-9]\\d{1,14}$",
  "required": false,
  "colspan": "6"
}
```

### Dropdown with options:
```json
"country": {
  "sling:resourceType": "core/fd/components/form/dropdown/v1/dropdown",
  "fieldType": "drop-down",
  "name": "country",
  "jcr:title": "Country",
  "required": true,
  "enum": ["us", "uk", "ca"],
  "enumNames": ["United States", "United Kingdom", "Canada"]
}
```

### Fragment reference:
```json
"otp_screen": {
  "sling:resourceType": "core/fd/components/form/fragment/v1/fragment",
  "fieldType": "panel",
  "aueComponentId": "form-fragment",
  "name": "otp_screen",
  "jcr:title": "OTP Authentication",
  "fragmentPath": "/content/forms/af/.../fragments/otpAuthenticationScreen",
  "minOccur": 1
}
```

## Tool Commands

| Tool | Command |
|------|---------|
| Validate form | `form-validate <path-to-form.json>` |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No fragments available | `refs/metadata.json` empty or missing → create custom fields |
| Fragment name conflict | Use alternative unique name |
| Validator reports errors | Fix all errors before proceeding — see validator output |
| User wants custom, not fragment | Skip fragment check, create custom fields |
| Multiple fragments match | Pick the one with best field coverage |
| Can't find form file | Check `form/` folder for `<form-name>.form.json` |

## Field Types Reference

See [references/field-types.md](references/field-types.md) for the complete catalog of 14 valid field types with their `sling:resourceType`, `fieldType`, and key properties.