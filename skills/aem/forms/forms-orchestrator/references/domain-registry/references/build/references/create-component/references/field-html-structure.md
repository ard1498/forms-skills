# Field HTML Structure Reference

The `decorate(fieldDiv, fieldJson)` function receives `fieldDiv` — the already-rendered HTML of the base field type. This reference documents the exact DOM structure for each base type so you know what elements to query and extend.

## General Input Fields (text-input, number-input, email, telephone-input, date-input)

All simple input types share the same structure, differing only in wrapper class and input type attribute.

```html
<div class="{type}-wrapper field-{name} field-wrapper" data-required="{required}">
  <label for="{fieldId}" class="field-label">{Label Text}</label>
  <input type="{type}" placeholder="{placeholder}" maxlength="{max}"
         id="{fieldId}" name="{name}"
         aria-describedby="{fieldId}-description">
  <div class="field-description" aria-live="polite" id="{fieldId}-description">
    {Description / hint text}
  </div>
</div>
```

**Wrapper classes by type:**

| base_type | Wrapper class | Input type attr |
|-----------|--------------|-----------------|
| text-input | text-wrapper | text |
| number-input | number-wrapper | number |
| email | email-wrapper | email |
| telephone-input | tel-wrapper | tel |
| date-input | date-wrapper | date |

**Example (text-input):**

```html
<div class="text-wrapper field-first-name field-wrapper" data-required="true">
  <label for="firstName" class="field-label">First Name</label>
  <input type="text" placeholder="Enter your first name" maxlength="50"
         id="firstName" name="firstName"
         aria-describedby="firstName-description">
  <div class="field-description" aria-live="polite" id="firstName-description">
    Please enter your legal first name.
  </div>
</div>
```

**Key selectors for decorate():**
- Label: `fieldDiv.querySelector('.field-label')`
- Input: `fieldDiv.querySelector('input')`
- Description: `fieldDiv.querySelector('.field-description')`

---

## Dropdown (drop-down)

```html
<div class="drop-down-wrapper field-{name} field-wrapper" data-required="{required}">
  <label for="{fieldId}" class="field-label">{Label Text}</label>
  <select id="{fieldId}" name="{name}">
    <option value="">Select</option>
    <option value="us">United States</option>
  </select>
  <div class="field-description" aria-live="polite" id="{fieldId}-description">
    {Description text}
  </div>
</div>
```

**Key difference:** Uses `<select>` instead of `<input>`.

**Key selectors:**
- Select element: `fieldDiv.querySelector('select')`
- Options: `fieldDiv.querySelectorAll('option')`

---

## Radio Button Group (radio-group)

```html
<fieldset class="radio-group-wrapper field-{name} field-wrapper" data-required="{required}">
  <legend class="field-label">{Group Label}</legend>
  <!-- repeated for each option -->
  <div class="radio-wrapper field-{name}">
    <input type="radio" id="{fieldId}" name="{name}" value="{value}">
    <label for="{fieldId}" class="field-label">{Option Label}</label>
  </div>
  <!-- end repeat -->
  <div class="field-description" aria-live="polite" id="{fieldId}-description">
    {Description text}
  </div>
</fieldset>
```

**Key points:**
- Outer element is `<fieldset>`, not `<div>`
- Group label uses `<legend>`, not `<label>`
- Each option is in a `radio-wrapper` div

**Key selectors:**
- All radio inputs: `fieldDiv.querySelectorAll('input[type="radio"]')`
- Each option wrapper: `fieldDiv.querySelectorAll('.radio-wrapper')`
- Group label: `fieldDiv.querySelector('legend')`

---

## Checkbox Group (checkbox-group)

```html
<fieldset class="checkbox-group-wrapper field-{name} field-wrapper" data-required="{required}">
  <legend class="field-label">{Group Label}</legend>
  <!-- repeated for each option -->
  <div class="checkbox-wrapper field-{name}">
    <input type="checkbox" id="{fieldId}" name="{name}" value="{value}">
    <label for="{fieldId}" class="field-label">{Option Label}</label>
  </div>
  <!-- end repeat -->
  <div class="field-description" aria-live="polite" id="{fieldId}-description">
    {Description text}
  </div>
</fieldset>
```

**Key points:**
- Identical structure to radio-group, but with `type="checkbox"`
- Uses `checkbox-group-wrapper` and `checkbox-wrapper` classes

**Key selectors:**
- All checkboxes: `fieldDiv.querySelectorAll('input[type="checkbox"]')`
- Each option wrapper: `fieldDiv.querySelectorAll('.checkbox-wrapper')`

---

## Single Checkbox (checkbox)

```html
<div class="checkbox-wrapper field-{name} field-wrapper" data-required="{required}">
  <input type="checkbox" id="{fieldId}" name="{name}" value="{value}">
  <label for="{fieldId}" class="field-label">{Label Text}</label>
  <div class="field-description" aria-live="polite" id="{fieldId}-description">
    {Description text}
  </div>
</div>
```

---

## File Upload (file-input)

```html
<div id="{fieldId}" name="{name}" class="file-wrapper field-{name} field-wrapper"
     data-required="{required}" data-max-file-size="2MB">
  <legend for="{fieldId}" class="field-label">{Label Text}</legend>
  <div class="file-drag-area">
    <div class="file-dragIcon"></div>
    <div class="file-dragText">Drag and Drop To Upload</div>
    <button class="file-attachButton" type="button">Attach</button>
    <input type="file" multiple=""
           accept="audio/*, video/*, image/*, text/*, application/pdf"
           id="{fieldId}" name="{name}"
           aria-describedby="{fieldId}-description">
  </div>
  <div class="field-description" aria-live="polite" id="{fieldId}-description">
    {Description text}
  </div>
  <div class="files-list"></div>
</div>
```

**Key points:**
- Has a drag-and-drop area with `file-drag-area` class
- `files-list` is populated dynamically via JavaScript
- Supports `data-max-file-size` attribute

**Key selectors:**
- File input: `fieldDiv.querySelector('input[type="file"]')`
- Drag area: `fieldDiv.querySelector('.file-drag-area')`
- File list: `fieldDiv.querySelector('.files-list')`

---

## Common Class Patterns

| Class | Purpose |
|-------|---------|
| `{type}-wrapper` | Identifies field by type (e.g., `text-wrapper`, `number-wrapper`) |
| `field-{name}` | Identifies field by name (alphanumeric, dashes normalized) |
| `field-wrapper` | Generic class on all field wrappers |
| `field-label` | Label element class |
| `field-description` | Description / hint text class |

All `{fieldId}` values are auto-generated unique identifiers.
