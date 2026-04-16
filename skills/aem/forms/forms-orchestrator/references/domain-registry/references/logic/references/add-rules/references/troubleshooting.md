# Troubleshooting — Form Rules

## Save Failures

If `rule-save` returns an error:

```bash
# Run with DEBUG for stack trace
DEBUG=true "${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-save" <rule.json> --rule-store ... --form ...
```

| Error | Likely Cause | Fix |
|-------|--------------|-----|
| `Cannot read properties of undefined (reading 'nodeName')` | Wrong item structure | Check grammar for correct item order |
| `Field 'X' not found in form` | Component name doesn't exist in form.json | Verify field name with transform-form |
| Rule saves but rule.json stays empty (`[]`) | Rule store initialized as array | Initialize as `{}` (empty object), never `[]` |

### Validate Against Grammar
```bash
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-grammar" | jq '.SET_VARIABLE'
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/rule-grammar" | jq '.DISPATCH_EVENT'
```

### Compare With Working Rules
```bash
cat <form>.rule.json | jq '.[] | select(.componentName == "<working-field>") | .["fd:rules"]'
```

---

## Component Not Found

1. Run `rule-transform` and search for the field name in the output
2. Check for typos or different casing
3. Verify component exists in form.json structure

## Function Not Found

1. Check OOTB functions list (see [apis.md](apis.md))
2. Verify custom function file path matches `customFunctionsPath` in form.json
3. Run `parse-functions` to confirm function is parseable

## Validation Failed

1. Check nodeNames against grammar whitelist
2. Ensure CONDITION has `"nested": false`
3. Verify literal tokens have `"value": null`
4. Check COMPONENT has all required fields: `id`, `type`, `name`, `parent`
