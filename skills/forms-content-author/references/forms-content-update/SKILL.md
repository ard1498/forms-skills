---
name: forms-content-update
description: >
  Use when performing MCP operations on AEM Adaptive Forms — create form,
  add, modify, delete, or move fields, panels, fragments, or form metadata.
  Triggers: create form, add field, add panel, add fragment, change, set,
  update, rename, make required, remove, delete, move, reorder, show fields,
  list fields, add options, set submit action, set title.
type: skill
---

# Form Content Update

Handles ALL AEM MCP operations for Adaptive Forms: create form, add fields/panels/fragments, property changes, deletions, moves, reads, and metadata updates.

> **Script paths:** All CLIs are pre-bundled in `$SKILL_DIR/scripts/`. The base directory is shown in the "Base directory for this skill:" line at invocation time.

> **Component construction:** Delegates component object construction to `forms-content-generate` — invoke it first to build and validate the component object, then use that object in the add op.

---

## 1. INVARIANT: Validate Before Every Patch

```
RULE: validate-patch MUST be called before patch-aem-page-content unless the target
      property has no usable definition entry (see §7 exception for guideContainer).

add ops:     validate-add (delegated to forms-content-generate) → validate-patch (skips numeric paths, catches mixed ops)
replace ops: validate-patch only (full type + enum coverage)
remove ops:  validate-patch (no value to check, but run — catches mixed batches)
page metadata (jcr:title / jcr:description): skip — page JCR props, no definition entry
```

Self-correct loop on exit 1: re-read the definition fields, fix the op, re-run. If exit 1 again → stop and report errors to user.

---

## 2. Add-Field Workflow

> `forms-content-generate` needs CONTENT_MODEL and DEFINITION to run check-name-collision and validate-add — fetch both from AEM first, then pass them in.

```
[MCP]    get-aem-page-content(pageId) + get-aem-page-content-definition(pageId) in parallel → CONTENT_MODEL + eTag, DEFINITION
[SCRIPT] If DEFINITION was saved to file: filter-definition(definitionFile, componentType) → SLIM_DEFINITION; else use DEFINITION as-is
[LLM]    Invoke forms-content-generate with user intent + CONTENT_MODEL + SLIM_DEFINITION → validated component object
[SCRIPT] find-field(CONTENT_MODEL, targetPanel) → { capiKey, pointer, isPanel }
         If not found → add panel first (repeat from MCP step), then re-run find-field
[SCRIPT] resolve-insert-position(CONTENT_MODEL, panelCapiKey) → { pointer, nextIndex, insertBefore }
[SCRIPT] validate-patch(CONTENT_MODEL, DEFINITION, ops) → exit 1: fix and retry
[MCP]    patch-aem-page-content(pageId, eTag, ops) — batch ALL ops in ONE call
         ⚠ MUST NOT split fields into separate patch calls. If adding 2+ fields,
           put all add ops in a single array: [{op:"add",...field1},{op:"add",...field2}]
[MCP]    get-aem-page-content(pageId) → confirm field present in response
[LLM]    Report: name, componentType, position
```

**Script calls:**
```bash
node $SKILL_DIR/scripts/find-field.bundle.js --content-model '<json>' --name '<panelName>'
node $SKILL_DIR/scripts/resolve-insert-position.bundle.js --content-model '<json>' --panel-capi-key '0:2'
node $SKILL_DIR/scripts/validate-patch.bundle.js --content-model '<json>' --definition '<json>' --ops '<ops json>'
```

---

## 3. Create-Form Workflow

> CONTENT_MODEL and DEFINITION are fetched from AEM after copy, then passed into `forms-content-generate` for each field.

```
[LLM]    Ask the user: "Please provide the path or pageId of an existing blank form page to use as the template for this new form."
           - If the user gives a path → get-aem-pages(publishPath: "<user path>") → use returned pageId as sourcePageId
           - If the user gives a pageId → use it directly as sourcePageId
           - If the path cannot be resolved to a pageId → stop and report that the template page could not be found
[MCP]    copy-aem-page(sourcePageId: "<resolved sourcePageId>", title: "<Title>", name: "<slug>")
[MCP]    get-aem-page-content(newPageId) + get-aem-page-content-definition(newPageId) in parallel → CONTENT_MODEL + eTag, DEFINITION
[SCRIPT] If DEFINITION was saved to file: filter-definition(definitionFile, all componentTypes being added) → SLIM_DEFINITION; else use DEFINITION as-is
[LLM]    Locate root form container (depth-0 item with fieldType "form")
[SCRIPT] resolve-insert-position(CONTENT_MODEL, rootContainerCapiKey) → insert pointer per field
[LLM]    Invoke forms-content-generate for each requested field, passing CONTENT_MODEL + SLIM_DEFINITION → validated component objects
[SCRIPT] validate-patch(CONTENT_MODEL, DEFINITION, allOps) → exit 1: fix and retry
[MCP]    patch-aem-page-content(pageId, eTag, allOpsInOneCall) — batch ALL fields in ONE call
[MCP]    get-aem-page-content(newPageId) → confirm all fields present
[LLM]    If the initial create-form request explicitly included form-level metadata or container configuration, resolve it from that same intent and apply it now:
           - page title / description → patch /properties/jcr:title and /properties/jcr:description
           - submit action / prefill service / schemaRef / thank-you behavior → patch /items/0/properties/...
           - do not ask again when the user already provided these values in the initial create request
[MCP]    get-aem-page-content(newPageId) → refresh eTag if a follow-up metadata/config patch is needed
[MCP]    patch-aem-page-content(...) for the resolved metadata/config ops (skip validate-patch only where §7 documents no usable definition entry)
[MCP]    get-aem-page-content(newPageId) → confirm all requested fields and form-level settings are present
[LLM]    Report fields added with names, types, positions, and any form-level settings applied from the initial intent
```

**Script calls:**
```bash
node $SKILL_DIR/scripts/resolve-insert-position.bundle.js --content-model '<json>' --panel-capi-key '<rootCapiKey>'
node $SKILL_DIR/scripts/validate-patch.bundle.js --content-model '<json>' --definition '<json>' --ops '<ops json>'
```

---

## 4. Modify-Property Workflow

```
[MCP]    get-aem-page-content(pageId) + get-aem-page-content-definition(pageId) in parallel → CONTENT_MODEL + eTag, DEFINITION
[SCRIPT] If DEFINITION was saved to file: filter-definition(definitionFile, fieldComponentType) → SLIM_DEFINITION; else use DEFINITION as-is
[SCRIPT] find-field(CONTENT_MODEL, fieldName) → { capiKey, pointer }
[LLM]    Build replace op: { op: "replace", path: "<pointer>/properties/<prop>", value: ... }
         NOTE: if prop is "name" → follow §10 rule migration workflow before proceeding
         NOTE: required type — definition is source of truth: always send boolean, not string
[SCRIPT] validate-patch(CONTENT_MODEL, DEFINITION, ops) → exit 1: self-correct
[MCP]    patch-aem-page-content(pageId, eTag, ops)
[MCP]    get-aem-page-content(pageId) → confirm property has new value
```

**Script calls:**
```bash
node $SKILL_DIR/scripts/find-field.bundle.js --content-model '<json>' --name '<fieldName>'
node $SKILL_DIR/scripts/validate-patch.bundle.js --content-model '<json>' --definition '<json>' --ops '<ops json>'
```

---

## 5. Delete-Field Workflow

```
[MCP]    get-aem-page-content(pageId) + get-aem-page-content-definition(pageId) in parallel → CONTENT_MODEL + eTag, DEFINITION
[SCRIPT] find-field(CONTENT_MODEL, fieldName) → { pointer, isPanel, qualifiedId }
[SCRIPT] find-rule-refs --content-model <CONTENT_MODEL> --qualified-id <qualifiedId>
         → { refs: [{ fieldName, capiKey, fdKey }], total }
[LLM]    If total > 0: WARN user — "<total> rule(s) on [fieldNames] reference this field and will have broken COMPONENT refs after delete. Proceed anyway?"
[LLM]    If isPanel: WARN user — removing panel removes ALL its children. Confirm before proceeding.
[SCRIPT] validate-patch(CONTENT_MODEL, DEFINITION, [{ op: "remove", path: pointer }])
[MCP]    patch-aem-page-content(pageId, eTag, [{ op: "remove", path: pointer }])
[MCP]    get-aem-page-content(pageId) → confirm field no longer present
```

Remove path targets the **item itself** — no `/properties` suffix.
Rule refs are NOT migrated on delete — the referenced field is gone. User must fix or remove orphaned rules manually.

---

## 6. Move / Reorder Workflow (2 round-trips required)

```
[MCP]    get-aem-page-content → CONTENT_MODEL + eTag1
[SCRIPT] find-field(CONTENT_MODEL, sourceField) → { capiKey, pointer, component, qualifiedId: oldQualifiedId }
         component is pre-stripped (no capi-key/capi-index, items map → ordered array) — use as add op value directly
[SCRIPT] find-field(CONTENT_MODEL, targetField) → targetPointer (insert before this index)
[MCP]    patch-aem-page-content(eTag1, [{ op: "remove", path: sourcePointer }])
[MCP]    get-aem-page-content → new CONTENT_MODEL + eTag2   ← REQUIRED: eTag changed
[SCRIPT] resolve-insert-position for target slot in new content model
[MCP]    patch-aem-page-content(eTag2, [{ op: "add", path: targetPointer, value: component }])
[MCP]    get-aem-page-content → POST-MOVE CONTENT_MODEL + eTag3
[SCRIPT] find-field(POST-MOVE, sourceField) → { qualifiedId: newQualifiedId }
```

There is no atomic move in JSON Patch. Two round-trips are mandatory.

**Rule migration after move** (only if parent panel changed → qualifiedId changed):

If `oldQualifiedId !== newQualifiedId`:
```
[SCRIPT] find-rule-refs --content-model <POST-MOVE> --qualified-id <oldQualifiedId>
         → { refs, total }
[SCRIPT] transform-content-model --content-model-file /tmp/post-move-model.json → /tmp/post-treeJson.json
[SCRIPT] rewrite-rule-refs --content-model-file /tmp/post-move-model.json --old-id <old> --new-id <new>
         → [{ fieldName, capiKey, pointer, fdKey, rewrittenAst }]
[LOOP]   For each rewritten AST: validate → generate-formula → merge → patch (see §10)
```

---

## 7. Read-Structure Workflow

```
[MCP]    get-aem-page-content(pageId) → CONTENT_MODEL
[SCRIPT] list-form-fields(CONTENT_MODEL) → flat list with name, capiKey, pointer, componentType, depth, isPanel
[LLM]    Format and report to user
```

```bash
node $SKILL_DIR/scripts/list-form-fields.bundle.js --content-model '<json>'
```

---

## 8. Form Metadata

### 8a. Page-Level (title + description only)
JCR page node properties — outside the content model, bypass validate-patch.

**eTag note:** Page-level properties and the content model share the same ETag. Do NOT call `get-aem-page-metadata` to get a separate eTag — use the eTag from the most recent `get-aem-page-content` call. `get-aem-page-metadata` is only useful to read current title/description.

```
[MCP]    get-aem-page-content(pageId) → CONTENT_MODEL + eTag
[MCP]    patch-aem-page-content(pageId, eTag, [
           { op: "replace", path: "/properties/jcr:title", value: "Contact Us" },
           { op: "replace", path: "/properties/jcr:description", value: "Reach our team" }
         ])
```

### 8b. Form Container Properties (submit action, prefill, schemaRef, etc.)
Live on the root container node (`fieldType: "form"`) inside the content model.

**Known limitation:** validate-patch exits 1 for guideContainer ops — false positive, the property is valid. Skip validate-patch for these ops and patch directly.

```
[MCP]    get-aem-page-content(pageId) → CONTENT_MODEL + eTag
[LLM]    Find root container: depth-0 item where properties.fieldType === "form" → capiKey e.g. "0"
[MCP]    patch-aem-page-content(pageId, eTag, [{ op: "replace", path: "/items/0/properties/actionType", value: "..." }])
```

| User request | Property | Type | Notes |
|---|---|---|---|
| Set submit action | `actionType` | string | See valid values below |
| Set prefill service | `prefillService` | string | Full service class or path |
| Bind schema / data model | `schemaRef` | string | JCR path to schema node |
| On submit: redirect | `thankYouOption` = `"page"` + `redirect` = `"<url>"` | string | Two properties together |
| On submit: show message | `thankYouOption` = `"message"` + `thankYouMessage` = `"<text>"` | string | Two properties together |

**`actionType` valid values** (use the exact string — do not invent):
- `"fd/af/components/guidesubmittype/restendpoint"` — POST to a REST endpoint
- `"fd/af/components/guidesubmittype/email"` — send form data by email
- `"fd/af/components/guidesubmittype/storeContent"` — store as JCR node
- `"fd/af/components/guidesubmittype/workflowSubmitAction"` — trigger AEM workflow

If the user says "submit to our REST API / endpoint", use the restendpoint value.
If you don't know which to use, ask the user rather than guessing.

---

## 9. eTag Conflict (412)

On 412 Precondition Failed:
1. Re-fetch `get-aem-page-content` → new eTag
2. Re-verify change is still applicable (field may have moved)
3. Re-run find-field / resolve-insert-position against fresh content model
4. Retry patch with new eTag
5. If 412 again → abort and report to user (concurrent edit conflict)

**Never retry blindly with old ops — positions may have shifted.**

---

## 10. Field Rename Warning

Renaming a field changes its `qualifiedId` (`$form.panel.oldName` → `$form.panel.newName`). Rules referencing the old qualifiedId break. The flow below migrates them automatically.

```
[SCRIPT] find-field(PRE-PATCH CONTENT_MODEL, oldName) → { qualifiedId: oldQualifiedId }
[SCRIPT] find-rule-refs --content-model <PRE-PATCH> --qualified-id <oldQualifiedId>
         → { refs: [{ fieldName, capiKey, fdKey }], total }
[LLM]    If total > 0: warn user — "<total> rule(s) on [fieldNames] will be migrated after rename"
         Wait for confirmation before proceeding
[MCP]    patch-aem-page-content: rename (replace /properties/name with newName)
[MCP]    get-aem-page-content → POST-PATCH CONTENT_MODEL
[SCRIPT] transform-content-model --content-model-file /tmp/post-model.json → /tmp/post-treeJson.json
[SCRIPT] find-field(POST-PATCH, newName) → { qualifiedId: newQualifiedId }
[SCRIPT] rewrite-rule-refs --content-model-file /tmp/post-model.json \
           --old-id <oldQualifiedId> --new-id <newQualifiedId>
         → [{ fieldName, capiKey, pointer, fdKey, rewrittenAst }]
[LOOP]   For each rewritten AST:
           write rewrittenAst to /tmp/rewritten-rule.json
           validate-rule /tmp/rewritten-rule.json --tree /tmp/post-treeJson.json --storage-path <fdKey>
           → must return { valid: true } — if errors: report to user, do NOT patch rule
           generate-formula /tmp/rewritten-rule.json --tree /tmp/post-treeJson.json --event <fdKey>
           → must return { formulaValid: true }
           [LLM] merge output:
             fd:rules: { "<fdKey>": [JSON.stringify(rewrittenAst)], "<fdKey without fd: prefix>": formula }
             fd:events: fdEvents from generate-formula output (empty for expression rules)
           find-field(POST-PATCH, fieldName) → { pointer }  (confirm pointer still valid)
           patch-aem-page-content: add merged rule JSON at <pointer>/items/0
```

**Script calls:**
```bash
node $SKILL_DIR/scripts/find-field.bundle.js --content-model '<json>' --name '<name>'
node $SKILL_DIR/scripts/find-rule-refs.bundle.js --content-model-file /tmp/pre-model.json --qualified-id '<id>'
node $SKILL_DIR/scripts/rewrite-rule-refs.bundle.js --content-model-file /tmp/post-model.json --old-id '<old>' --new-id '<new>'
node "${CLAUDE_PLUGIN_ROOT}/skills/forms-rule-creator/scripts/transform-content-model.jsh" --content-model-file /tmp/post-model.json
node "${CLAUDE_PLUGIN_ROOT}/skills/forms-rule-creator/scripts/validate-rule.jsh" /tmp/rewritten-rule.json --tree /tmp/post-treeJson.json --storage-path <fdKey>
node "${CLAUDE_PLUGIN_ROOT}/skills/forms-rule-creator/scripts/generate-formula.jsh" /tmp/rewritten-rule.json --tree /tmp/post-treeJson.json --event <fdKey>
```

> **If validate-rule fails after rewrite:** The COMPONENT.id swap was mechanical — unexpected errors mean something else is wrong. Report to user, skip patching that rule.

---

## 11. Apply Rule/Event Workflow

Receives `{ fd:rules, fd:events }` from `forms-rule-creator`. Save its output to `/tmp/merged-rule.json` before running the steps below.

**Step 0 — Save content model to file** (required — do this once; both `apply-rule-patch` and `transform-content-model` reuse it):

Use the `Write` tool to save the content model to `/tmp/content-model.json`. The value to write is `response.data` — the object that starts with `{"id":"jcr:content","componentType":...}`. Do NOT wrap it in `{"data": ...}` — write the inner object directly.

**Step 1 — Build patch ops using `apply-rule-patch.bundle.js`** — NEVER construct JSON Patch ops manually, NEVER use a `node -e` one-liner:

```bash
node $SKILL_DIR/scripts/apply-rule-patch.bundle.js \
  --merged-rule-file /tmp/merged-rule.json \
  --content-model-file /tmp/content-model.json \
  --field-pointer '<pointer-of-target-field>' > /tmp/rule-patch.json
```

The script inspects the content model directly to determine whether `fd:rules`/`fd:events` nodes already exist under the target field — no separate `find-field` call needed.

**Step 2 — Patch AEM and verify:**

```
[MCP]    patch-aem-page-content(pageId, eTag, <ops from /tmp/rule-patch.json>)
[MCP]    get-aem-page-content(pageId) → confirm fd:rules/fd:events children are present under <pointer>
```

Path A (neither node exists): generates `add` ops for child nodes.
Path B (nodes exist): generates `replace` ops on full `properties` object.
Mixed: each node follows its own path.

See [references/apply-rule-workflow.md](references/apply-rule-workflow.md) for further detail.

---

## 12. Script Reference

See [references/scripts.md](references/scripts.md) for bundle locations, purpose, and exit codes for all scripts used in this skill.
