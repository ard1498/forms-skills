---
name: review-screen-doc
description: >
  Use when reviewing or validating existing Screen.md documentation against
  v1 form JSON. Adds missing sections, resolves dropdowns, validates field
  properties.
  Triggers: review screen doc, check Screen.md, validate documentation,
  critique screen doc, missing sections.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# Screen Documentation Reviewer

Reviews and improves existing `Screen.md` files by validating every claim against the actual form JSON definition, removing duplicated information, and ensuring all required sections are present.

---

## When to Use

- Reviewing an existing `Screen.md` for correctness and completeness
- Validating documented fields, types, and constraints against a form JSON
- Cleaning up duplicate information between Content and Validation sections
- Resolving placeholder dropdown options with actual enum values from JSON
- Ensuring the standard 11-section structure is followed

---

## Critical Rules

1. **Always cross-reference against actual JSON** — never trust the Screen.md at face value; verify every field name, type, dataRef, required flag, visible flag, and constraint
2. **Remove duplicates** — if a validation rule merely restates a property already in the Content table (pattern, min/max, character limits), delete it from Validation Rules
3. **Mark unknowns in Open Items** — anything that cannot be resolved from the JSON (API endpoints, pre-fill sources, ambiguous business logic) goes into Open Items with a clear TBD marker
4. **No code references** — remove all `PL.currentFormContext` setter references; mark data sources as TBD instead
5. **No container panels** — remove panels that are just structural wrappers with no visibility rules

---

## Review Workflow

1. **Read the Screen.md** at `journey/<journey-name>/screens/<screen-name>/Screen.md`
2. **Read the form JSON** (e.g., `refs/afv1/pletb-wo.json`) and search for every field mentioned in the Screen.md
3. **Identify issues** — build a list of: missing fields, incorrect properties, duplicate validations, unresolved dropdowns, unnecessary container panels, unverified APIs
4. **Apply fixes** — update Content tables, remove duplicates from Validation, strip container panels, resolve dropdown options from JSON enums
5. **Update Open Items** — ensure every unresolved item is captured with a checkbox, and add an API Endpoints TBD table for any APIs needing verification

---

## Structure Check

Verify the document contains all 11 sections in this order:

| # | Section | Purpose |
|---|---------|---------|
| 1 | Title and Progress | Screen name, step indicator position |
| 2 | Navigation | Back/Next buttons, targets |
| 3 | Content Screen | Field table: Name, Type, dataRef, Required, Visible, Properties |
| 4 | Validation Rules | Only rules NOT already captured in Content Properties |
| 5 | Visibility Rules | Conditions that show/hide fields or panels |
| 6 | Business Rules | Logic beyond simple validation (calculations, dependencies) |
| 7 | API Calls | Endpoints called on this screen |
| 8 | Error Popups | Modal/toast error definitions |
| 9 | Form Context Variables | Variables read or written on this screen |
| 10 | Summary & Complexity | Per-section metrics table + complexity check against thresholds |
| 11 | Open Items / To Be Clarified | Unresolved questions, TBD tables |

---

## Content Validation

For every field in the Content table, verify against the JSON:

| Check | What to verify |
|-------|---------------|
| **Field exists** | Field name is present in the JSON |
| **Type is correct** | Matches JSON type (text-input, drop-down, date-input, etc.) |
| **dataRef is accurate** | Path matches the JSON `dataRef` property |
| **Required flag** | Matches JSON `required` value |
| **Visible flag** | Matches JSON `visible` value; if `false`, must appear in Visibility Rules as "Initially Hidden" |
| **Constraints** | pattern, maxLength, minLength, min, max from JSON are in Properties |
| **Dropdown options** | enum/enumNames from JSON are listed in Properties |

---

## Common Issues

| Issue | How to Fix |
|-------|-----------|
| Validation rule duplicates a Content Property (pattern, min/max, char limits) | Delete the rule from Validation; keep only triggers, error messages, and behaviors not in Content |
| Dropdown shows "TBD" but JSON has enum/enumNames | Extract options from JSON and update Content Properties: `Options: Value1, Value2, Value3` |
| Container panel listed in Content with no visibility rule | Remove the panel row entirely |
| `PL.currentFormContext` references in Business Rules or Form Context | Remove the reference; replace with a TBD note in Open Items |
| Field in JSON missing from Content table | Add the field row with all properties from JSON |
| API endpoint listed without verification | Move to Open Items → API Endpoints TBD table |
| UI/UX details (CSS, styling, screenshots) present | Remove — these do not belong in Screen.md |

---

## What to Remove

- **Container panels** that are purely structural wrappers (always visible, no conditions)
- **Duplicate validation rules** that restate pattern, min/max, or character limits already in Content Properties
- **`PL.currentFormContext`** setter/getter references — replace with TBD
- **UI/UX details** — CSS classes, styling notes, layout specifics
- **Journey state logging** — internal logging implementation details
- **Screenshot references** — image links or references to visual assets

---

## What to Add

- **Missing fields** discovered in JSON but absent from the Content table
- **Resolved dropdown options** extracted from JSON `enum` / `enumNames` arrays
- **API Endpoints TBD table** in Open Items for every API that lacks endpoint verification:

```
| API | Purpose | Reference API (to verify) | Needs |
|-----|---------|---------------------------|-------|
| <api> | <purpose> | `<reference>.json` | Verify endpoint, success/error response |
```

- **Pre-fill data source** as a TBD checkbox if not documented
- **Validation error messages** for any rule that is missing its user-facing message
- **Missing sections** — any of the 11 required sections not present in the document

---

## JSON Resolution Patterns

When resolving values from the form JSON:

- **Dropdowns**: look for `enum` and `enumNames` arrays on the field object → list as `Options: Display1, Display2, ...`
- **Patterns**: look for `pattern` property → add to Content Properties, remove from Validation if duplicated
- **Character limits**: look for `maxLength` / `minLength` → add to Content Properties as `maxChars` / `minLength`
- **Required**: look for `required: true` → set Required column to `true`
- **Hidden fields**: look for `visible: false` → set Visible column to `false` and add "Initially Hidden" entry in Visibility Rules

---

## Output Quality

After review, the Screen.md must:

- Follow the correct 11-section order
- Contain no duplicate information between Content and Validation
- Have no unnecessary container panels
- Have resolved dropdown options wherever JSON provides them
- List all unverified APIs in an Open Items TBD table
- Contain zero `PL.currentFormContext` references
- Have every field property verified against the actual JSON
- Have a Summary table with per-section breakdown of Fields, Validation, Visibility, Business, APIs, Fragments
- Have a Complexity Check table with thresholds evaluated

---

## Complexity Gate

After validating structure and content, evaluate the Summary metrics against complexity thresholds.

### Screen-Level Thresholds

| Metric             | Green (≤) | Amber (≤) | Red (>)  |
|--------------------|-----------|-----------|----------|
| Fields             | 25        | 37        | 37       |
| Validation rules   | 15        | 22        | 22       |
| Visibility rules   | 10        | 15        | 15       |
| Business rules     | 6         | 9         | 9        |
| API calls          | 3         | 4         | 4        |
| Fragments          | 3         | 4         | 4        |
| Logical sections   | 4         | 6         | 6        |

### Journey-Level Thresholds (aggregate across all screens)

| Metric                     | Green (≤) | Amber (≤) | Red (>)  |
|----------------------------|-----------|-----------|----------|
| Total screens              | 15        | 22        | 22       |
| Total fields (all screens) | 150       | 225       | 225      |
| Total rules (all types)    | 100       | 150       | 150      |
| Total APIs (unique)        | 12        | 18        | 18       |
| Total fragments            | 10        | 15        | 15       |

### Severity Actions

| Severity | Meaning | Action |
|----------|---------|--------|
| 🟢 Green | Within threshold | Pass — no action needed |
| 🟡 Amber | Up to 50% over threshold | Flag in Open Items for human review — may be acceptable with justification |
| 🔴 Red | More than 50% over threshold | **Block** — add Complexity Warning to Open Items with recommended action |

### Recommended Actions for Red Flags

| Metric Exceeded | Recommended Action |
|-----------------|--------------------|
| Fields > 37 | Split screen into multiple wizard panels |
| Validation rules > 22 | Consolidate into custom functions via `forms-rule-creator` |
| Visibility rules > 15 | Consolidate into a single custom function with a visibility map |
| Business rules > 9 | Extract into custom functions; review if screen is doing too much |
| API calls > 4 | Centralize API orchestration into a shared custom function |
| Fragments > 4 | Review if fragments can be merged or if screen should be split |
| Logical sections > 6 | Split screen — each section likely warrants its own wizard panel |
| Total screens > 22 | Split journey into sub-journeys (separate forms) |
| Total fields > 225 | Split journey into sub-journeys (separate forms) |
| Total rules > 150 | Split journey or aggressively extract custom functions |

> **Gate:** Do NOT proceed to the build phase if any screen-level metric is 🔴. Journey-level 🔴 flags should be escalated to the user for a split/keep decision.