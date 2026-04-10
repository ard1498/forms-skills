# Vendor Files Version Tracking

Track which versions of `exp-editor` and `af-exp-editor` the rule_coder tool is synced with.

---

## Current Sync Point

| Repository     | Branch | Commit     | Date       |
|----------------|--------|------------|------------|
| exp-editor     | master | `0e5ef7b`  | 2026-01-07 |
| af-exp-editor  | master | `c8229f6`  | 2026-01-07 |

**Full Commit Hashes:**
- exp-editor: `0e5ef7b2163797ea7ab40298ec1d4228da04d74c`
- af-exp-editor: `c8229f6b3cf32ac9a3b90fb80b3922cae6f27ee4`

---

## Vendored Files

### From exp-editor

Source: `rule-builder/src/main/`

| Category | Source Path | Vendor Path |
|----------|-------------|-------------|
| **Base** | `resources/libs/fd/expeditor/clientlibs/base/js/namespace.js` | `exp-editor/namespace.js` |
| | `resources/libs/fd/expeditor/clientlibs/base/js/jquery_oops.js` | `exp-editor/jquery_oops.js` |
| | `resources/libs/fd/expeditor/clientlibs/base/js/utils.js` | `exp-editor/utils.js` |
| **Model** | `javascript/rulebuilder/model/BaseModel.js` | `exp-editor/model/BaseModel.js` |
| | `javascript/rulebuilder/model/TerminalModel.js` | `exp-editor/model/TerminalModel.js` |
| | `javascript/rulebuilder/model/ListModel.js` | `exp-editor/model/ListModel.js` |
| | `javascript/rulebuilder/model/ChoiceModel.js` | `exp-editor/model/ChoiceModel.js` |
| | `javascript/rulebuilder/model/RootModel.js` | `exp-editor/model/RootModel.js` |
| | `javascript/rulebuilder/model/ScriptModel.js` | `exp-editor/model/ScriptModel.js` |
| | `javascript/rulebuilder/model/SequenceModel.js` | `exp-editor/model/SequenceModel.js` |
| | `javascript/rulebuilder/model/FunctionModel.js` | `exp-editor/model/FunctionModel.js` |
| | `javascript/rulebuilder/model/ConditionModel.js` | `exp-editor/model/ConditionModel.js` |
| **Core** | `javascript/rulebuilder/core/BaseTransformer.js` | `exp-editor/core/BaseTransformer.js` |
| | `javascript/rulebuilder/core/ToJsonFormulaTransformer.js` | `exp-editor/core/ToJsonFormulaTransformer.js` |
| | `javascript/rulebuilder/core/ToSummaryTransformer.js` | `exp-editor/core/ToSummaryTransformer.js` |
| | `javascript/rulebuilder/core/RBScope.js` | `exp-editor/core/RBScope.js` |

### From af-exp-editor

Source: `content/src/main/content/jcr_root/libs/fd/af-expeditor/clientlibs/`

| Category | Source Path | Vendor Path |
|----------|-------------|-------------|
| **Authoring** | `authoring/js/ExpressionEditorTree.js` | `af-exp-editor/authoring/ExpressionEditorTree.js` |
| | `authoring/js/ToSummaryTransformer.js` | `af-exp-editor/authoring/ToSummaryTransformer.js` |
| **Runtime** | `runtime/js/RuntimeUtil.js` | `af-exp-editor/runtime/RuntimeUtil.js` |
| | `runtime/js/AFJSONFormulaTransformer.js` | `af-exp-editor/runtime/AFJSONFormulaTransformer.js` |
| | `runtime/js/AFJSONFormulaMerger.js` | `af-exp-editor/runtime/AFJSONFormulaMerger.js` |
| | `runtime/js/FunctionsConfigV2.js` | `af-exp-editor/runtime/FunctionsConfigV2.js` |
| **Parser** | `custom-function-parser/js/custom-function-parser.js` | `af-exp-editor/custom-function-parser/custom-function-parser.js` |

**Total: 23 files** (16 from exp-editor, 7 from af-exp-editor)

---

## Check for Updates

```bash
# exp-editor changes since last sync
cd <path-to-exp-editor>
git log --oneline 0e5ef7b..HEAD -- rule-builder/src/main/

# af-exp-editor changes since last sync
cd <path-to-af-exp-editor>
git log --oneline c8229f6..HEAD -- content/src/main/content/jcr_root/libs/fd/af-expeditor/clientlibs/
```

To see which files changed:
```bash
# exp-editor
git diff --name-only 0e5ef7b..HEAD -- rule-builder/src/main/

# af-exp-editor
git diff --name-only c8229f6..HEAD -- content/src/main/content/jcr_root/libs/fd/af-expeditor/clientlibs/
```

---

## Update Workflow

1. Run the check commands above
2. Review changed files for impact
3. Copy updated files to vendor directory
4. Test CLI tools:
   ```bash
   cd tools/rule_coder/bridge
   node cli/summary.js <test-rule.json>
   node cli/generate-formula.js <test-rule.json>
   ```
5. Update this file with new commit hashes
6. Add entry to changelog below

---

## Changelog

| Date       | Action | Details |
|------------|--------|---------|
| 2025-01-13 | Initial | Vendored base + model files |
| 2025-01-15 | Added  | Core transformers (BaseTransformer, ToJsonFormulaTransformer, ToSummaryTransformer, RBScope) |
| 2025-01-15 | Updated | Switched to master branch commits |
