# Apply Rule/Event Workflow

Receives `{ fd:rules, fd:events }` from `forms-rule-creator` (saved to `/tmp/merged-rule.json`).

```
[INPUT]  forms-rule-creator returned: { "fd:rules": {...}, "fd:events": {...} }
         → /tmp/merged-rule.json already written by the orchestrator
[MCP]    get-aem-page-content(pageId) → CONTENT_MODEL + eTag  (reuse if just fetched)
[SCRIPT] Locate existing fd:rules/fd:events nodes:
```

```bash
node $SKILL_DIR/scripts/find-field.bundle.js \
  --content-model '<CONTENT_MODEL>' \
  --names "fd:rules,fd:events"
# → [{ name, found, pointer, propertyPointer }, ...]
# Save output to /tmp/ff-result.json
```

```
[SCRIPT] Build patch ops:
```

```bash
node $SKILL_DIR/scripts/apply-rule-patch.bundle.js \
  --merged-rule-file /tmp/merged-rule.json \
  --find-field-result-file /tmp/ff-result.json \
  --field-pointer '<field-pointer>'
# → JSON patch ops array — save to /tmp/rule-patch.json
```

```
[MCP]    patch-aem-page-content(pageId, eTag, <ops from /tmp/rule-patch.json>)
[MCP]    get-aem-page-content(pageId) → VERIFY: field at <pointer> has fd:rules/fd:events children
         with non-empty properties. If missing or empty → re-patch.
```

**Path A** (neither node exists): generates 1–2 `add` ops, one full child node each.
**Path B** (nodes exist): generates `replace` ops on the full `properties` object — overwrites all rules.
**Mixed** (one exists, one doesn't): each node follows its own path independently.
