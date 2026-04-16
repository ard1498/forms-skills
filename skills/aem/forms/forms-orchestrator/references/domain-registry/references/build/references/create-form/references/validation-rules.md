# EDS Form Validator - Validation Rules

This document provides detailed documentation of all validation rules applied by the EDS Form Field Validator.

## Table of Contents

1. [Field Type Validation](#1-field-type-validation)
2. [Name Validation](#2-name-validation)
3. [Property Validation](#3-property-validation)
4. [Type Validation](#4-type-validation)
5. [Enum Value Validation](#5-enum-value-validation)
6. [Constraint Validation](#6-constraint-validation)
7. [fd:viewType Validation](#7-fdviewtype-validation)
8. [Pattern Validation](#8-pattern-validation)

---

## 1. Field Type Validation

### Rule: `fieldType` Must Be Present

Every form field must have a `fieldType` property that specifies its component type.

**Error Type**: `MISSING_REQUIRED`

**Example Error**:
```json
{
  "name": "firstName"
}
```

**Fix**:
```json
{
  "fieldType": "text-input",
  "name": "firstName"
}
```

### Rule: `fieldType` Must Be Valid

The `fieldType` must be one of the recognized values.

**Error Type**: `INVALID_VALUE`

**Valid Field Types**:
- `form` - Root form container
- `text-input` - Single-line text
- `multiline-input` - Multi-line text area
- `email` - Email input
- `telephone-input` - Phone number
- `number-input` - Numeric input
- `date-input` - Date picker
- `password` - Password input
- `drop-down` - Select dropdown
- `checkbox` - Single checkbox
- `checkbox-group` - Multiple checkboxes
- `radio-group` - Radio buttons
- `file-input` - File upload
- `panel` - Container/grouping
- `wizard` - Multi-step wizard
- `accordion` - Collapsible sections
- `modal` - Modal dialog
- `form-accordion` - Form accordion
- `form-modal` - Form modal
- `form-button` - Generic button
- `button` - Alias for form-button
- `form-submit-button` - Submit button
- `form-reset-button` - Reset button
- `plain-text` - Static text
- `form-image` - Image display
- `form-fragment` - Reusable fragment
- `captcha` - CAPTCHA
- `rating` - Star rating
- `range` - Slider
- `tnc` - Terms and conditions

---

## 2. Name Validation

### Rule: `name` Must Be Present

Most field types require a `name` property for data binding and identification.

**Error Type**: `MISSING_REQUIRED`

**Fields Requiring Name**: All except `form` (where it's optional)

### Rule: `name` Must Be a String

The `name` property must be a string value.

**Error Type**: `INVALID_TYPE`

**Example Error**:
```json
{
  "fieldType": "text-input",
  "name": 123
}
```

### Rule: `name` Format

The name must match the pattern `^[a-zA-Z][a-zA-Z0-9_]*$`:
- Must start with a letter (a-z, A-Z)
- Can contain letters, numbers, and underscores
- Cannot start with a number
- Cannot start with an underscore
- Cannot contain special characters or spaces

**Error Type**: `INVALID_FORMAT`

**Valid Examples**:
- `firstName`
- `email_address`
- `field1`
- `Address2`

**Invalid Examples**:
- `1field` - Starts with number
- `_private` - Starts with underscore
- `first-name` - Contains hyphen
- `first name` - Contains space
- `field@email` - Contains special character

---

## 3. Property Validation

### Rule: Properties Must Be Valid for Field Type

Each field type has a specific set of allowed properties. Properties not in this list are flagged as errors.

**Error Type**: `INVALID_PROPERTY`

### Allowed Properties by Field Type

#### text-input
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan, placeholder, default, multiLine,
required, mandatoryMessage, validateExpMessage,
minLength, minLengthMessage, maxLength, maxLengthMessage,
pattern, validatePictureClauseMessage, validatePatternMessage,
description, tooltip, isTitleRichText, type
```

#### email
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan, placeholder, default,
required, mandatoryMessage, validateExpMessage,
minLength, minLengthMessage, maxLength, maxLengthMessage,
pattern, validatePictureClauseMessage, validatePatternMessage,
description, tooltip
```

#### multiline-input
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan, placeholder, default, multiLine,
required, mandatoryMessage, validateExpMessage,
minLength, minLengthMessage, maxLength, maxLengthMessage,
pattern, validatePictureClauseMessage, validatePatternMessage,
description, tooltip
```

#### telephone-input
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan, placeholder, default,
required, mandatoryMessage, validateExpMessage,
minimum, minimumMessage, maximum, maximumMessage,
pattern, validatePictureClauseMessage, validatePatternMessage,
description, tooltip
```

#### number-input
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan, placeholder, default, type,
required, mandatoryMessage, validateExpMessage,
minimum, minimumMessage, maximum, maximumMessage,
displayFormat, description, tooltip, lang, isTitleRichText
```

#### date-input
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan, placeholder, default,
required, mandatoryMessage, validateExpMessage,
minimumDate, minimumMessage, maximumDate, maximumMessage,
displayFormat, description, tooltip
```

#### drop-down
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan, placeholder, default,
enum, enumNames, multiSelect, type,
required, mandatoryMessage, validateExpMessage,
description, tooltip
```

#### checkbox
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan, default,
type, checkedValue, enableUncheckedValue, uncheckedValue,
required, mandatoryMessage, validateExpMessage,
description, tooltip
```

#### checkbox-group
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan, default,
enum, enumNames, variant, type, orientation,
required, mandatoryMessage, validateExpMessage,
description, tooltip
```

#### radio-group
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan, default,
enum, enumNames, variant, type, orientation,
required, mandatoryMessage, validateExpMessage,
description, tooltip
```

#### file-input
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan, type,
buttonText, dragDropText,
required, mandatoryMessage, validateExpMessage,
maxFileSize, maxFileSizeMessage, accept, acceptMessage,
description, tooltip
```

#### panel
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan,
repeatable, minOccur, maxOccur, variant,
repeatAddButtonLabel, repeatDeleteButtonLabel,
description, tooltip, isTitleRichText
```

#### form-button / button
```
name, fieldType, jcr:title, visible, enabled, readOnly, colspan,
description, tooltip, isTitleRichText, type,
analyticsFilePath, devLaunchScript, prodLaunchScript
```

#### form-submit-button
```
name, fieldType, jcr:title, visible, enabled, colspan,
description, tooltip
```

#### form-reset-button
```
name, fieldType, jcr:title, visible, enabled, colspan,
description, tooltip
```

#### plain-text
```
name, fieldType, jcr:title, dataRef, visible, colspan,
value, richText, enabled, hideTitle, type, readOnly
```

#### form-image
```
name, fieldType, jcr:title, fileReference, altText,
dataRef, visible, colspan
```

#### form-fragment
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan,
fragmentPath, editFragment,
repeatable, minOccur, maxOccur,
description, tooltip, isTitleRichText
```

#### captcha
```
name, fieldType
```

#### form-accordion / accordion
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan,
repeatable, minOccur, maxOccur, variant,
repeatAddButtonLabel, repeatDeleteButtonLabel,
description, tooltip, isTitleRichText
```

#### form-modal / modal
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan,
repeatable, minOccur, maxOccur, variant,
repeatAddButtonLabel, repeatDeleteButtonLabel,
description, tooltip, isTitleRichText
```

#### wizard
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan,
repeatable, minOccur, maxOccur, variant,
repeatAddButtonLabel, repeatDeleteButtonLabel,
description, tooltip, isTitleRichText
```

#### password
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan,
required, mandatoryMessage, validateExpMessage,
minLength, minLengthMessage, maxLength, maxLengthMessage,
pattern, validatePictureClauseMessage,
description, tooltip
```

#### rating
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan,
required, mandatoryMessage, validateExpMessage,
minimum, minimumMessage, maximum, maximumMessage,
description, tooltip
```

#### range
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan,
required, mandatoryMessage, validateExpMessage,
minimum, minimumMessage, maximum, maximumMessage, stepValue,
description, tooltip
```

#### tnc
```
name, fieldType, jcr:title, hideTitle, dataRef, unboundFormElement,
visible, enabled, readOnly, colspan, showLink,
description, tooltip
```

#### form
```
name, fieldType, jcr:title, visible, enabled,
customFunctionsPath, schemaType, track, action, dataUrl,
redirectUrl, thankYouMessage, submitType, prefillService
```

### System Properties (Allowed on All Fields)

The following AEM/JCR system properties are allowed on any field:

```
jcr:primaryType, jcr:lastModified, jcr:lastModifiedBy,
jcr:created, jcr:createdBy, sling:resourceType,
cq:responsive, fd:rules, fd:events, fd:version, fd:viewType,
id, items, layout, wrapData, textIsRich, autocomplete,
tooltipVisible, dorExclusion, buttonType, typeIndex,
aueComponentId, title, thankYouOption, themeRef, dorType, label
```

---

## 4. Type Validation

### Rule: Property Values Must Match Expected Types

Each property has an expected data type. Values must match.

**Error Type**: `INVALID_TYPE`

### Property Types

| Property | Expected Type |
|----------|---------------|
| `name` | string |
| `jcr:title` | string |
| `fieldType` | string |
| `hideTitle` | boolean |
| `dataRef` | string |
| `unboundFormElement` | boolean |
| `visible` | boolean |
| `enabled` | boolean |
| `readOnly` | boolean |
| `colspan` | string |
| `placeholder` | string |
| `default` | any |
| `description` | string |
| `tooltip` | string |
| `required` | boolean |
| `mandatoryMessage` | string |
| `validateExpMessage` | string |
| `minLength` | number |
| `minLengthMessage` | string |
| `maxLength` | number |
| `maxLengthMessage` | string |
| `pattern` | string |
| `validatePictureClauseMessage` | string |
| `validatePatternMessage` | string |
| `multiLine` | boolean |
| `minimum` | number |
| `minimumMessage` | string |
| `maximum` | number |
| `maximumMessage` | string |
| `stepValue` | number |
| `minimumDate` | string |
| `maximumDate` | string |
| `enum` | array |
| `enumNames` | array |
| `type` | string |
| `orientation` | string |
| `variant` | string |
| `multiSelect` | boolean |
| `checkedValue` | string |
| `enableUncheckedValue` | boolean |
| `uncheckedValue` | string |
| `buttonText` | string |
| `dragDropText` | string |
| `maxFileSize` | number |
| `maxFileSizeMessage` | string |
| `accept` | array |
| `acceptMessage` | string |
| `repeatable` | boolean |
| `minOccur` | number |
| `maxOccur` | number |
| `repeatAddButtonLabel` | string |
| `repeatDeleteButtonLabel` | string |
| `fileReference` | string |
| `altText` | string |
| `fragmentPath` | string |
| `editFragment` | boolean |
| `showLink` | boolean |
| `displayFormat` | string |

**Example Error**:
```json
{
  "fieldType": "text-input",
  "name": "age",
  "minLength": "5"
}
```

**Fix**:
```json
{
  "fieldType": "text-input",
  "name": "age",
  "minLength": 5
}
```

---

## 5. Enum Value Validation

### Rule: Restricted Properties Must Use Valid Values

Some properties have a restricted set of valid values.

**Error Type**: `INVALID_VALUE`

### Enum Values

#### colspan (all field types)
```
"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"
```

#### orientation (checkbox-group, radio-group)
```
"horizontal", "vertical"
```

#### variant:checkbox-group
```
"default", "cards"
```

#### variant:radio-group
```
"default", "cards"
```

#### variant:panel
```
"noButtons", "addDeleteButtons"
```

#### type:number-input
```
"integer", "number"
```

#### type:drop-down
```
"string", "boolean", "number", "string[]", "boolean[]", "number[]"
```

#### type:checkbox
```
"string", "boolean", "number"
```

#### type:checkbox-group
```
"string[]", "boolean[]", "number[]"
```

#### type:radio-group
```
"string", "boolean", "number"
```

#### displayFormat:date-input
```
"", "d MMMM, y", "MMMM d, y", "EEEE, d MMMM, y", "EEEE, MMMM d, y", "d/M/y"
```

#### displayFormat:number-input
```
"", "¤#,##0.00", "¤####0.00", "#,###,##0.000", "#,###,##0%", "¤/INR#,##0", "¤#,##0", "#,##0.00", "#,##0"
```

**Example Error**:
```json
{
  "fieldType": "radio-group",
  "name": "gender",
  "orientation": "diagonal"
}
```

**Fix**:
```json
{
  "fieldType": "radio-group",
  "name": "gender",
  "orientation": "horizontal"
}
```

---

## 6. Constraint Validation

### Rule: minLength <= maxLength

For text fields, `minLength` must be less than or equal to `maxLength`.

**Error Type**: `INVALID_CONSTRAINT`

**Applies to**: `text-input`, `email`, `multiline-input`, `password`

**Example Error**:
```json
{
  "fieldType": "text-input",
  "name": "username",
  "minLength": 20,
  "maxLength": 10
}
```

### Rule: minimum <= maximum

For numeric fields, `minimum` must be less than or equal to `maximum`.

**Error Type**: `INVALID_CONSTRAINT`

**Applies to**: `telephone-input`, `number-input`, `rating`, `range`

**Example Error**:
```json
{
  "fieldType": "number-input",
  "name": "age",
  "minimum": 100,
  "maximum": 18
}
```

### Rule: minOccur <= maxOccur

For repeatable panels, `minOccur` must be less than or equal to `maxOccur`.

**Error Type**: `INVALID_CONSTRAINT`

**Applies to**: `panel`, `form-fragment`

**Example Error**:
```json
{
  "fieldType": "panel",
  "name": "addresses",
  "repeatable": true,
  "minOccur": 5,
  "maxOccur": 2
}
```

---

## 7. fd:viewType Validation

### Rule: Certain Field Types Require fd:viewType

Some field types don't render correctly unless used with their base field type and `fd:viewType`.

**Error Type**: `MISSING_VIEW_TYPE`

| If Using | Must Change To |
|----------|----------------|
| `fieldType: "wizard"` | `fieldType: "panel"` + `fd:viewType: "wizard"` |
| `fieldType: "accordion"` | `fieldType: "panel"` + `fd:viewType: "accordion"` |
| `fieldType: "modal"` | `fieldType: "panel"` + `fd:viewType: "modal"` |
| `fieldType: "form-accordion"` | `fieldType: "panel"` + `fd:viewType: "accordion"` |
| `fieldType: "form-modal"` | `fieldType: "panel"` + `fd:viewType: "modal"` |
| `fieldType: "password"` | `fieldType: "text-input"` + `fd:viewType: "password"` |
| `fieldType: "rating"` | `fieldType: "number-input"` + `fd:viewType: "rating"` |
| `fieldType: "range"` | `fieldType: "number-input"` + `fd:viewType: "range"` |
| `fieldType: "tnc"` | `fieldType: "panel"` + `fd:viewType: "tnc"` |

**Example Error**:
```json
{
  "fieldType": "wizard",
  "name": "registration"
}
```

**Fix**:
```json
{
  "fieldType": "panel",
  "fd:viewType": "wizard",
  "name": "registration"
}
```

### Rule: fd:viewType Must Match Base fieldType

When using `fd:viewType`, the `fieldType` must be the correct base type.

**Error Type**: `INVALID_FIELD_TYPE_FOR_VIEW_TYPE`

| fd:viewType | Required fieldType |
|-------------|-------------------|
| `wizard` | `panel` |
| `accordion` | `panel` |
| `modal` | `panel` |
| `tnc` | `panel` |
| `password` | `text-input` |
| `masked-card` | `text-input` |
| `rating` | `number-input` |
| `range` | `number-input` |
| `toggleable-link` | `checkbox-group` |
| `state-button` | `button` |
| `analytics` | `button` |

**Example Error**:
```json
{
  "fieldType": "text-input",
  "fd:viewType": "wizard",
  "name": "registration"
}
```

**Fix**:
```json
{
  "fieldType": "panel",
  "fd:viewType": "wizard",
  "name": "registration"
}
```

### Rule: Unknown fd:viewType

If `fd:viewType` is not recognized and not in `_form.json` filters, it's an error.

**Error Type**: `INVALID_VIEW_TYPE`

**Valid fd:viewType Values**:
- `wizard`
- `accordion`
- `modal`
- `tnc`
- `password`
- `masked-card`
- `rating`
- `range`
- `toggleable-link`
- `state-button`
- `analytics`

**Handling Custom Components**:

If you have custom components, pass the `_form.json` file:
```bash
form-validate form.json authoring/_form.json
```

Fields with `fd:viewType` matching components in `filters[0].components` will be skipped.

---

## 8. Pattern Validation

### Rule: Pattern Must Be Valid Regular Expression

If a `pattern` property is provided, it must be a valid JavaScript regular expression.

**Error Type**: `INVALID_VALUE`

**Example Error**:
```json
{
  "fieldType": "text-input",
  "name": "code",
  "pattern": "[a-z"
}
```

**Fix**:
```json
{
  "fieldType": "text-input",
  "name": "code",
  "pattern": "[a-z]+"
}
```

---

## Fuzzy Matching for Suggestions

When an invalid property is detected, the validator uses Levenshtein distance to suggest similar valid properties.

**Example**:
```
Property 'lable' is not valid for fieldType 'text-input'.
Fix: Did you mean 'label'? Remove 'lable' or replace it with one of: label
```

The validator considers properties similar if:
1. One contains the other as a substring
2. The Levenshtein distance is 3 or less

---

## Validation Order

The validator checks rules in this order:

1. **fieldType presence** - Field must have fieldType
2. **fieldType validity** - fieldType must be recognized
3. **fd:viewType requirement** - Check if fieldType needs fd:viewType
4. **fd:viewType validity** - If present, must be valid or custom
5. **name presence** - Most fields require name
6. **name type** - name must be string
7. **name format** - name must match pattern
8. **Property validity** - Each property must be allowed
9. **Type validation** - Property values must match expected types
10. **Enum validation** - Restricted values must be valid
11. **Constraint validation** - Constraints must be satisfied
12. **Pattern validation** - Regex patterns must be valid

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Validation passed |
| 1 | Validation failed or error |
