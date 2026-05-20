---
name: forms-content-generate
description: >
  Use when building an AEM Adaptive Form field or component payload — text
  field, email, phone, dropdown, checkbox, date picker, number, panel, or any
  form component.
  Triggers: add field, create field, new field, add component, insert field,
  add section, build form element.
type: skill
---

# Form Content Create

Constructs and validates AEM Adaptive Form component objects locally. **No MCP calls are made here.** This skill is invoked by `forms-content-update` during the build phase: it receives user intent + CONTENT_MODEL + DEFINITION (or a path to the definition file), extracts a component profile via scripts, builds properties strictly from that profile + user intent, and returns a validated component object. The caller owns all MCP interactions.

> **Script paths:** All CLIs are pre-bundled in `$SKILL_DIR/scripts/`. The base directory is shown in the "Base directory for this skill:" line at invocation time.

---

## 1. Scope

**Does:**
- Map user intent to componentType using `references/field-types.md`
- Run `filter-definition` to slim the definition to the target component type
- Run `get-component-def` to extract the component's property profile (fields + requiredKeys)
- Build properties from the profile driven strictly by user intent — only required + explicitly requested properties are set
- Apply AEM conventions (§4) for things not in the definition (jcr:title, id, fieldType quirks)
- Run `check-name-collision` to verify the proposed `name` is unique
- Run `validate-add` to verify the component object is structurally correct
- Return the validated component object to `forms-content-update`

**Does not:**
- Call any MCP tools (`get-aem-page-content`, `patch-aem-page-content`, etc.)
- Resolve insert positions
- Find panels by name
- Submit patches

---

## 2. Build Workflow

```
1. Look up fieldType + hint from references/field-types.md based on user intent
2. resolve-component-type(definitionFile, fieldType, hint) → componentType
3. filter-definition(definitionFile, componentType) → SLIM_DEFINITION
4. get-component-def(SLIM_DEFINITION, componentType) → COMPONENT_PROFILE
5. Read COMPONENT_PROFILE to build properties:
   a. requiredKeys → these MUST be present in the component object
   b. For each field in COMPONENT_PROFILE.fields:
        - Property key = field.name with "./" prefix stripped  (e.g. "./placeholder" → "placeholder")
        - valueType = "string"  → value must be a string
        - valueType = "boolean" → value must be true/false (not "true"/"false")
        - valueType = "number"  → value must be a number (not a string)
        - component = "select"  → value MUST be one of options[n].value — never invent a value

        **When to set a property (strict — do not bloat):**
        SET the property only if ONE of these is true:
          1. The field appears in requiredKeys → always set it
          2. The user's request explicitly maps to this field (e.g. user says "make it required" → set `required: true`; "add placeholder 'Enter name'" → set `placeholder`)
        DO NOT set a property if:
          - It has a `default` value in the definition and the user did not mention it
          - It is optional and the user did not mention anything that maps to it
          - You are guessing what a "reasonable default" might be

        **Intent mapping examples:**
        | User says | Field | Value |
        |---|---|---|
        | "required" / "mandatory" | `required` | `true` |
        | "placeholder '...'" | `placeholder` | the text |
        | "max N characters" | `maxLength` | N (number) |
        | "min N characters" | `minLength` | N (number) |
        | "read only" / "disabled" | `readOnly` / `enabled` | `true` / `false` |
        | "default value '...'" | `default` | the value |
        | "autocomplete given-name" | `autocomplete` | `"given-name"` (from options) |
        | nothing → omit | anything else | — |
   c. jcr:title → always set from user intent (NOT in definition fields — it is a JCR property)
   d. id → always equal to name (see §4 Naming)
6. Run check-name-collision → propose alternative if exit 1
7. Run validate-add → fix on exit 1, retry
8. Return validated component object
```

**Script calls for steps 2–4:**
```bash
# Step 2 — resolve exact componentType from definition (not from field-types.md)
RESOLVED=$(node $SKILL_DIR/scripts/resolve-component-type.bundle.js \
  --definition-file '<path to MCP tool-result file>' \
  --field-type '<fieldType from field-types.md>' \
  [--hint '<hint from field-types.md>'])
COMPONENT_TYPE=$(echo "$RESOLVED" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).normalized)")

# Step 3 — slim the definition to just this component
SLIM=$(node $SKILL_DIR/scripts/filter-definition.bundle.js \
  --definition-file '<path>' \
  --component-types "$COMPONENT_TYPE")

# Step 4 — extract the component profile
node $SKILL_DIR/scripts/get-component-def.bundle.js \
  --definition "$SLIM" \
  --component-type "$COMPONENT_TYPE"
```

---

## 3. Component Object Structure

Server generates `capi-key`/`capi-index` — **never include those**.

```json
{ "id": "<name>", "componentType": "<resource type — no /apps/ prefix>", "properties": { ... } }
```

**`items` rules (AEM Content API contract):**
- Leaf fields (textinput, emailinput, numberinput, etc.): **omit `items` entirely**
- Empty panel: `"items": []`
- Panel with pre-populated children: `"items": [{ child1 }, { child2 }]`
- `"items": {}` (object) → always 400

---

## 4. AEM Conventions and Quirks

These apply regardless of what the definition schema says. The schema covers validity; these cover correctness.

### Naming
- `name`: derive from user intent using snake_case — "Date of Birth" → `date_of_birth`. Used in rule expressions and JCR paths — renaming breaks rules.
- `id`: always equal to `name`.

### Layout
- `dorColspan`: **number** (1–12), NOT a string. Always set to `12` — this is a layout essential, not a definition default. Without it the field may not render correctly. This is the one property set unconditionally regardless of user intent.
- `componentType`: always use the `normalized` value from `resolve-component-type` output (no `/apps/` prefix). Never construct it manually.

### Field-specific quirks

See [references/field-quirks.md](references/field-quirks.md) for field-type-specific property rules (telephoneinput, numberinput, datepicker, dropdown, checkbox, switch, fileinput, panelcontainer).

---

## 5. Validation Steps

By the time these run, §2 build workflow has already produced SLIM_DEFINITION (via filter-definition) and COMPONENT_PROFILE (via get-component-def). Use SLIM_DEFINITION here — do not re-run filter-definition.

### 1. check-name-collision — run first
```bash
node $SKILL_DIR/scripts/check-name-collision.bundle.js \
  --content-model '<CONTENT_MODEL>' \
  --name '<proposed name>'
```
Exit 1 → propose an alternative name, re-check.

### 2. validate-add — run after name is confirmed clean
```bash
node $SKILL_DIR/scripts/validate-add.bundle.js \
  --definition '<SLIM_DEFINITION from §2 step 2>' \
  --component '<componentObject json>' \
  [--content-model '<CONTENT_MODEL>' --panel-capi-key '<capiKey>']
```
Exit 1 → read the error output, fix the component object properties, re-run. If exit 1 again → stop and report errors.
