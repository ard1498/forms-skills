---
name: jud-to-screen
description: >
  Creates Screen.md documentation for AEM Forms screens from a JUD (.docx) and design screenshots.
  Generates structured docs covering fields, validation rules, API calls, business logic, visibility
  rules, panel hierarchy, and global variable tracking. Also writes or updates the journey-level
  globals-variable-registry.md. Supports single-screen and all-screens modes. Global variables optional.
  Triggers: jud to screen, jud, docx screen, document screen from jud, screenshot screen doc.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# JUD to Screen.md

You create `Screen.md` documentation files from two inputs: a **JUD (.docx file)** and **screenshots** of the new design. The output format is defined in the Output Format section below.

---

## Dependencies

- **[scripts/docx-to-text.py](scripts/docx-to-text.py)** — extracts plain text from .docx files (no external dependencies)

---

## Step 1 — Parse Inputs from Prompt

Extract the following from the user's prompt:

| Input | Required | How to identify |
|-------|----------|----------------|
| **JUD file path** | Yes | A `.docx` file path mentioned or `@`-referenced |
| **Screenshots folder** | Yes | A folder path ending in `screenshots/` or containing image files |
| **Screen name(s)** | Yes | Explicit screen name (e.g., "account selection") OR "all" OR inferred from folder name |
| **Output folder** | Yes | The screen folder containing or adjacent to the screenshots folder |
| **Global variables** | No | Inline list in the prompt OR a file path (`.json`, `.md`, `.txt`) containing variable definitions |

**If any required input is missing, ask the user before proceeding.** Do not guess paths.
Global variables are optional — if not provided, omit the Global Variables section from the output entirely.

**If screen name is `"all"`** → follow the Multi-Screen Handling section instead of processing a single screen.

**Screenshot guard — CRITICAL:**
Before doing any other work, verify the screenshots folder exists and contains at least one image file. Use Glob to check:
```
<screenshots-folder>/*.png
<screenshots-folder>/*.jpg
```

If screenshots are absent:
> "Screenshots are required to generate accurate field-level content. Please add screenshots to `<folder>` first, then re-run."

Stop and wait. Do not proceed without screenshots.

---

## Step 2 — Parse Global Variables (Optional)

If the user provides global variables, load them before generating the Screen.md.

**Two formats accepted:**

**Format A — Inline in prompt:**
The user pastes a list directly, e.g.:
```
globals:
  journeyID: string — unique journey identifier
  mobileNumber: string — customer's mobile number
  customerType: string — EXISTING / NEW / RETURNING
```

**Format B — File path:**
The user provides a path to a `.json`, `.md`, or `.txt` file. Read the file using the Read tool and parse all variable definitions from it.

**What to extract per variable:**
| Field | Description |
|-------|-------------|
| Variable name | The key / identifier |
| Type | string, boolean, number, object, array |
| Description | What it stores / represents |
| Set by | Which screen or API sets this variable (if known) |
| Consumed by this screen | How this screen reads or uses it |

These will be documented in the **Global Variables** section of the output (see Output Format below).

If no global variables are provided → skip this step and omit the section from the output.

---

## Step 3 — Extract JUD Text

Use the skill's docx extraction script via Bash, redirecting output to a temp file:

```bash
python3 "<skill-base>/scripts/docx-to-text.py" "<JUD file path>" > /tmp/jud-extracted.txt
wc -l /tmp/jud-extracted.txt
```

Where `<skill-base>` is this skill's base directory (resolve from the skill path provided by the runtime).

The output will be large. Read it in chunks using offset/limit if needed. Scan for the section(s) relevant to the requested screen.

**Error handling:**
- `File not found` → ask user to verify the JUD path
- `Not a valid .docx file` → ask user to confirm the file is a valid Word document
- Script missing → check that `scripts/docx-to-text.py` exists at the skill's base directory

---

## Step 4 — Identify Relevant JUD Section

Locate the screen's section in the extracted text by searching for its heading (e.g., `Account Selection Screen`, `Personal Details Screen`).

**If the screen heading is not found:** stop and ask the user:
> "Could not find a section for '<screen name>' in the JUD. Could you confirm the exact section heading? Common headings found in this document are: [list top-level headings from the extracted text]."

Do not proceed with an empty JUD section — the output would be missing all rules, APIs, and business logic.

Extract from that section:
- All User Stories (US_XX) and their Acceptance Criteria
- Field names, data types, validation rules
- API names, endpoints, request/response payloads
- Business rules and flow descriptions
- Error messages and error handling behaviour
- Redirection conditions (when this screen is shown/skipped)

**If processing all screens:** identify each screen section boundary (usually a heading row in the JUD table) and process each one separately, producing one `Screen.md` per screen.

---

## Step 5 — Read Screenshots

Read **every screenshot** in the provided folder using the Read tool (supports PNG/JPG visually). For each screenshot, extract:

- **Section headings** — exact copy as shown on screen
- **All field labels** — exact text and input type (text field, dropdown, radio, checkbox, toggle, button)
- **Placeholder text** inside fields
- **Button labels** — exact copy
- **Static text / notes / disclaimers** — exact copy
- **Visual states** captured — initial, selected, error, modal open, etc. (note which state each screenshot shows)
- **Icons** — search icon, calendar icon, eye icon, tick mark, etc.
- **Layout order** — sequence of sections top to bottom
- **Conditional sections** — panels that appear only in certain states

**Priority rule:** Screenshots are the **primary source for field labels, copy, and layout**. JUD is the **primary source for rules, APIs, and business logic**. When they conflict, note it as an open item.

**Ignore in screenshots — do not document these:**
- Page header (logo, tagline, security badge)
- Page footer (copyright text)
- Breadcrumb / progress stepper

These are generic components shared across all screens. They are not screen-specific and must be excluded from the Content Screen section entirely.

---

## Step 6 — Infer Output Path

The output file is always named `Screen.md` and saved in the screen's folder.

Infer the path:
- If screenshots folder is `journey/<journey-name>/new-screens/01-account-selection/screenshots/` → output is `journey/<journey-name>/new-screens/01-account-selection/Screen.md`
- If the screen folder is provided directly in the prompt → save there

If a `Screen.md` already exists at that path, confirm with the user before overwriting.

---

## Step 7 — Generate Screen.md

Use the Output Format defined in this step. Every section must be present. Use `_(Open Item: ...)_` for anything not determinable from JUD or screenshots.

---

### Output Format

~~~markdown
# <Screen Name> (<Journey> — <Flow>)

**Progress:** <step label from JUD or screenshot breadcrumb> (<% complete if known>)
**Applies to:** <customer type and flow scope — from JUD>

---

## Screenshots

| Screenshot | Description |
|------------|-------------|
| ![1](screenshots/<filename>) | <what state this screenshot shows> |
| ![2](screenshots/<filename>) | <what state this screenshot shows> |

---

## Navigation

| Action | Destination |
|--------|-------------|
| **← Back** | <destination from JUD, or _(Open Item: TBD)_> |
| **Continue Button** | <what it triggers, then where it navigates> |

---

## Panel Hierarchy

Visual tree of all panels and their children. Indent one level per nesting depth. List every panel and field in document order (top to bottom as seen in screenshots).

```
<ScreenRootPanel>
├── <sectionPanel>
│   ├── `fieldName` (field-type)
│   └── `fieldName` (field-type)
├── <conditionalPanel> [hidden on load]
│   ├── `fieldName` (field-type)
│   └── <nestedPanel>
│       └── `fieldName` (field-type)  ← repeatable, maxOccur: -1
└── `continueBtn` (button)
```

Rules:
- Every `panel` or `modal` that contains other fields must appear as a tree node
- Fields that sit directly in a panel are leaf nodes under it
- Mark hidden-on-load panels with `[hidden on load]`
- Mark repeatable **panels** with `maxOccur: -1` (only AEM `panel` nodes get `maxOccur` — not custom components)
- Custom/compound components (tile groups, modals) appear as a single node — do not expand their internals unless they contain named form fields
- Repeatable custom components (e.g. a repeatable row inside a custom list): do NOT add `maxOccur: -1`. Note repeatability in Properties instead (e.g. "Repeatable row — one per result")

---

## Content Screen

### <Section Name>

<One-line description of section if helpful>

| Name | Title | Type | dataRef | Required | Visible | Properties |
|------|-------|------|---------|----------|---------|------------|
| `camelCaseName` | Exact label from screenshot | field-type | `$.path` or - | true/false/- | true/false | constraints, options, copy, behaviour |

_(Repeat one ### sub-section per logical group of fields, matching the visual sections in screenshots)_

---

## Validation Rules

### <Field Group or Field Name>

| Trigger | Rule | Error Message |
|---------|------|---------------|
| On Continue click | <rule> | "<exact error text from JUD>" |
| On tab-out | <rule> | "<exact error text from JUD>" |

_(Only include rules not already captured in the Properties column above)_

---

## Visibility Rules

### Initially Hidden Components

| Component | Reason | Shown When |
|-----------|--------|------------|
| `componentName` | Why hidden on load | Condition that reveals it |

### Dynamic Visibility Rules

| Trigger | Action |
|---------|--------|
| <field or event> | Show/hide `component`; enable/disable `btn`; etc. |

---

## Business Rules

### On Screen Load

- [ ] <initialisation step>
- [ ] <prefill step — note data source>
- [ ] <default state of buttons/panels>

### <Flow Name> (e.g., Primary Bank Selection Flow)

- [ ] <step 1>
- [ ] <step 2>
- [ ] On Continue: <API call or navigation>

_(One sub-section per distinct user flow from JUD)_

---

## API Calls

### <API Name / trigger event>

<Brief description of when this API is called>

**Endpoint:** `<endpoint from JUD>`

**Request Payload:**
```json
{
  <fields from JUD>
}
```

**Success Response:**
```json
{
  <fields from JUD>
}
```

**On Success:** <action>
**On Failure:** <action — terminate journey / show error / continue anyway>

**API payload rule — dynamic fields must use `""` not sample values:**
Any field whose value comes from a global variable (journeyID, mobileNumber, etc.) or the form at runtime must be shown as an empty string `""` in the payload. Never use sample/example values (e.g. `"9811058064"`, `"630621082118"`). Static/hardcoded fields (e.g. `"partnerID": "PARTNER_ID"`) may keep their literal value.

---

## Validation Errors

| Trigger | Type | Message |
|---------|------|---------|
| <condition> | Field validation | "<exact message from JUD>" |

## Error Popups

<Describe popup title, body copy, CTA buttons from JUD — or _(Open Item: TBD)_ if not documented>

---

## Summary

| Category | Fields | Rules | APIs |
|----------|--------|-------|------|
| <Section Name> | X | X | X |
| **Total** | **X** | **X** | **X** |

---

## Component References

_(Include this section ONLY if the screen uses custom or decorator components. Omit entirely if every field is a plain OOTB type.)_

All non-OOTB components used on this screen. Link to each component's README for implementers writing stories or building the fragment.

| Component | Type | Used For | Documentation |
|-----------|------|----------|---------------|
| `componentName` | custom / decorator | Which field(s) use it | [README](code/blocks/form/components/<name>/README.md) |

---

## Global Variables

_(Include this section ONLY if global variables were provided by the user. Omit entirely if no variables were given.)_

These are journey-level variables available globally across all screens. Listed here are the ones **consumed or set by this screen**.

| Variable | Type | Description | Set By | Used On This Screen |
|----------|------|-------------|--------|---------------------|
| `variableName` | string / boolean / number / object | What it stores | Screen or API that sets it | How this screen reads or uses it |

_(If a variable is in the provided list but has no clear usage on this screen, include it with "Not used on this screen" in the last column so the list remains complete for reference.)_

---

## Open Items / To Be Clarified

### New Design Questions

- [ ] **<Topic>** — <what needs clarification>

### Carried Over from Old Design

- [ ] <unresolved item inherited from previous design>

---

## Variables Set by This Screen

_(Omit this section entirely if this screen sets no variables.)_

These are journey-level variables that this screen **writes or initialises**. Downstream screens can read these values.

| Variable | Type | Value / What is set | Set When | First Set By |
|----------|------|---------------------|----------|--------------|
| `variableName` | string / boolean / number | What value is assigned | Trigger condition (e.g. "On bank tile selection", "On API failure") | This screen or "Already exists — amended here" |
~~~

---

## Field Naming Convention

Generate `camelCase` names derived from the screenshot label:

| Label | Name |
|-------|------|
| "First Name" | `firstName` |
| "Date of Birth" | `dateOfBirth` |
| "Continue >" button | `continueBtn` |
| "Primary Bank" tile | `bankPrimary` |
| Section container | `<section>Container` |

**Field types:** Use the `fieldType` values from the project's component registry if available (`journey/component-registry.md`). Use OOTB AEM Forms field types (`text-input`, `number-input`, `date-input`, `drop-down`, `radio-group`, `checkbox`, `panel`, `button`, `image`, `plain-text`) and any custom/decorator component names defined in the project. Never invent types — if nothing fits, use `custom` and note the closest match in Properties.

**Repeatable panels:** Use type `panel` and add `maxOccur: -1` in the Properties column. Do NOT use `repeatable-panel` as a type — it is not an OOTB AEM Forms field type. See Panel Hierarchy rules above for custom component repeatability.

---

## Detecting Variables Set by This Screen

Scan **all sections** of the JUD text for this screen — Business Rules, API success/failure handling, Visibility Rules, and flow descriptions. Look for language like:

- "store `X` to global variable"
- "set `X` = value"
- "save `X` for use in"
- "pass `X` to next screen"
- "update `X`"
- API failure/success blocks that assign a state flag

For each variable found:

| Field | What to capture |
|-------|----------------|
| `variableName` | camelCase name as used in JUD |
| Type | string / boolean / number / object — infer from the value being assigned |
| Value / What is set | The actual value or description (e.g. `"ACCOUNT_SELECTION_FAILED"`, selected bank name) |
| Set When | The trigger: "On primary bank tile selection", "On AccountSelection API failure", etc. |
| First Set By | "This screen" if this is first mention; "Already exists — amended here" if variable was in the input globals list |

If no variables are set → omit the section from Screen.md entirely.

---

## Global Variable Registry File

After writing Screen.md, update (or create) the shared registry file:

**Path:** `journey/globals-variable-registry.md`

This file lives at the `journey/` root and covers all journeys.

### Registry file format

```markdown
# Global Variable Registry

| Variable | Journey | Type | Description | First Set By | Amended By | Consumed By |
|----------|---------|------|-------------|--------------|------------|-------------|
| `variableName` | <journey-name> | string | What it stores | Screen that first sets it | Screen(s) that update it (comma-separated, or — if none) | Screen(s) that read it (comma-separated, or — if unknown) |
```

### Update rules (strictly append-merge, never overwrite)

1. **File does not exist** → create it with header row and add all variables from:
   - Input globals provided by the user (these are consumed by this screen — set `First Set By` to the screen name from the globals context if known, else `_(unknown)_`)
   - Variables set by this screen (from the "Variables Set by This Screen" section)

2. **File already exists** → read it first, then for each variable in the current screen:
   - **Variable not in registry** → append a new row
   - **Variable already in registry, set by this screen for the first time** → this should not happen if prior screens ran correctly, but if it does, append as new row with a note
   - **Variable already in registry, and this screen amends it** → update only the `Amended By` column; add this screen name (append to existing value, comma-separated); do NOT change any other column
   - **Variable in input globals but not yet in registry** → append as new row

3. **Never delete rows.** Never change `First Set By`. Never change `Description` of an existing entry.

4. After updating, write the file using the Write tool (full file rewrite is acceptable since it's the only safe way to update a markdown table).

---

## What to Include vs Exclude

### Include
- All user-facing fields visible in screenshots
- Conditionally hidden panels that have visibility rules
- Repeatable panels — type `panel`, `maxOccur: -1` in Properties
- Static text with important copy (exclusion notes, T&C, headings)
- Exact error message copy from JUD
- API payloads with exact field names from JUD
- Fields marked as "authorable" in JUD

### Exclude
- **Page header** (logo, tagline, security badge) — generic, not screen-specific
- **Page footer** (copyright text) — generic, not screen-specific
- **Breadcrumb / progress stepper** — generic, not screen-specific
- Pure layout/wrapper panels with no visibility rules
- CSS classes and styling details
- Journey state logging and analytics events
- Duplicate validation already in the Properties column
- JIRA story tables

---

## Multi-Screen Handling

If the user asks for **all screens** or the JUD covers multiple screens:

1. Identify each screen section in the JUD (look for screen name headings in the table)
2. For each screen, check if a `screenshots/` folder exists at the expected path using Glob
3. If screenshots missing for a screen → skip it and report:
   > `Skipped <screen name> — screenshots not found at <expected path>`
4. Process each screen that has screenshots; save `Screen.md` to each screen's folder
5. Report a summary of what was created and what was skipped

---

## Workflow

1. Parse JUD path, screenshots folder, screen name(s) from prompt — ask user if required inputs are missing. If screen name is `"all"` → follow the **Multi-Screen Handling** section.
2. **Check screenshots exist** — stop and ask if not found (before any other work)
3. **Load component registry** (optional) — if `journey/component-registry.md` exists in the project, read it to get available field types. If not present, use standard OOTB AEM Forms field types.
4. If global variables provided (inline or file path) → load and parse them (see **Step 2 — Parse Global Variables**); else skip
5. Extract JUD text to `/tmp/jud-extracted.txt` via Bash (see **Step 3 — Extract JUD Text**)
6. Locate the screen section(s) in the extracted JUD text (see **Step 4 — Identify Relevant JUD Section**). If section not found → stop and ask user to confirm heading.
7. Read all screenshots one by one with the Read tool (see **Step 5 — Read Screenshots**)
8. Cross-reference: screenshots → fields/labels/copy; JUD → rules/APIs/logic
9. Infer output path from the screenshots folder location (see **Step 6 — Infer Output Path**)
10. If `Screen.md` already exists → confirm with user before overwriting
11. Generate `Screen.md` following the Output Format in **Step 7 — Generate Screen.md**
    - Include **Global Variables** section only if variables were provided in step 4
    - Include **Variables Set by This Screen** section only if variables were detected (see **Detecting Variables Set by This Screen**); else omit
12. Write Screen.md using the Write tool
13. Update the shared `globals-variable-registry.md` (see **Global Variable Registry File** section) — only if global variables are in play
14. Report: path saved, count of fields/rules/APIs, variables set by screen (if any), registry file path updated
