# AEM Adaptive Forms — Field Types Reference

Complete catalog of valid field types for form.json.

## Field Type Catalog

| Type | fieldType | sling:resourceType | Key Properties |
|------|-----------|-------------------|----------------|
| Text display | `plain-text` | `core/fd/components/form/text/v1/text` | name, label |
| Text input | `text-input` | `core/fd/components/form/textinput/v1/textinput` | name, label, required, pattern, placeholder |
| Number | `number-input` | `core/fd/components/form/numberinput/v1/numberinput` | name, label, min, max, step |
| Date | `date-input` | `core/fd/components/form/datepicker/v1/datepicker` | name, label, min, max |
| Email | `email` | `core/fd/components/form/emailinput/v1/emailinput` | name, label, required, pattern |
| File upload | `file-input` | `core/fd/components/form/fileinput/v2/fileinput` | name, label, accept, maxSize |
| Dropdown | `drop-down` | `core/fd/components/form/dropdown/v1/dropdown` | name, label, enum, enumNames |
| Radio group | `radio-group` | `core/fd/components/form/radiobutton/v1/radiobutton` | name, label, enum, enumNames |
| Checkbox group | `checkbox-group` | `core/fd/components/form/checkboxgroup/v1/checkboxgroup` | name, label, enum, enumNames |
| Single checkbox | `checkbox` | `core/fd/components/form/checkbox/v1/checkbox` | name, label |
| Panel/Section | `panel` | `core/fd/components/form/panelcontainer/v1/panelcontainer` | title, fields |
| Button | `button` | `core/fd/components/form/button/v1/button` | name, label, type |
| Fragment | `panel` | `core/fd/components/form/fragment/v1/fragment` | name, fragmentPath, minOccur |

**Note:** Fragment and Panel share `fieldType: "panel"` — distinguished by `sling:resourceType`.

## Common Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Unique field identifier (snake_case) |
| `jcr:title` | string | Display label |
| `jcr:primaryType` | string | Always `"nt:unstructured"` |
| `sling:resourceType` | string | Component type identifier |
| `fieldType` | string | Field type from catalog above |
| `required` | boolean | Whether field is mandatory |
| `colspan` | string | Layout width (1–12, as string) |
| `placeholder` | string | Placeholder text |
| `pattern` | string | Validation regex (JavaScript format) |
| `visible` | boolean | Initial visibility |
| `enabled` | boolean | Whether field is editable |
| `default` | varies | Default value |

## Dropdown/Radio/Checkbox Options

Options use parallel arrays:
```json
{
  "enum": ["value1", "value2", "value3"],
  "enumNames": ["Display 1", "Display 2", "Display 3"]
}
```

- `enum` — machine-readable values
- `enumNames` — human-readable display labels
- Arrays must be same length
- Minimum 2 options for radio/checkbox groups

## Number Field Properties

| Property | Type | Description |
|----------|------|-------------|
| `minimum` | number | Minimum value |
| `maximum` | number | Maximum value |
| `step` | number | Step increment |
| `minimumMessage` | string | Error for below minimum |
| `maximumMessage` | string | Error for above maximum |

## Text Field Properties

| Property | Type | Description |
|----------|------|-------------|
| `minLength` | number | Minimum character count |
| `maxLength` | number | Maximum character count |
| `pattern` | string | Regex validation pattern |

## File Input Properties

| Property | Type | Description |
|----------|------|-------------|
| `accept` | string | Accepted MIME types (e.g., ".pdf,.jpg") |
| `maxFileSize` | string | Maximum file size |

## Constraints

- Field names: **unique**, **snake_case**
- All fields must have `jcr:title`
- Radio/checkbox groups: **minimum 2 options**
- Pattern: valid JavaScript regex
- Min < max (minLength ≤ maxLength, minimum ≤ maximum)
- Dates: ISO 8601 format
- Dropdowns use `enum` (values) + `enumNames` (display labels)

## Layout: Colspan

`colspan` controls field width (1–12 columns, **as string**).

| colspan | Width |
|---------|-------|
| "12" | Full width |
| "6" | Half width |
| "4" | Third width |
| "3" | Quarter width |

**Nesting:** colspan multiplies. A `"colspan": "6"` field inside a `"colspan": "6"` panel = 1/4 total width.

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