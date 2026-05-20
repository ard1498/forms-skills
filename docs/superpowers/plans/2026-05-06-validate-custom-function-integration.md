# validate-custom-function Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bundle `scripts/src/validate-custom-function.js` as `scripts/validate-custom-function.bundle.js` and surface it in `README.md` and `SKILL.md`.

**Architecture:** The source file exports the validator library and already loads its definition JSON files from `scripts/definitions/` at bundle runtime via `fs.readFileSync` (path resolves correctly once bundled). This plan (1) adds missing npm devDependencies, (2) adds a `extractQualifiedNamesFromTree` helper + CLI entry point to the source, (3) registers the new entry in `build.mjs`, and (4) updates the docs. The definition JSON files (`scope-functions.json`, `types.json`) already exist at `scripts/definitions/` and are unchanged.

**Tech Stack:** Node.js, esbuild (already in devDeps), acorn, acorn-walk, comment-parser (new devDeps)

---

## File Map

| Action | Path |
|--------|------|
| Modify | `skills/forms-rule-creator/package.json` |
| Modify | `skills/forms-rule-creator/scripts/src/validate-custom-function.js` |
| Modify | `skills/forms-rule-creator/build.mjs` |
| Modify | `skills/forms-rule-creator/README.md` |
| Modify | `skills/forms-rule-creator/SKILL.md` |
| Already done | `skills/forms-rule-creator/scripts/definitions/scope-functions.json` |
| Already done | `skills/forms-rule-creator/scripts/definitions/types.json` |

---

## Task 1: Add npm devDependencies

**Files:**
- Modify: `skills/forms-rule-creator/package.json`

`validate-custom-function.js` imports `acorn`, `acorn-walk`, and `comment-parser`. None are currently in `package.json`, so `npm run build` will fail without them.

- [ ] **Step 1: Update package.json**

Replace the full content of `skills/forms-rule-creator/package.json` with:

```json
{
  "name": "forms-rule-creator-build",
  "version": "1.0.0",
  "private": true,
  "description": "Build script — bundles @aemforms/rule-editor-transformer CLIs for offline use",
  "scripts": {
    "build": "node build.mjs"
  },
  "devDependencies": {
    "@aemforms/rule-editor-transformer": "1.0.0",
    "acorn": "^8.14.0",
    "acorn-walk": "^8.3.4",
    "comment-parser": "^1.4.1",
    "esbuild": "^0.21.0"
  }
}
```

- [ ] **Step 2: Install**

```bash
cd skills/forms-rule-creator
npm install
```

Expected: exits 0; `node_modules/acorn`, `node_modules/acorn-walk`, `node_modules/comment-parser` all present.

- [ ] **Step 3: Commit**

```bash
git add skills/forms-rule-creator/package.json skills/forms-rule-creator/package-lock.json
git commit -m "build(forms-rule-creator): add acorn, acorn-walk, comment-parser devDeps for custom function validator"
```

---

## Task 2: Add CLI entry point + tree-extraction helper to source

**Files:**
- Modify: `skills/forms-rule-creator/scripts/src/validate-custom-function.js`

The file currently exports only library functions (`validateCustomFunctionSource`, `validateCustomFunctionFile`) with no runnable CLI block. Two additions are needed:

- **`extractQualifiedNamesFromTree`** — builds the `qualifiedNames` map from a treeJson produced by `content-model-to-tree.bundle.js` so the CLI can accept `--tree /tmp/treeJson.json` instead of requiring a pre-built map.
- **CLI entry point** — the `try/catch` block that parses argv, runs the validator, and exits with 0/1/2.

The definition JSON files live at `scripts/definitions/` and are already loaded by the existing `loadJson("./definitions/...")` calls at the top of the file. The path resolves correctly once bundled (bundle `__dirname` = `scripts/`, so `./definitions/` = `scripts/definitions/`). No change to the imports is needed.

- [ ] **Step 1: Add `extractQualifiedNamesFromTree` helper**

Open `scripts/src/validate-custom-function.js`. After the `diag` function (approximately line 88, just before `parseJs`), insert:

```js
function extractQualifiedNamesFromTree(treeJson) {
  const result = {};
  function walk(node) {
    if (node.id && node.fieldType) {
      result[node.id] = { type: node.fieldType, customProperties: [] };
    }
    if (node.items) node.items.forEach(walk);
  }
  if (treeJson) walk(treeJson);
  return result;
}
```

- [ ] **Step 2: Append CLI entry point at end of file**

Append the following after the last exported function (`validateCustomFunctionFile`, currently the last block in the file):

```js
// CLI entry — guarded so the block does not fire when this module is required()
// by other code (e.g. tests). In esbuild CJS output require.main === module is
// true only when the script is the entry point.
if (typeof require !== "undefined" && require.main === module) {
  try {
    const cliArgs = process.argv.slice(2);
    const sourcePath = cliArgs.find((a) => !a.startsWith("--"));
    if (!sourcePath) {
      process.stdout.write(
        JSON.stringify({
          valid: false,
          errors: [{
            code: "CLI_ERROR",
            message:
              "Usage: validate-custom-function.bundle.js <functions.js>"
              + " [--qualified-names <qn.json>]"
              + " [--tree <treeJson.json>]",
          }],
          warnings: [],
        }) + "\n",
      );
      process.exit(2);
    }

    let qualifiedNames = {};
    const qnIdx = cliArgs.indexOf("--qualified-names");
    if (qnIdx !== -1) {
      qualifiedNames = JSON.parse(
        fs.readFileSync(cliArgs[qnIdx + 1], "utf8"),
      );
    } else {
      const treeIdx = cliArgs.indexOf("--tree");
      if (treeIdx !== -1) {
        const treeJson = JSON.parse(
          fs.readFileSync(cliArgs[treeIdx + 1], "utf8"),
        );
        qualifiedNames = extractQualifiedNamesFromTree(treeJson);
      }
    }

    const source = fs.readFileSync(sourcePath, "utf8");
    const result = validateCustomFunctionSource(source, { qualifiedNames });
    const withFile = (d) => ({ ...d, file: sourcePath });
    result.errors = result.errors.map(withFile);
    result.warnings = result.warnings.map(withFile);

    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(result.valid ? 0 : 1);
  } catch (e) {
    process.stdout.write(
      JSON.stringify({
        valid: false,
        errors: [{ code: "CLI_ERROR", message: e.message }],
        warnings: [],
      }) + "\n",
    );
    process.exit(1);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add skills/forms-rule-creator/scripts/src/validate-custom-function.js
git commit -m "feat(forms-rule-creator): add extractQualifiedNamesFromTree and CLI entry point to validate-custom-function"
```

---

## Task 3: Add bundle entry to `build.mjs`

**Files:**
- Modify: `skills/forms-rule-creator/build.mjs`

- [ ] **Step 1: Add the entry to the `entries` array**

In `build.mjs`, find the `entries` array. Locate the `validate-merge` line in the `// ── forms-rule-creator ────` section and add the new entry immediately after it:

```js
  { in: join(__dirname, 'scripts/src/validate-merge.js'),           out: join(scriptsDir, 'validate-merge.bundle.js') },
  { in: join(__dirname, 'scripts/src/validate-custom-function.js'), out: join(scriptsDir, 'validate-custom-function.bundle.js') },
```

- [ ] **Step 2: Update the completion log message**

Find:

```js
console.log('\nDone — 9 bundles written (5 forms-rule-creator, 4 forms-content-update)');
```

Change to:

```js
console.log('\nDone — 10 bundles written (6 forms-rule-creator, 4 forms-content-update)');
```

- [ ] **Step 3: Commit**

```bash
git add skills/forms-rule-creator/build.mjs
git commit -m "build(forms-rule-creator): register validate-custom-function.bundle.js in build entries"
```

---

## Task 4: Build and smoke-test

**Files:** none (verification only)

- [ ] **Step 1: Run the build**

```bash
cd skills/forms-rule-creator
npm run build
```

Expected output includes a line for the new bundle:
```
  skills/forms-rule-creator/scripts/validate-custom-function.bundle.js  ...kb
```
And ends with:
```
Done — 10 bundles written (6 forms-rule-creator, 4 forms-content-update)
```

- [ ] **Step 2: Verify the bundle exists**

```bash
ls -lh scripts/validate-custom-function.bundle.js
```

Expected: file is present and non-empty.

- [ ] **Step 3: Smoke test — no args (bad-args exit 2)**

```bash
node scripts/validate-custom-function.bundle.js; echo "exit: $?"
```

Expected:
```json
{"valid":false,"errors":[{"code":"CLI_ERROR","message":"Usage: ..."}],"warnings":[]}
exit: 2
```

- [ ] **Step 4: Smoke test — valid function (exit 0)**

```bash
cat > /tmp/test-cf-valid.js << 'EOF'
/**
 * @name greet
 * @param {string} name
 * @param {scope} globals
 */
function greet(name, globals) {
  return "Hello " + name;
}
export { greet };
EOF
node scripts/validate-custom-function.bundle.js /tmp/test-cf-valid.js; echo "exit: $?"
```

Expected: `{"valid":true,"errors":[],"warnings":[],"metadata":{...}}`, exit `0`.

- [ ] **Step 5: Smoke test — syntax error (exit 1)**

```bash
cat > /tmp/test-cf-bad.js << 'EOF'
function broken( {
export { broken };
EOF
node scripts/validate-custom-function.bundle.js /tmp/test-cf-bad.js; echo "exit: $?"
```

Expected: `valid: false`, at least one error with code `SYNTAX_ERROR`, exit `1`.

- [ ] **Step 6: Smoke test — unknown scope function (exit 1)**

```bash
cat > /tmp/test-cf-fn.js << 'EOF'
/**
 * @name doThing
 * @param {scope} globals
 */
function doThing(globals) {
  globals.functions.nonExistentFn();
}
export { doThing };
EOF
node scripts/validate-custom-function.bundle.js /tmp/test-cf-fn.js; echo "exit: $?"
```

Expected: `valid: false`, error with code `FUNCTION_UNKNOWN`, exit `1`.

- [ ] **Step 7: Commit the built bundle**

```bash
git add skills/forms-rule-creator/scripts/validate-custom-function.bundle.js
git commit -m "build(forms-rule-creator): add pre-built validate-custom-function.bundle.js"
```

---

## Task 5: Update README.md

**Files:**
- Modify: `skills/forms-rule-creator/README.md`

- [ ] **Step 1: Add row to the Scripts table**

Find the scripts table (after `## Scripts`). Insert a new row after `validate-merge.bundle.js`:

```markdown
| `validate-custom-function.bundle.js` | Validate a custom function JS file | 0=valid, 1=invalid, 2=bad args |
```

Full updated table:

```markdown
| Bundle | Purpose | Exit codes |
|---|---|---|
| `content-model-to-tree.bundle.js` | Content model → treeJson (input for rule engine) | 0=success, 1=error, 2=bad args |
| `validate-rule.bundle.js` | Validate rule AST / expression syntax | 0=valid, 1=invalid, 2=bad args |
| `generate-formula.bundle.js` | Compile rule AST → JSON Formula expression | 0=success, 1=error, 2=bad args |
| `parse-functions.bundle.js` | Parse custom function definitions | 0=success, 1=error, 2=bad args |
| `validate-merge.bundle.js` | Validate merged rule patch before applying | 0=valid, 1=invalid, 2=bad args |
| `validate-custom-function.bundle.js` | Validate a custom function JS file | 0=valid, 1=invalid, 2=bad args |
```

- [ ] **Step 2: Update the Files tree**

Find the `## Files` section. Add the new bundle and the `definitions/` directory to the tree:

```
scripts/
  content-model-to-tree.bundle.js           Content model → treeJson
  validate-rule.bundle.js                   Rule AST validator
  generate-formula.bundle.js                Rule AST → JSON Formula compiler
  parse-functions.bundle.js                 Custom function parser
  validate-merge.bundle.js                  Merged rule patch validator
  validate-custom-function.bundle.js        Custom function JS validator
  definitions/
    scope-functions.json                    globals.functions.* API signatures (loaded at runtime)
    types.json                              Field types and runtime properties (loaded at runtime)
  vendor/
    custom-function-parser.js               Required by parse-functions.bundle.js
```

- [ ] **Step 3: Update the Note below the table**

The current note reads:
```
> **Note:** `parse-functions.bundle.js` requires `scripts/vendor/custom-function-parser.js` to be present at runtime. All other bundles are self-contained.
```

Change to:
```
> **Note:** `parse-functions.bundle.js` requires `scripts/vendor/custom-function-parser.js` at runtime. `validate-custom-function.bundle.js` requires `scripts/definitions/` at runtime. All other bundles are self-contained.
```

- [ ] **Step 4: Commit**

```bash
git add skills/forms-rule-creator/README.md
git commit -m "docs(forms-rule-creator): document validate-custom-function.bundle.js in README"
```

---

## Task 6: Update SKILL.md

**Files:**
- Modify: `skills/forms-rule-creator/SKILL.md`

Add a **Step 7a** between the existing Step 7 (write custom function) and Step 8 (generate rule AST). The validator is only run when a custom function was written or modified.

- [ ] **Step 1: Insert Step 7a**

Find this heading in `SKILL.md`:

```markdown
### Step 8: Generate rule AST JSON
```

Immediately before it, insert:

```markdown
### Step 7a: Validate custom function (skip if Step 7 was skipped)

Run after any write to `blocks/form/functions.js`. This catches invalid `globals.functions.*` calls, wrong property access, and missing `@param {scope}` annotations before the function is referenced in a rule AST.

```bash
node $SKILL_DIR/skills/forms-rule-creator/scripts/validate-custom-function.bundle.js \
  $FORMS_EDS_ROOT/blocks/form/functions.js \
  --tree /tmp/treeJson.json
# Output: { valid: true, errors: [], warnings: [], metadata: { scopeFunctions, types } }
# Exit code 0 = valid, 1 = invalid, 2 = bad args
```

- `--tree /tmp/treeJson.json` — extracts qualifiedNames from the treeJson produced in Step 4. Enables validation of `globals.form.*` and `globals.$fragment.*` access paths. Omit if the function contains no form field access.
- `--qualified-names /tmp/qn.json` — alternative: pass a pre-built map where keys are `$`-prefixed paths (`"$form"`, `"$form.panel.field"`) and values are `{ "type": "<fieldType>", "customProperties": [] }`.

Fix any errors using the `code` field:

| Code | Problem | Fix |
|---|---|---|
| `SYNTAX_ERROR` | JS parse failure | Fix syntax in the function body |
| `EXPORT_NO_FUNCTION` | Name in `export { }` has no matching `function` declaration | Add `function <name>() {}` or correct the export |
| `SCOPE_PARAM_MISSING` | No `@param {scope}` JSDoc tag on an exported function | Add `@param {scope} globals` as the last JSDoc param |
| `SCOPE_PARAM_LAST` | `@param {scope}` parameter is not the last in the function signature | Move scope argument to the end: `function f(...args, globals)` |
| `QUALIFIED_NAME_INVALID_ROOT` | Access path after scope uses a root other than `form` or `fragment` | Use `globals.form.*` or `globals.$fragment.*` |
| `QUALIFIED_NAME_UNKNOWN` | Field path not found in the form tree passed via `--tree` | Verify the field name; re-run Step 6 if needed |
| `QUALIFIED_NAME_MISSING_TYPE` | QN exists in the map but has no `type` field | Ensure the qualifiedNames map entry has `{ type: "<fieldType>" }` |
| `TYPE_UNKNOWN` | Field's `type` is not a known fieldType | Check `scripts/definitions/types.json#supportedFieldTypes` |
| `PROPERTY_INVALID` | `.$<prop>` is not valid for the field's type | Check `agent-kb/06` for properties valid on that type |
| `CUSTOM_PROPERTY_INVALID` | `.$properties.<key>` path not declared in `customProperties` | Add the key to the component's `customProperties` list in the qualifiedNames map |
| `FUNCTION_UNKNOWN` | `globals.functions.<name>` is not in `scope-functions.json` | Check `agent-kb/13`; see also `scripts/definitions/scope-functions.json` |
| `ARG_COUNT_INVALID` | Wrong number of arguments for a scope function | Check the function signature in `scripts/definitions/scope-functions.json` |
| `ARG_MISSING` | A required argument is absent | Supply the missing argument |
| `ARG_TYPE_INVALID` | Argument has wrong kind (e.g. string literal where qualifiedName expected) | Pass the correct argument kind |
| `ARG_ORDER_INVALID` | `setProperty`-style call has qualifiedName and object args swapped | Correct order: `globals.functions.setProperty(fieldRef, { ... })` |

Re-run until `valid: true` before proceeding to Step 8.
```

- [ ] **Step 2: Commit**

```bash
git add skills/forms-rule-creator/SKILL.md
git commit -m "docs(forms-rule-creator): add Step 7a custom function validation to workflow"
```

---

## Self-Review

**Spec coverage:**
- [x] devDeps added → Task 1
- [x] Definition JSON files → already done (existed before this plan)
- [x] `extractQualifiedNamesFromTree` helper → Task 2 Step 1
- [x] CLI entry point → Task 2 Step 2
- [x] Bundle entry in `build.mjs` → Task 3
- [x] Build + smoke-tested → Task 4
- [x] README table row, file tree, note → Task 5
- [x] SKILL.md Step 7a with full error table → Task 6

**Placeholder scan:** No TBD, TODO, or "implement later" present. All code blocks are complete and runnable.

**Type consistency:**
- `extractQualifiedNamesFromTree` returns `{ [id: string]: { type: string, customProperties: [] } }` — matches the `options.qualifiedNames` shape required by `validateCustomFunctionSource`.
- `validateCustomFunctionSource` is called synchronously in the CLI (not `validateCustomFunctionFile` which is async) to keep the CLI entry simple.
- The `fs` import already present in the source file is reused in the CLI block.
