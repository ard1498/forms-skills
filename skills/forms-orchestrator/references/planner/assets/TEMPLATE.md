---
name: plan-template
description: >
  Use when writing a new plan file for a journey. Provides the plan schema to
  copy, conventions governing all plans, and specification patterns with
  typical steps for each plan type.
type: template
---

# Plan Template

Standard structure for plan files. Copy the template below when creating a new plan.

> **File path convention:** `plans/<journey>/NN-<short-title>.md`

---

## Template

````
# Plan NN: <Plan Title>

**Source:** `journeys/<journey>.md` sections <X.Y>, <X.Z>
<!-- Which sections of the journey/requirements doc does this plan implement? -->

**Sub-task:** <TICKET-ID> (<N> SP)
<!-- Optional: Jira/ticket ID and story points -->

**Skills:** `<skill-1>`, `<skill-2>`, `<skill-3>`
<!-- Which skills does this plan invoke? e.g. forms-content-author, forms-rule-creator, manage-apis -->

**Depends on:** Plan <NN> (<what it provides>), Plan <NN> (<what it provides>)
<!-- Explicit dependency chain. Use "Nothing (first plan)" for the first plan. -->

---

## Objective

<!-- One paragraph: what does this plan achieve and why? Keep it concise. -->

## Specification

<!-- The detailed design. Content varies by plan type — see Plan Types below. -->

## Steps to Execute

<!-- Numbered, actionable steps. Each step indicates which skill to invoke. -->

1. **<Action verb> <artifact>** using `<skill-name>`:
   <!-- Describe what to create/modify and how -->

2. **Validate:**
   ```
   node tools/eds-form-validator/validate.js <path-to-form.json>
   ```

3. **Push to AEM:**
   Use `forms-content-author` — `patch-aem-page-content` writes changes directly to AEM.
   Confirm the patch response shows success before proceeding.

## Acceptance Criteria

<!-- Checklist of testable conditions. Each item must be independently verifiable. -->

- [ ] <Condition 1 — what should be true when this plan is done>
- [ ] <Condition 2 — specific field/panel/rule behavior>
- [ ] <Condition 3 — error case handled correctly>
- [ ] Form passes validation without errors
- [ ] Form renders on AEM without errors

## Notes

<!-- Optional: Known issues, deferred items, edge cases, dependency notes. -->
<!-- Remove this section if not needed. -->
````

---

## Conventions

These rules govern all plans regardless of type.

| Rule | Description |
|------|-------------|
| **Scope** | Each plan targets a single workflow, feature, or use-case. If a plan touches unrelated concerns, split it. |
| **Cross-skill** | A plan can freely invoke multiple skills (build + logic + integration). Plans are scoped by *feature*, not by *skill*. |
| **Numbering** | Zero-padded two digits: `01`, `02`, ..., `10`, `11`. |
| **Execution** | Plans execute sequentially. Each plan declares its dependencies via `Depends on`. |
| **Max per journey** | 15 plans. If more are needed, the journey is too complex — decompose it. |
| **File path** | `plans/<journey>/NN-<short-title>.md` |
| **Validate + Deploy** | Every plan ends with: (1) `node tools/eds-form-validator/validate.js <path-to-form.json>`, then (2) push via `forms-content-author` (`patch-aem-page-content`). Always ask the user before pushing — never push silently. |
| **Dependency declaration** | Always state what each dependency provides, not just its number. e.g., `Plan 01 (panel skeleton)` not just `Plan 01`. |
| **Acceptance criteria** | Every criterion must be independently testable. Prefer specific observable behaviors over vague statements. |
| **Specification tables** | Use tables for structured data. Use trees for hierarchical structures (panel layout). Use pseudocode for algorithms. |

---

## Plan Types

A plan's type is not declared explicitly — it emerges from which specification sections and skills the plan uses. Consult the relevant sample below when writing each plan's **Specification** section.

| Type | Primary Skills | When to Use |
|------|---------------|-------------|
| **Structure** | `forms-content-author` | Form skeleton — panels, fields, basic validations. Usually Plan 01. |
| **Workflow** | `forms-content-author`, `forms-rule-creator` | Specific user flow or conditional branch within the form. |
| **Logic** | `forms-rule-creator` | Cross-cutting validations and business rules spanning multiple fields. |
| **Integration** | `manage-apis`, `forms-rule-creator` | API wiring — data loading, save/submit, external services. |
| **Infrastructure** | `forms-rule-creator` | Cross-cutting concerns — error handling, session management, toasts. |

---

### Structure Plan

Builds the form skeleton: panels, fields, and basic per-field validations.

**Characteristics:**
- Usually Plan 01 — establishes the skeleton all other plans build on
- Creates placeholder panels for features built in later plans
- Hidden panels default to `visible: false`
- Field specs include `constraintMessages` for validation errors

**Specification Pattern:**

```
### Panel Structure

rootPanel
├── <panelName1>
│   ├── <fieldName1>        (text-input)
│   └── <fieldName2>        (drop-down)
└── <panelName2>            (initially hidden)
    └── <fieldName3>        (number-input)

### Field Specifications

| Field          | Type       | Required | Min     | Max     | Pattern     | Notes   |
|----------------|------------|----------|---------|---------|-------------|---------|
| <fieldName1>   | text-input | Yes      | <min>   | <max>   | <pattern>   | <notes> |
| <fieldName2>   | drop-down  | Yes      | —       | —       | —           | <notes> |
```

**Typical Steps:**
1. Create form on AEM using `forms-content-author` (`create-form` intent)
2. Build form content — add panels, fields, types, required flags, min/max, patterns, `constraintMessages`
3. Validate → push (see Conventions)

---

### Workflow Plan

Builds a specific user flow or conditional branch within the form.

**Characteristics:**
- Depends on the structure plan (panel skeleton must exist)
- Heavy use of visibility rules and conditional required flags
- May introduce custom functions for dynamic behavior
- One plan per major branch/flow — keeps scope manageable

**Specification Pattern:**

```
### Branching Logic

| Component      | Trigger    | Condition                  | Actions                                                       |
|----------------|------------|----------------------------|---------------------------------------------------------------|
| `<fieldName>`  | is changed | value EQUALS `"<value>"`   | Show `<panel>`, Hide `<panel>`, Set `<field>` required = true |
| `<fieldName>`  | is changed | value EQUALS `"<value>"`   | Hide `<panel>`, Show `<panel>`, Clear `<field>`               |

### New Fields (if adding fields to existing panels)

| Field          | Panel          | Type       | Required | Visible | Notes   |
|----------------|----------------|------------|----------|---------|---------|
| `<fieldName>`  | `<panelName>`  | text-input | Yes      | true    | <notes> |

### Conditional Requirements

| Field          | Required When                        | Not Required When |
|----------------|--------------------------------------|-------------------|
| `<fieldName>`  | `<triggerField>` equals `"<value>"`  | All other cases   |
```

**Typical Steps:**
1. Add workflow-specific fields to existing panels using `forms-content-author`
2. Implement visibility rules using `forms-rule-creator`
3. Implement value/property rules (conditional required, clear on branch change)
4. Create custom functions if needed
5. Validate → push (see Conventions)

---

### Logic Plan

Adds cross-cutting validations and business rules spanning multiple fields or panels.

**Characteristics:**
- Depends on multiple earlier plans (fields must exist before rules reference them)
- Creates reusable custom functions (e.g., range checks, cross-field comparisons)
- Documents edge cases and boundary conditions explicitly
- Often includes a unit test step for custom functions

**Specification Pattern:**

```
### Validation Rules

| Trigger Fields           | Condition                | Error Message        | Display As |
|--------------------------|--------------------------|----------------------|------------|
| <fieldX> OR <fieldY>     | <fieldX> > <fieldY>      | "<error message>"    | Toast      |
| <fieldZ>                 | value outside <range>    | "<error message>"    | Inline     |

### Custom Functions

| Function Name            | Purpose                             | Parameters              | Returns                    |
|--------------------------|-------------------------------------|-------------------------|----------------------------|
| <validateFunctionName>   | <what it validates>                 | `<param1>`, `<param2>`  | void (shows toast on fail) |
| <validateFunctionName2>  | <what it validates>                 | `<param1>`, `<param2>`  | void (shows toast on fail) |

### Algorithm (for non-trivial logic)

Input:  <param1>, <param2>
Output: validation result

if <condition>:
  showErrorToast("<error message>")
  return false
return true
```

**Typical Steps:**
1. Create custom functions using `forms-rule-creator` (sync wrapper + async helper pattern)
2. Wire validation rules to trigger fields
3. Test edge cases (null/empty values, boundary conditions, multiple triggers)
4. Validate → push (see Conventions)

---

### Integration Plan

Wires APIs and data flows — loading data into the form, submitting data out, or calling external services.

**Characteristics:**
- Depends on structure + workflow plans (fields and panels must exist for prefill mapping)
- Documents every API field → form field mapping explicitly
- Handles multiple response scenarios (success, timeout, business exception)

**Specification Pattern:**

```
### API Definition

| Property     | Value                        |
|--------------|------------------------------|
| Endpoint     | `<api-endpoint-path>`        |
| Method       | POST                         |
| Content-Type | application/json             |
| Trigger      | On form load / button click  |

### Request Body

{
  "<paramName>": "<value source>"
}

### Response Handling

| Response           | Status | Action                                 |
|--------------------|--------|----------------------------------------|
| Success            | 200    | Extract data → prefill form            |
| Timeout            | 401    | Clear session → show relogin           |
| Business exception | 400    | Show error toast with message from API |

### Prefill Mapping

| API Field               | Form Field      | Transform         |
|-------------------------|-----------------|-------------------|
| `response.<apiField1>`  | `<formField1>`  | Direct            |
| `response.<apiField2>`  | `<formField2>`  | `<transformFn>`   |

### Custom Functions

| Function Name       | Purpose                            | Parameters              | Returns |
|---------------------|------------------------------------|-------------------------|---------|
| `<orchestratorFn>`  | Orchestrates API calls and prefill | `globals`               | void    |
| `<mappingFn>`       | Maps API response to form fields   | `data`, `globals`       | void    |
```

**Typical Steps:**
1. Register API definitions using `manage-apis` → generate JS client
2. Create orchestrator function using `forms-rule-creator`
3. Create mapping functions (prefill, request assembly, data transforms)
4. Wire form triggers (`fd:init` → data loading, button click → save/submit)
5. Validate → push (see Conventions)

---

### Infrastructure Plan

Cross-cutting concerns: error handling, session management, toast notifications, data sanitization.

**Characteristics:**
- Provides shared infrastructure consumed by other plans
- Build order may differ from plan number (may execute earlier than its number suggests)
- Documents all error messages in a centralized catalog
- Manages storage keys with clear ownership

**Specification Pattern:**

```
### Error Message Catalog

| Code           | Type    | Message             | Display As |
|----------------|---------|---------------------|------------|
| `<ERR_CODE_1>` | error   | "<error message>"   | Modal      |
| `<ERR_CODE_2>` | error   | "<error message>"   | Toast      |
| `<SUC_CODE_1>` | success | "<success message>" | Toast      |

### Session Management

| Scenario              | Detection               | Action                         |
|-----------------------|-------------------------|--------------------------------|
| Session timeout       | API returns 401         | Show relogin modal, clear data |
| Tab close             | `beforeunload` event    | Clear session storage          |
| Successful completion | Form submitted          | Clear all storage keys         |

### Storage Key Inventory

| Key            | Storage        | Read By          | Written By       | Purpose   |
|----------------|----------------|------------------|------------------|-----------|
| `<keyName1>`   | sessionStorage | <consuming plan> | <writing plan>   | <purpose> |
| `<keyName2>`   | localStorage   | <consuming plan> | External         | <purpose> |

### Utility Functions

| Function Name         | Purpose               | Parameters              | Returns |
|-----------------------|-----------------------|-------------------------|---------|
| `<errorHandlerFn>`    | Central error router  | `response`, `globals`   | void    |
| `<sessionHandlerFn>`  | Relogin flow          | `globals`               | void    |
| `<cleanupFn>`         | Storage cleanup       | —                       | void    |
```

**Typical Steps:**
1. Create utility functions using `forms-rule-creator` (toast, error handler, sanitizers, storage cleanup)
2. Add UI elements using `forms-content-author` if needed (relogin modal, shared error display)
3. Wire rules to fields (sanitization on `fd:change`, relogin button click)
4. Validate → push (see Conventions)

> **Dependency note:** If integration/logic plans depend on shared infrastructure functions, execute the infrastructure plan before those plans regardless of its number.
