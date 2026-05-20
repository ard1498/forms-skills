---
name: analyze-requirements
description: >
  Use when starting a new form project from a requirements doc, Screen.md,
  journey.md, or mockups. Produces field inventory, panel structure, rule
  requirements, and API dependencies.
  Triggers: analyze requirements, create spec, plan form, Screen.md.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# Analyze Requirements

Parse requirements documents into structured form specifications ready for form creation.

## When to Use

- User provides a requirements document, Screen.md, journey.md, or design mockup
- A new form project needs to be planned before building
- You need to extract field inventory, panel structure, rule requirements, and API dependencies

## Critical Rules

1. **Act autonomously** — read the document, produce the spec. Don't ask "should I analyze this?"
2. **Mark unknowns as TBD** — if an API endpoint, data source, or behavior is unclear, mark it TBD rather than guessing
3. **No PL.currentFormContext references** — mark data sources as TBD instead
4. **Don't duplicate** — validation rules should NOT repeat constraints already captured in field properties
5. **Skip container panels** — only include panels that have visibility rules or meaningful grouping
6. **Complete field coverage** — every user-facing field must appear in the specification

## Input Sources

| Source Type | What to Look For |
|-------------|------------------|
| Requirements doc | Feature descriptions, field lists, business logic, API references |
| Screen.md | Structured screen documentation with fields, validation, visibility rules |
| Journey.md | Multi-step flow with screen transitions and navigation |
| Design mockup | Visual layout implying fields, sections, and flow |

## Output: Form Specification Template

Produce a structured markdown document with ALL of the following sections, in this order:

### 1. Title and Overview

```
# <Form Name> — Form Specification

**Source:** <input document name>
**Screens/Steps:** <count>
**Estimated Fields:** <count>
**Estimated Rules:** <count>
```

### 2. Panel Structure

Map the form's top-level organization:

```
Form Root
├── Panel: <panel-name> — "<Display Title>"
│   ├── Field: <field-name>
│   └── Fragment: <fragment-name> (if reusable)
├── Panel: <panel-name>
│   └── ...
└── Submit Button
```

### 3. Field Inventory

For each section/panel, produce a table:

| Name | Title | Type | Required | Visible | Properties |
|------|-------|------|----------|---------|------------|
| `field_name` | Display Title | field-type | true/false | true/false | constraints, options, patterns |

**Valid field types:** `text-input`, `number-input`, `date-input`, `drop-down`, `radio-group`, `checkbox-group`, `checkbox`, `email`, `file-input`, `plain-text`, `panel`, `button`

**Properties column includes:**
- Validation patterns (regex)
- Min/max values
- Character limits
- Dropdown options (format: `Option1, Option2, Option3`)
- Placeholder text

### 4. Validation Rules

Only rules NOT already captured in field Properties:

| Field | Trigger | Rule | Error Message |
|-------|---------|------|---------------|
| `field_name` | On blur / On change | Description | "Error text" |

**Do NOT duplicate:** patterns, min/max, character limits, or required already in the field inventory.

### 5. Visibility Rules

| Component | Initially Visible | Show/Hide Condition |
|-----------|-------------------|---------------------|
| `field_name` | Yes/No | Condition that triggers show/hide |

### 6. Business Rules

Describe logic that goes beyond simple validation/visibility:

- **On form load:** Pre-fill logic, initialization
- **Calculations:** Computed fields (e.g., total = subtotal + tax)
- **Conditional required:** Fields that become required based on other values
- **State transitions:** What happens when user completes a section

Mark APIs and data sources as TBD:
- [ ] Pre-fill `field_name` from <source TBD>
- [ ] Call API for <purpose> — *API TBD*

### 7. API Dependencies

| Order | API | Purpose | Trigger |
|-------|-----|---------|---------|
| 1 | `api-name` (TBD) | Description | When triggered |

### 8. Fragment Candidates

Identify reusable sections that should be fragments:

| Section | Reason | Reused In |
|---------|--------|-----------|
| Address fields | Common pattern | Multiple forms |

### 9. Navigation Flow

For multi-step forms:

| Step | Panel | Next Condition | Back Condition |
|------|-------|----------------|----------------|
| 1 | Personal Details | On continue click | — |
| 2 | Employment | On continue click | On back click |

### 10. Summary & Complexity

| Section          | Fields | Validation | Visibility | Business | APIs | Fragments |
|------------------|--------|------------|------------|----------|------|-----------|
| Section Name     | X      | X          | X          | X        | X    | X         |
| **Screen Total** | **X**  | **X**      | **X**      | **X**    | **X** | **X**     |

**Complexity Check (per screen):**

| Metric             | Value | Threshold | Status |
|--------------------|-------|-----------|--------|
| Fields             | X     | ≤ 25      | 🟢/🟡/🔴 |
| Validation rules   | X     | ≤ 15      | 🟢/🟡/🔴 |
| Visibility rules   | X     | ≤ 10      | 🟢/🟡/🔴 |
| Business rules     | X     | ≤ 6       | 🟢/🟡/🔴 |
| API calls          | X     | ≤ 3       | 🟢/🟡/🔴 |
| Fragments          | X     | ≤ 3       | 🟢/🟡/🔴 |
| Logical sections   | X     | ≤ 4       | 🟢/🟡/🔴 |

**Complexity Check (journey aggregate):**

| Metric                     | Value | Threshold | Status |
|----------------------------|-------|-----------|--------|
| Total screens              | X     | ≤ 15      | 🟢/🟡/🔴 |
| Total fields (all screens) | X     | ≤ 150     | 🟢/🟡/🔴 |
| Total rules (all types)    | X     | ≤ 100     | 🟢/🟡/🔴 |
| Total APIs (unique)        | X     | ≤ 12      | 🟢/🟡/🔴 |
| Total fragments            | X     | ≤ 10      | 🟢/🟡/🔴 |

**Severity thresholds:**
- 🟢 Green: within threshold
- 🟡 Amber: up to 50% over threshold — flag for human review
- 🔴 Red: more than 50% over threshold — must split screen/journey or extract fragments

> **Gate:** If any metric is 🔴, add a Complexity Warning to Open Items (section 11) with a recommended action.

### 11. Open Items

- [ ] Item needing clarification
- [ ] API endpoint TBD
- [ ] Data source TBD

## Workflow

1. **Read the input document** — understand the full scope
2. **Identify panels/sections** — group fields logically by screen or functional area
3. **Extract all fields** — list every data input with type, label, constraints
4. **Separate validation rules** — only rules not captured in field properties
5. **Map visibility logic** — initially hidden components and their show/hide conditions
6. **Document business rules** — calculations, state transitions, conditional behavior
7. **List API dependencies** — mark all as TBD for verification
8. **Identify fragment candidates** — sections reusable across forms
9. **Map navigation** — step flow for multi-step forms
10. **Compile summary and evaluate complexity** — populate the Summary & Complexity tables, flag any 🟡/🔴 metrics
11. **Generate execution plans** — decompose the specification into sequentially numbered plans at `plans/<journey>/` (see Plan Generation below)

## What Happens Next

After the specification is reviewed and approved:
1. **Execution plans** are generated at `plans/<journey>/` — one plan per functional concern
2. Plans execute sequentially — each plan invokes the appropriate skill(s)
3. After each plan completes, `.agent/handover.md` is updated with the Plan Execution Status dashboard

## Plan Generation

After the form specification is reviewed, generate sequentially numbered plan files at `plans/<journey>/`.

### Plan File Convention

- **Path:** `plans/<journey>/NN-<short-title>.md`
- **Numbering:** Zero-padded two digits: `01`, `02`, ..., `10`, `11`
- **Naming:** Lowercase, hyphen-separated: `01-form-structure.md`, `07-api-prefill.md`
- **Execution order:** Sequential — each plan declares its dependencies explicitly

### Plan Template

Each plan file must follow this structure:

```
# Plan NN: <Title>

**Source:** `journeys/<journey>.md` section X.X / `Screen.md` references
**Skills:** <primary skills invoked: forms-content-author, forms-rule-creator, manage-apis, forms-custom-components>
**Depends on:** Plan NN (description) — or "None (first plan)"

---

## Objective

<1-2 sentences: what this plan delivers and why>

## Scope

### In Scope

- <specific deliverable 1>
- <specific deliverable 2>

### Out of Scope

- <explicitly excluded item> (covered in Plan NN)

## Specification

<The detailed spec — varies by plan type:>
<- For Build plans: panel structure tree, field specification tables>
<- For Logic plans: rule tables, custom function signatures, event flows>
<- For Integrate plans: API definitions, request/response, mapping tables>
<- For Deploy plans: deployment targets, verification steps>

## Steps to Execute

1. <Step 1 with specific skill/tool invocation>
2. <Step 2>
3. ...
N. **Validate and push**

## Acceptance Criteria

- [ ] <Testable criterion 1>
- [ ] <Testable criterion 2>
- [ ] <Form passes validation>
- [ ] <Renders/deploys without errors>
```

### Plan Decomposition Guidelines

When breaking a form specification into plans:

| Principle | Guideline |
|-----------|-----------|
| **One concern per plan** | Each plan addresses one functional area — don't mix form structure with API integration |
| **Deployable increment** | After each plan, the form should be in a valid, deployable state (even if incomplete) |
| **Explicit dependencies** | Every plan declares which prior plans it depends on — no implicit assumptions |
| **First plan = skeleton** | Plan 01 always creates the full form structure (all panels, even empty placeholders for later plans) |
| **APIs before rules** | Integration plans (API clients) come before logic plans that consume those APIs |
| **Error handling last** | Cross-cutting concerns like error handling and session management come at the end |
| **Max 15 plans per journey** | If you need more, the journey is likely too complex — check journey-level complexity thresholds |

### Typical Plan Sequence

| Order | Focus | Primary Skills | Example |
|-------|-------|---------------|---------|
| 01 | Form structure + primary fields | `forms-content-author` | Panels, field types, basic validation |
| 02–05 | Screen-by-screen logic | `forms-content-author`, `forms-rule-creator` | Visibility rules, business rules per screen |
| 06–08 | API integration | `manage-apis`, `forms-rule-creator` | API clients, prefill, save/submit |
| 09 | Complex workflows | `forms-rule-creator` | Multi-step flows (e.g., OTP, verification) |
| 10 | Error handling & edge cases | `forms-rule-creator` | Session management, error modals, fallbacks |

## Exclusions

Do NOT include in the specification:
1. Container panels that are just wrappers with no visibility rules
2. Duplicate validation (already in field Properties)
3. Screenshots or visual mockups
4. Source code references
5. CSS/styling details
6. Detailed API request/response payloads (document separately)