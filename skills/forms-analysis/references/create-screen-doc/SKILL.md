---
name: create-screen-doc
description: >
  Use when creating new Screen.md documentation from reference docs and form JSON.
  Extracts fields, validation rules, visibility logic, business rules, and API
  calls into a standardized 11-section document.
  Triggers: create screen doc, document screen, new screen documentation,
  Screen.md, write screen doc.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# Screen Documentation Creator

Creates `Screen.md` documentation files for form screens based on reference documentation and the actual form JSON definition.

---

## When to Use

- Creating a new `Screen.md` from scratch for a screen that has no documentation yet
- Documenting a screen after identifying it in a journey analysis
- Generating initial screen documentation from a form JSON definition
- Building out the `journey/<journey-name>/screens/<screen-name>/Screen.md` file for a specific screen

---

## Critical Rules

1. **Always derive from the actual JSON** — every field name, type, dataRef, required flag, visible flag, and constraint must come from the form JSON, not from assumptions
2. **No duplicate information** — if a constraint (pattern, min/max, character limit) appears in the Content Properties column, do NOT repeat it in Validation Rules
3. **No container panels** — omit panels that are purely structural wrappers with no visibility rules
4. **No code references** — never include `PL.currentFormContext` setter/getter references; mark data sources as TBD instead
5. **No UI/UX details** — skip CSS classes, styling notes, layout specifics, and screenshot references
6. **Mark unknowns as TBD** — anything that cannot be resolved from the JSON (API endpoints, pre-fill sources, ambiguous business logic) goes into Open Items with a clear TBD marker
7. **Follow the 11-section structure exactly** — all sections must appear in order even if some are empty

---

## Workflow

1. **Read reference documentation** — locate the reference doc (e.g., `refs/afv1/README.md`) for the specific screen and journey flow
2. **Read the form JSON** — load the form definition (e.g., `refs/afv1/<form>.json`) and find all fields belonging to the target screen
3. **Identify screen sections** — group fields logically (Personal Details, Address, Employment, Bank Use, etc.)
4. **Extract fields** — list all fields with their properties from JSON; skip container panels
5. **Document validation** — only rules NOT already captured in Content Properties
6. **Document visibility** — hidden components and dynamic show/hide rules
7. **Document business logic** — mark APIs and data sources as TBD
8. **Write the Screen.md** — output to `journey/<journey-name>/screens/<screen-name>/Screen.md`
9. **Add Open Items** — list everything that needs verification

---

## Document Structure (11 Sections, In Order)

### 1. Title and Progress

```
# <Screen Name>

**Progress:** Step XX - "<Step description>" (XX% complete)

---
```

### 2. Navigation

```
## Navigation

| Action | Destination |
|--------|-------------|
| **Back Button** | <destination> |
| **Continue Button** | <what it triggers, then destination> |

---
```

### 3. Content Screen

Organise fields by logical sections (Personal Details, Address, Employment, etc.).

```
## Content Screen

### <Section Name>

| Name | Title | Type | dataRef | Required | Visible | Properties |
|------|-------|------|---------|----------|---------|------------|
| `fieldName` | Display Title | field-type | `$.path` | true/false | true/false | constraints, options |
```

**Field Types:** text-input, number-input, date-input, drop-down, radio-group, checkbox, toggle, hidden, text-display, panel

**Properties column includes:**
- Validation patterns
- Min/max values
- Character limits (maxChars / minLength)
- Dropdown options (format: Option1, Option2, Option3)
- Special behaviours

### 4. Validation Rules

Only include rules NOT already in Content Properties column.

```
## Validation Rules

### <Field Name>

| Trigger | Rule | Error Message |
|---------|------|---------------|
| On blur | Required field | "Error message" |
| On input | <behaviour not in Content> | "Error message" |
```

**DO NOT duplicate:**
- Patterns already in Content Properties
- Min/max values already in Content Properties
- Character limits already in Content Properties
- Dropdown options already in Content Properties

### 5. Visibility Rules

```
## Visibility Rules

### Initially Hidden Components

| Component | Reason | Shown When |
|-----------|--------|------------|
| `fieldName` | Why hidden | Condition to show |

### Dynamic Visibility Rules

| Trigger | Action |
|---------|--------|
| `field` = value | Show/hide fields, change required |

### Read-Only Conditions

| Field | Becomes Read-Only When |
|-------|------------------------|
| `fieldName` | Condition |
```

### 6. Business Rules

```
## Business Rules

### On Screen Load

- [ ] Pre-fill `fieldName` (transformation) - *source TBD*
- [ ] Other initialisation logic

### <Flow Name> (e.g., PAN Verification Flow)

- [ ] Trigger condition - *API TBD*
- [ ] On success: actions
- [ ] On failure: actions
```

Mark all APIs as TBD. Do not use `PL.currentFormContext` references.

### 7. API Calls

```
## API Calls

### <Trigger Event>

| Order | API | Purpose |
|-------|-----|---------|
| 1 | `api-name.json` | Description |
```

### 8. Error Popups

```
## Error Popups

| Trigger | Popup Title | Message | Actions |
|---------|-------------|---------|---------|
| Condition | Title | "Message" | Button actions |
```

### 9. Form Context Variables

```
## Form Context Variables

| Variable | Purpose | Source |
|----------|---------|--------|
| `variableName` | What it stores | Where it comes from |
```

### 10. Summary & Complexity

```
## Summary

| Section          | Fields | Validation | Visibility | Business | APIs | Fragments |
|------------------|--------|------------|------------|----------|------|-----------|
| Section Name     | X      | X          | X          | X        | X    | X         |
| **Screen Total** | **X**  | **X**      | **X**      | **X**    | **X** | **X**     |
```

After the totals table, add a **Complexity Check** sub-section:

```
### Complexity Check

| Metric             | Value | Threshold | Status |
|--------------------|-------|-----------|--------|
| Fields             | X     | ≤ 25      | 🟢/🟡/🔴 |
| Validation rules   | X     | ≤ 15      | 🟢/🟡/🔴 |
| Visibility rules   | X     | ≤ 10      | 🟢/🟡/🔴 |
| Business rules     | X     | ≤ 6       | 🟢/🟡/🔴 |
| API calls          | X     | ≤ 3       | 🟢/🟡/🔴 |
| Fragments          | X     | ≤ 3       | 🟢/🟡/🔴 |
| Logical sections   | X     | ≤ 4       | 🟢/🟡/🔴 |
```

**Severity thresholds:**
- 🟢 Green: within threshold
- 🟡 Amber: up to 50% over threshold — flag for human review
- 🔴 Red: more than 50% over threshold — must split screen or extract fragments before proceeding to build

> **Gate:** If any metric is 🔴, add a Complexity Warning to Open Items with a recommended action (split screen, extract fragment, or consolidate rules into custom functions).

### 11. Open Items

```
## Open Items / To Be Clarified

### Missing Sections

- [ ] Pre-fill data source - What is the source for on-screen-load pre-population?

### API Endpoints TBD

| API | Purpose | Reference API (to verify) | Needs |
|-----|---------|---------------------------|-------|
| API name | Purpose | `reference-api.json` | Verify endpoint, success/error response |

### Other Missing Items

- [ ] Item description
```

---

## JSON Resolution Patterns

When resolving values from the form JSON:

| Pattern | Where to Look | How to Document |
|---------|---------------|-----------------|
| **Dropdowns** | `enum` and `enumNames` arrays on the field object | Properties: `Options: Display1, Display2, ...` |
| **Patterns** | `pattern` property on the field | Properties column; do NOT duplicate in Validation |
| **Character limits** | `maxLength` / `minLength` properties | Properties: `maxChars: N` / `minLength: N` |
| **Number ranges** | `minimum` / `maximum` properties | Properties: `min: N, max: N` |
| **Required** | `required: true` on the field | Required column = `true` |
| **Hidden fields** | `visible: false` on the field | Visible column = `false`; add "Initially Hidden" in Visibility Rules |

---

## What NOT to Include

1. **Container panels** — panels that are just wrappers with no visibility rules
2. **Duplicate validation** — patterns/constraints already in Content Properties
3. **Screenshots** — skip for now
4. **Source traceability** — no JSON line references or JS file references
5. **API request/response payloads** — document separately if needed
6. **`PL.currentFormContext` references** — mark data sources as TBD instead
7. **UI/UX details** — CSS classes, styling notes, layout specifics
8. **Journey state logging** — internal logging implementation details

---

## What TO Include

1. **Only meaningful panels** — panels with visibility rules (initially hidden, conditional show)
2. **All user-facing fields** — input fields, dropdowns, radio groups, checkboxes
3. **Hidden fields** — that store computed or formatted values
4. **Error messages** — exact text for validation failures
5. **API references** — from reference doc, marked as TBD for verification
6. **Dropdown options** — complete list if known from JSON, or mark as TBD
7. **Pre-fill data sources** — as TBD checkboxes if not documented
8. **Validation error messages** — for any rule that has user-facing text

---

## Example Output

Output location:

```
journey/etbwo/screens/personal-details/Screen.md
```

Example structure:

```
# Personal Details Screen

**Progress:** Step 01 - "Please verify your details" (10% complete)

---

## Navigation
...

## Content Screen
...

## Validation Rules
...

## Visibility Rules
...

## Business Rules
...

## API Calls
...

## Error Popups
...

## Form Context Variables
...

## Summary
...

## Open Items / To Be Clarified
...
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot find the screen in the form JSON | Search for a unique field name you know belongs to the screen; screens are usually nested inside a wizard panel |
| Dropdown options show as TBD | Look for `enum` / `enumNames` arrays on the field object in the JSON; if absent, keep as TBD in Open Items |
| Unsure which fields belong to this screen | Trace the panel hierarchy in the JSON — each wizard step typically maps to a top-level panel under the wizard |
| Field type unclear | Map JSON `fieldType` values: `text-input`, `number-input`, `date-input`, `drop-down`, `radio-group`, `checkbox`, `plain-text` → `text-display` |
| Business rule references code | Strip the code reference; describe the behaviour in plain language and mark the data source as TBD |
| Reference doc is missing sections | Document what you can from JSON; add all gaps to Open Items with TBD markers |