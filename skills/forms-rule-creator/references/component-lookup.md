# Component Lookup from treeJson

## What is treeJson?

`treeJson` is the scope tree produced by `transform-jcr` or `transform-content-model` (see tools-reference.md). It is a hierarchical structure with each node having:

```json
{
  "id": "$form.textfield1",
  "name": "textfield1",
  "displayName": "Full Name",
  "type": "AFCOMPONENT|FIELD|TEXT FIELD|STRING",
  "fieldType": "text-input",
  "path": "/content/forms/af/my-form/jcr:content/guideContainer/textfield1",
  "items": [...]
}
```

## Resolving a Component from treeJson

Use `aemf-find-field` — do not walk the tree manually.

```bash
# Single field
node $SKILL_DIR/scripts/find-field.jsh --tree /tmp/treeJson.json --name "Full Name"

# Multiple fields at once
node $SKILL_DIR/scripts/find-field.jsh --tree /tmp/treeJson.json --names "Full Name,Email Address"
```

`--name` / `--names` accepts display name, programmatic name, or qualified ID — `RBScope.findByName` resolves all three.

**Output (found):**
```json
{ "found": true, "qualifiedId": "$form.textfield1", "name": "textfield1", "displayName": "Full Name", "type": "AFCOMPONENT|FIELD|TEXT FIELD|STRING", "fieldType": "text-input", "isPanel": false }
```

**Output (not found):**
```json
{ "found": false, "name": "Full Name" }
```

Exit code: 0 = found, 1 = not found, 2 = bad args.

## Building a COMPONENT Node

Use `qualifiedId` from the find-field result as the component ID:

```json
{
  "nodeName": "COMPONENT",
  "value": {
    "id": "$form.textfield1"
  }
}
```

Only `id` is required. Do NOT include `type` or `name` — they are not used by the transformer.
