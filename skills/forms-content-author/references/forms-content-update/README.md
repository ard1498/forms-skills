# forms-content-update

All AEM Adaptive Forms MCP operations — create, add, modify, delete, move, read, metadata.

The skill talks to a live AEM instance through the Sites Content MCP server. It delegates component object construction to the `forms-content-generate` sibling skill (which builds and validates payloads locally). Content mutations are validated deterministically before `patch-aem-page-content` calls.

---

## What You Can Do

### Create a Form
```
"Create a registration form with first name, last name, email, and a submit button"
"Scaffold a loan application form"
```
Resolves a blank template page first. If `/content/forms/af/default-site/default-page` exists, use it. If not, ask the user for an existing blank form path or pageId. Batches all fields in a single patch. If the initial request includes title, submit action, prefill service, or schema binding, applies those after the copy step without asking again.

### Add Fields
```
"Add a phone number field to the Personal Info section"
"Add a country dropdown with options US, UK, India"
"Add a date of birth field above the submit button"
"Add a file upload for identity documents"
"Add a checkbox group for interests: Sports, Music, Travel"
```
Delegates component object construction to `forms-content-generate`, resolves insert position (before submit button by default), validates the patch, then writes to AEM.

### Add Panels / Sections
```
"Add a Personal Information section"
"Add a wizard step called Review"
```

### Modify Properties
```
"Make the email field required"
"Change the placeholder of phone to 'Enter 10-digit number'"
"Set max length of name to 50"
"Change the label of first_name to 'Given Name'"
```
`validate-patch` runs before the patch — self-corrects type errors automatically.

### Remove Fields
```
"Remove the fax number field"
"Delete the old address section"   ← warns you it removes all children first
```

### Reorder Fields
```
"Move email above phone"
"Move the address section to be the last panel"
```
Two round-trips (eTag refreshed between remove and add) — transparent to you.

### Update Enum Options
```
"Add Australia to the country dropdown"
"Set gender radio options to Male, Female, Non-binary"
```

### Set Form Configuration
```
"Set the form title to 'Account Opening'"        ← page-level metadata
"Set the submit action to our REST endpoint"     ← form container property
"Bind the form to the Customer schema"           ← form container property
```

### Read Structure
```
"Show me all the fields in this form"
"What's inside the Personal Info section?"
```
No patch made — returns flat field list with depth, pointer, and componentType.

---

## Validation Invariant

**`patch-aem-page-content` calls are preceded by deterministic script validation unless the target property has no usable definition entry.**

| Op type | Scripts called before patch |
|---|---|
| add (new field) | `validate-patch` (skips numeric paths, catches mixed ops) |
| replace (property) | `validate-patch` (full type + enum coverage) |
| remove (delete) | `validate-patch` (no value, but runs for mixed batches) |
| page metadata (title/description) | neither — page JCR props have no definition entry |

Self-correct loop: if any script exits 1, the LLM fixes the op and reruns before patching.

---

## Design Principle: LLM for Reasoning, Scripts for Predictable Work

Every script exists to move a specific class of work **out of the LLM and into deterministic code**.

| Use the LLM for | Use a script for |
|---|---|
| Deciding which panel to target | Finding its pointer and capiKey |
| Deciding where to insert a field | Resolving the exact numeric insert position |
| Choosing which property to patch | Type-checking the patch value against the definition |
| Summarizing the form structure | Walking the content model tree |

Without these scripts, the LLM would guess at JSON Pointer paths, silently produce wrong types, and re-derive insert positions from scratch. Each script removes one failure mode that would otherwise produce a silent bad patch or a 400 from the Content API.

**Why each script was created:**

- **`find-field`** — The content model is a nested map keyed by opaque capi-keys. Converting a field name to the correct JSON Pointer is mechanical lookup, not reasoning. The script also strips `capi-key`/`capi-index` from the returned component so it can be used directly as an add op value in move/reorder.
- **`resolve-insert-position`** — "Before the submit button" requires scanning all siblings for the first non-submit leaf. The position is numeric and exact; off-by-one produces wrong ordering.
- **`validate-patch`** — Replace ops carry property values that must match types in the Content API definition (string vs boolean vs number vs enum). Script enforces this deterministically before the MCP call rather than after a 400.
- **`list-form-fields`** — Flat traversal with depth, pointer, and componentType for every field. Pure tree walk; no judgement involved.

---

## Scripts

All bundles are pre-built and committed to `scripts/` — no install needed at runtime.

| Bundle | Purpose | Exit codes |
|---|---|---|
| `validate-patch.bundle.js` | Type-checks replace ops against Content API definition | 0=valid, 1=errors, 2=bad args |
| `find-field.bundle.js` | Finds field/panel by name or jcr:title → capiKey + pointer + stripped component object | 0=found, 1=not found |
| `resolve-insert-position.bundle.js` | Returns insert index in panel (before submit or append) | 0=ok, 1=panel not found |
| `list-form-fields.bundle.js` | Flat list of all fields with depth, pointer, componentType | always 0 |

---

## CLI Usage

### validate-patch
```bash
node scripts/validate-patch.bundle.js \
  --content-model '<json from get-aem-page-content>' \
  --definition    '<json from get-aem-page-content-definition>' \
  --ops '[{"op":"replace","path":"/items/0/properties/maxLength","value":100}]'
```

### find-field
```bash
node scripts/find-field.bundle.js \
  --content-model '<json>' \
  --name 'personal_info'
```

### resolve-insert-position
```bash
node scripts/resolve-insert-position.bundle.js \
  --content-model '<json>' \
  --panel-capi-key '0:2'
```

### list-form-fields
```bash
node scripts/list-form-fields.bundle.js \
  --content-model '<json>'
```

Exit: `0` = valid/found/ok · `1` = errors/not found · `2` = bad args

---

## AEM Setup

### Local AEM (SDK / Quickstart)
```bash
claude mcp add aem-sites-content -- node /tmp/aem-sites-contentapi-mcp-server/build/index.js
# Env vars for the MCP server process:
#   AEM_AUTHOR_URL=http://localhost:4502
#   AEM_AUTHOR_AUTH_PARAMETER=admin:admin
#   ASSETS_ACCESS_TOKEN=dummy
```

### AEM as a Cloud Service
```bash
claude mcp add --transport http aem-sites-content \
  https://mcp.adobeaemcloud.com/adobe/mcp/content
# Auth: IMS OAuth (browser login opens automatically)
```

---

## Core Workflow

```
1. get-aem-page-content(pageId)            → CONTENT_MODEL + eTag
2. get-aem-page-content-definition(pageId) → DEFINITION
3. [for add ops]   find-field + resolve-insert-position (forms-content-generate builds component object)
4. [for all ops]   validate-patch  ← MUST pass before step 5
5. patch-aem-page-content(pageId, eTag, ops)
6. get-aem-page-content(pageId)            → confirm change applied
```

---

## Files

```
SKILL.md                                   Claude Code skill definition
README.md                                  This file

scripts/
  validate-patch.bundle.js                 Prebuilt — validate replace ops
  find-field.bundle.js                     Prebuilt — find field/panel by name
  resolve-insert-position.bundle.js        Prebuilt — resolve insert index in panel
  list-form-fields.bundle.js               Prebuilt — list all fields in content model

assets/                                    Supporting assets
references/                                Reference material
```
