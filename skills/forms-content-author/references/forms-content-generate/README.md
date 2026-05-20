# forms-content-generate

Local component construction for AEM Adaptive Forms. No AEM calls — builds and validates component payloads before they are submitted by `forms-content-update`.

---

## Scope

### What this skill does
- Maps user intent to AEM componentType using `references/field-types.md`
- Builds component object JSON from 14 field type templates
- Checks name uniqueness via `check-name-collision`
- Validates component structure via `validate-add`
- Returns a validated, ready-to-submit component object to `forms-content-update`

### What this skill does NOT do
- No MCP calls (`get-aem-page-content`, `patch-aem-page-content`, etc.)
- No patch operation construction or validation
- No insert position resolution
- No panel/field lookup by name or capi-key

---

## Scripts

All bundles are pre-built and committed — no install needed at runtime.

| Bundle | Purpose | Exit codes |
|---|---|---|
| `validate-add.bundle.js` | Validates new component objects — type checks, required properties, items contract, dorColspan range, date/number format skeletons | 0=valid, 1=errors, 2=bad args |
| `check-name-collision.bundle.js` | Checks proposed field name against all existing names in the content model tree | 0=no collision, 1=collision |

---

## CLI Usage

### validate-add
```bash
node $SKILL_DIR/scripts/validate-add.bundle.js \
  --definition   '<json from get-aem-page-content-definition>' \
  --component    '{"id":"dob","componentType":"forms-components-examples/components/form/datepicker","properties":{"name":"dob","fieldType":"date-input","displayFormat":"d/M/y","dorColspan":12}}'
```

With optional placement check (validates field is being added to a valid parent panel):
```bash
node $SKILL_DIR/scripts/validate-add.bundle.js \
  --definition    '<json>' \
  --component     '<componentObject json>' \
  --content-model '<json from get-aem-page-content>' \
  --panel-capi-key '0:2'
```

Exit: `0` = valid · `1` = errors (self-correct and retry) · `2` = bad args

### check-name-collision
```bash
node $SKILL_DIR/scripts/check-name-collision.bundle.js \
  --content-model '<json from get-aem-page-content>' \
  --name 'phone_number'
```

Exit: `0` = no collision · `1` = collision (propose alternative name and retry)

---

## References

### `references/field-types.md`

Maps natural language user intent to AEM componentType and fieldType. Covers all 14 supported field types with key properties for each. Also documents AEM quirks:
- `dorColspan` is a number (1–12), not a string
- `telephoneinput` fieldType is `"tel"`, not `"telephone-input"`
- `switch` is its own componentType, never `checkbox + fd:viewType`
- `enum`/`enumNames` are array properties, not child items

---

## Files

```
forms-content-generate/
├── SKILL.md                              # Skill instructions for Claude
├── README.md                             # This file
├── references/
│   └── field-types.md                    # componentType → fieldType mapping table + AEM quirks
└── scripts/
    ├── validate-add.bundle.js            # Validates component objects before add ops
    └── check-name-collision.bundle.js    # Checks name uniqueness across content model tree
```
