# Skill Evals Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared, skill-local evals runner for AEM Forms skills, starting with `create-component`, that detects behavioral regressions when a skill's `SKILL.md` / references / scripts are edited.

**Architecture:** Shared Node.js runner at `skills/aem/forms/evals-runner/` with pluggable provider interface (Anthropic implementation for MVP). Per-skill `evals/` directory holds scenarios, baseline, and skill-specific config. Shared fixture pool at plugin root (`skills/aem/forms/evals-fixtures/`) supplies test workspaces. Hybrid scoring combines deterministic artifact validators with an LLM-judge rubric. Regressions are detected by diffing scores against a committed baseline; explicit `--approve` updates the baseline.

**Tech Stack:** Node.js 20+, `@anthropic-ai/sdk`, built-in `node:test`/`node:assert`, `child_process`, `fs.promises`. Zero test-framework deps. No build step.

**Reference spec:** `docs/superpowers/specs/2026-04-17-skill-evals-runner-design.md`.

---

## File structure

### Runner code
```
skills/aem/forms/evals-runner/
  package.json
  run.js                              # CLI entry, ~60 LOC
  lib/
    load-scenarios.js                 # scenario discovery + schema validation
    workspace.js                      # fixture resolution, temp dir seed/teardown
    validators.js                     # registry + 5 validator types
    agent-harness.js                  # system prompt + tool loop via provider
    judge.js                          # judge prompt + response parse + reprompt
    scorecard.js                      # combine validator + rubric → verdict
    baseline.js                       # diff current vs baseline, approve mode
    report.js                         # summary.md + stdout table
    providers/
      index.js                        # getProvider()
      anthropic.js                    # AgentProvider + JudgeProvider (Anthropic SDK)
      stub.js                         # scripted provider for tests only
  schemas/
    scenario.schema.json              # JSON Schema for scenario files
    config.schema.json                # JSON Schema for evals.config.json
  test/
    load-scenarios.test.js
    workspace.test.js
    validators.test.js
    agent-harness.test.js
    judge.test.js
    scorecard.test.js
    baseline.test.js
    fixtures/                         # test-only fixtures (scenarios, scorecards)
```

### Shared fixtures
```
skills/aem/forms/evals-fixtures/
  form-repo/
    .gitignore
    code/
      package.json
      package-lock.json
      scripts/
        create-custom-component.js    # stub scaffolder
      blocks/form/
        mappings.js
        form.js
    form.json
```

### Skill-level evals (create-component)
```
skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component/
  evals/
    .gitignore                        # ignore results/
    evals.config.json
    scenarios/
      01-happy-path-countdown.json
      02-extend-checkbox-group.json
      03-ambiguous-base-requests-clarification.json
    baseline/
      .gitkeep
```

**Path shorthand used below:** `<SKILL_PATH>` = `skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component`.

---

## Task 1: Scaffold runner package and test harness

**Files:**
- Create: `skills/aem/forms/evals-runner/package.json`
- Create: `skills/aem/forms/evals-runner/run.js`
- Create: `skills/aem/forms/evals-runner/test/smoke.test.js`
- Create: `skills/aem/forms/evals-runner/.gitignore`

- [ ] **Step 1: Write the smoke test first**

`skills/aem/forms/evals-runner/test/smoke.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('runner package loads', async () => {
  const pkg = await import('../package.json', { with: { type: 'json' } });
  assert.equal(pkg.default.name, '@adobe/forms-evals-runner');
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
cd skills/aem/forms/evals-runner && node --test test/
```
Expected: FAIL — `package.json` does not exist.

- [ ] **Step 3: Create package.json**

`skills/aem/forms/evals-runner/package.json`:
```json
{
  "name": "@adobe/forms-evals-runner",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Skill-local evals runner for AEM Forms skills.",
  "bin": {
    "forms-evals": "./run.js"
  },
  "scripts": {
    "test": "node --test test/"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 4: Create CLI stub**

`skills/aem/forms/evals-runner/run.js`:
```javascript
#!/usr/bin/env node
console.error('run.js not yet implemented');
process.exit(2);
```
Then make executable:
```bash
chmod +x skills/aem/forms/evals-runner/run.js
```

- [ ] **Step 5: Create .gitignore**

`skills/aem/forms/evals-runner/.gitignore`:
```
node_modules/
*.log
```

- [ ] **Step 6: Install deps and run test**

```bash
cd skills/aem/forms/evals-runner && npm install && node --test test/
```
Expected: 1 test passes.

- [ ] **Step 7: Commit**

```bash
git add skills/aem/forms/evals-runner/package.json \
        skills/aem/forms/evals-runner/package-lock.json \
        skills/aem/forms/evals-runner/run.js \
        skills/aem/forms/evals-runner/test/smoke.test.js \
        skills/aem/forms/evals-runner/.gitignore
git commit -m "feat(evals-runner): scaffold runner package with test harness"
```

---

## Task 2: Scenario JSON Schema and config schema

**Files:**
- Create: `skills/aem/forms/evals-runner/schemas/scenario.schema.json`
- Create: `skills/aem/forms/evals-runner/schemas/config.schema.json`
- Create: `skills/aem/forms/evals-runner/lib/schema-validate.js`
- Create: `skills/aem/forms/evals-runner/test/schema-validate.test.js`

- [ ] **Step 1: Write schema-validate tests first**

`skills/aem/forms/evals-runner/test/schema-validate.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../lib/schema-validate.js';

const schema = {
  type: 'object',
  required: ['id', 'description'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    count: { type: 'integer', minimum: 0 }
  }
};

test('valid object passes', () => {
  const r = validate(schema, { id: 'x', description: 'y', count: 1 });
  assert.deepEqual(r.errors, []);
});

test('missing required field fails', () => {
  const r = validate(schema, { id: 'x' });
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /description/);
});

test('wrong type fails', () => {
  const r = validate(schema, { id: 123, description: 'y' });
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /id.*string/);
});

test('unknown property fails when additionalProperties false', () => {
  const r = validate(schema, { id: 'x', description: 'y', extra: 1 });
  assert.match(r.errors[0], /extra/);
});

test('integer minimum enforced', () => {
  const r = validate(schema, { id: 'x', description: 'y', count: -1 });
  assert.match(r.errors[0], /minimum/);
});

test('nested array of strings validates element types', () => {
  const arrSchema = { type: 'array', items: { type: 'string' } };
  const r = validate(arrSchema, ['a', 1, 'b']);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /\[1\].*string/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd skills/aem/forms/evals-runner && node --test test/schema-validate.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement minimal schema validator**

`skills/aem/forms/evals-runner/lib/schema-validate.js`:
```javascript
export function validate(schema, value, pathPrefix = '') {
  const errors = [];
  walk(schema, value, pathPrefix, errors);
  return { valid: errors.length === 0, errors };
}

function walk(schema, value, path, errors) {
  if (schema.type === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      errors.push(`${path || '<root>'} must be an object`);
      return;
    }
    for (const req of schema.required || []) {
      if (!(req in value)) errors.push(`${path || '<root>'} missing required property "${req}"`);
    }
    for (const [k, v] of Object.entries(value)) {
      const propSchema = schema.properties?.[k];
      if (!propSchema) {
        if (schema.additionalProperties === false) {
          errors.push(`${path}${path ? '.' : ''}${k} is not allowed`);
        }
        continue;
      }
      walk(propSchema, v, `${path}${path ? '.' : ''}${k}`, errors);
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${path} must be an array`);
      return;
    }
    if (schema.items) {
      value.forEach((el, i) => walk(schema.items, el, `${path}[${i}]`, errors));
    }
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      errors.push(`${path} must have at least ${schema.minItems} items`);
    }
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${path} must be a string`);
      return;
    }
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      errors.push(`${path} must have minLength ${schema.minLength}`);
    }
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path} must be one of ${JSON.stringify(schema.enum)}`);
    }
  } else if (schema.type === 'integer') {
    if (!Number.isInteger(value)) {
      errors.push(`${path} must be an integer`);
      return;
    }
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      errors.push(`${path} fails minimum ${schema.minimum}`);
    }
  } else if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') errors.push(`${path} must be a boolean`);
  } else if (schema.oneOf) {
    const matches = schema.oneOf.filter(sub => validate(sub, value, path).valid);
    if (matches.length !== 1) errors.push(`${path} must match exactly one of oneOf (matched ${matches.length})`);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd skills/aem/forms/evals-runner && node --test test/schema-validate.test.js
```
Expected: 6 tests pass.

- [ ] **Step 5: Author scenario schema**

`skills/aem/forms/evals-runner/schemas/scenario.schema.json`:
```json
{
  "type": "object",
  "required": ["id", "description", "userMessage", "workspace", "agent", "validators", "rubric"],
  "additionalProperties": false,
  "properties": {
    "id": { "type": "string", "minLength": 1 },
    "description": { "type": "string", "minLength": 1 },
    "userMessage": { "type": "string", "minLength": 1 },
    "workspace": {
      "type": "object",
      "required": ["fixture"],
      "additionalProperties": false,
      "properties": {
        "fixture": { "type": "string", "minLength": 1 }
      }
    },
    "agent": {
      "type": "object",
      "required": ["maxTurns", "allowedTools"],
      "additionalProperties": false,
      "properties": {
        "maxTurns": { "type": "integer", "minimum": 1 },
        "allowedTools": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "mockedTools": { "type": "object" }
      }
    },
    "validators": {
      "type": "array",
      "minItems": 0,
      "items": {
        "type": "object",
        "required": ["type"],
        "properties": {
          "type": { "type": "string", "enum": ["file_exists", "file_contains", "file_not_contains", "json_path_equals", "command_passes"] },
          "required": { "type": "boolean" },
          "name": { "type": "string" }
        }
      }
    },
    "rubric": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "description"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "description": { "type": "string", "minLength": 1 },
          "required": { "type": "boolean" }
        }
      }
    }
  }
}
```

Note: validator-specific properties (e.g., `path`, `pattern`) aren't enforced at schema level — they're checked by each validator implementation. Keeps the schema permissive and the validators responsible for their own inputs.

- [ ] **Step 6: Author config schema**

`skills/aem/forms/evals-runner/schemas/config.schema.json`:
```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "agent": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "provider": { "type": "string", "enum": ["anthropic"] },
        "model": { "type": "string" },
        "maxTurns": { "type": "integer", "minimum": 1 }
      }
    },
    "judge": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "provider": { "type": "string", "enum": ["anthropic"] },
        "model": { "type": "string" }
      }
    },
    "retry": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "attempts": { "type": "integer", "minimum": 1 }
      }
    },
    "timeout_ms": { "type": "integer", "minimum": 1000 }
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add skills/aem/forms/evals-runner/schemas/ \
        skills/aem/forms/evals-runner/lib/schema-validate.js \
        skills/aem/forms/evals-runner/test/schema-validate.test.js
git commit -m "feat(evals-runner): add scenario and config schemas with validator"
```

---

## Task 3: Scenario loader

**Files:**
- Create: `skills/aem/forms/evals-runner/lib/load-scenarios.js`
- Create: `skills/aem/forms/evals-runner/test/load-scenarios.test.js`
- Create: `skills/aem/forms/evals-runner/test/fixtures/scenarios-sample/` (test fixtures)

- [ ] **Step 1: Create test fixtures**

`skills/aem/forms/evals-runner/test/fixtures/scenarios-sample/valid.json`:
```json
{
  "id": "valid-scenario",
  "description": "A valid scenario",
  "userMessage": "do a thing",
  "workspace": { "fixture": "form-repo" },
  "agent": { "maxTurns": 5, "allowedTools": ["bash"] },
  "validators": [],
  "rubric": [{ "id": "does-the-thing", "description": "Agent does the thing." }]
}
```

`skills/aem/forms/evals-runner/test/fixtures/scenarios-sample/invalid-missing-id.json`:
```json
{
  "description": "Missing id",
  "userMessage": "x",
  "workspace": { "fixture": "form-repo" },
  "agent": { "maxTurns": 5, "allowedTools": ["bash"] },
  "validators": [],
  "rubric": [{ "id": "a", "description": "b" }]
}
```

`skills/aem/forms/evals-runner/test/fixtures/scenarios-sample/invalid-syntax.json`:
```
{ not valid json
```

- [ ] **Step 2: Write loader tests**

`skills/aem/forms/evals-runner/test/load-scenarios.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenarios } from '../lib/load-scenarios.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleDir = path.join(__dirname, 'fixtures', 'scenarios-sample');

test('loads and validates scenarios from a directory', async () => {
  const results = await loadScenarios(sampleDir);
  const valid = results.find(r => r.file.endsWith('valid.json'));
  const missing = results.find(r => r.file.endsWith('invalid-missing-id.json'));
  const syntax = results.find(r => r.file.endsWith('invalid-syntax.json'));

  assert.equal(valid.ok, true);
  assert.equal(valid.scenario.id, 'valid-scenario');

  assert.equal(missing.ok, false);
  assert.match(missing.errors.join(','), /missing required property "id"/);

  assert.equal(syntax.ok, false);
  assert.match(syntax.errors.join(','), /JSON/i);
});

test('filters by id substring when provided', async () => {
  const results = await loadScenarios(sampleDir, { filter: 'valid' });
  assert.equal(results.length, 1);
  assert.ok(results[0].file.endsWith('valid.json'));
});

test('returns empty array for missing directory', async () => {
  const results = await loadScenarios(path.join(sampleDir, 'nonexistent'));
  assert.deepEqual(results, []);
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd skills/aem/forms/evals-runner && node --test test/load-scenarios.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement loader**

`skills/aem/forms/evals-runner/lib/load-scenarios.js`:
```javascript
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './schema-validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, '..', 'schemas', 'scenario.schema.json');

let cachedSchema = null;
async function getSchema() {
  if (!cachedSchema) {
    cachedSchema = JSON.parse(await readFile(SCHEMA_PATH, 'utf8'));
  }
  return cachedSchema;
}

export async function loadScenarios(scenariosDir, { filter } = {}) {
  let entries;
  try {
    entries = await readdir(scenariosDir);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }

  const schema = await getSchema();
  const files = entries.filter(f => f.endsWith('.json')).sort();
  const results = [];

  for (const file of files) {
    const full = path.join(scenariosDir, file);
    const result = { file: full, ok: false, scenario: null, errors: [] };
    let raw;
    try {
      raw = await readFile(full, 'utf8');
    } catch (err) {
      result.errors.push(`Cannot read: ${err.message}`);
      results.push(result);
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      result.errors.push(`Invalid JSON: ${err.message}`);
      results.push(result);
      continue;
    }
    const { valid, errors } = validate(schema, parsed);
    if (!valid) {
      result.errors = errors;
      results.push(result);
      continue;
    }
    result.ok = true;
    result.scenario = parsed;
    results.push(result);
  }

  if (filter) {
    return results.filter(r => (r.scenario?.id ?? '').includes(filter) || r.file.includes(filter));
  }
  return results;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd skills/aem/forms/evals-runner && node --test test/load-scenarios.test.js
```
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add skills/aem/forms/evals-runner/lib/load-scenarios.js \
        skills/aem/forms/evals-runner/test/load-scenarios.test.js \
        skills/aem/forms/evals-runner/test/fixtures/scenarios-sample/
git commit -m "feat(evals-runner): add scenario loader with schema validation"
```

---

## Task 4: Validators module

**Files:**
- Create: `skills/aem/forms/evals-runner/lib/validators.js`
- Create: `skills/aem/forms/evals-runner/test/validators.test.js`

- [ ] **Step 1: Write validator tests**

`skills/aem/forms/evals-runner/test/validators.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runValidators } from '../lib/validators.js';

async function makeTempWorkspace() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'evals-test-'));
  return dir;
}

test('file_exists passes when file exists', async () => {
  const ws = await makeTempWorkspace();
  await mkdir(path.join(ws, 'sub'), { recursive: true });
  await writeFile(path.join(ws, 'sub/a.txt'), 'hello');
  const res = await runValidators(ws, [{ type: 'file_exists', path: 'sub/a.txt' }]);
  assert.equal(res[0].passed, true);
  await rm(ws, { recursive: true, force: true });
});

test('file_exists fails when file missing', async () => {
  const ws = await makeTempWorkspace();
  const res = await runValidators(ws, [{ type: 'file_exists', path: 'missing.txt' }]);
  assert.equal(res[0].passed, false);
  assert.match(res[0].reason, /not found/);
  await rm(ws, { recursive: true, force: true });
});

test('file_contains matches regex', async () => {
  const ws = await makeTempWorkspace();
  await writeFile(path.join(ws, 'x.js'), 'const listenChanges = true;');
  const res = await runValidators(ws, [{ type: 'file_contains', path: 'x.js', pattern: 'listenChanges\\s*=\\s*true' }]);
  assert.equal(res[0].passed, true);
  await rm(ws, { recursive: true, force: true });
});

test('file_not_contains fails when pattern found', async () => {
  const ws = await makeTempWorkspace();
  await writeFile(path.join(ws, 'x.js'), 'TODO: implement');
  const res = await runValidators(ws, [{ type: 'file_not_contains', path: 'x.js', pattern: 'TODO' }]);
  assert.equal(res[0].passed, false);
  await rm(ws, { recursive: true, force: true });
});

test('json_path_equals finds value via recursive walk', async () => {
  const ws = await makeTempWorkspace();
  await writeFile(path.join(ws, 'f.json'), JSON.stringify({ nested: { 'fd:viewType': 'countdown-timer' } }));
  const res = await runValidators(ws, [{
    type: 'json_path_equals', path: 'f.json', property: 'fd:viewType', expected: 'countdown-timer'
  }]);
  assert.equal(res[0].passed, true);
  await rm(ws, { recursive: true, force: true });
});

test('command_passes exits 0', async () => {
  const ws = await makeTempWorkspace();
  const res = await runValidators(ws, [{ type: 'command_passes', command: 'true' }]);
  assert.equal(res[0].passed, true);
  await rm(ws, { recursive: true, force: true });
});

test('command_passes records nonzero exit', async () => {
  const ws = await makeTempWorkspace();
  const res = await runValidators(ws, [{ type: 'command_passes', command: 'false' }]);
  assert.equal(res[0].passed, false);
  await rm(ws, { recursive: true, force: true });
});

test('path escape attempt rejected', async () => {
  const ws = await makeTempWorkspace();
  const res = await runValidators(ws, [{ type: 'file_exists', path: '../escaped.txt' }]);
  assert.equal(res[0].passed, false);
  assert.match(res[0].reason, /outside workspace/);
  await rm(ws, { recursive: true, force: true });
});

test('required defaults to true; unknown validator type errors', async () => {
  const ws = await makeTempWorkspace();
  const res = await runValidators(ws, [{ type: 'nope' }]);
  assert.equal(res[0].passed, false);
  assert.equal(res[0].required, true);
  assert.match(res[0].reason, /unknown validator/);
  await rm(ws, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd skills/aem/forms/evals-runner && node --test test/validators.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement validators module**

Note on `json_path_equals`: the spec's example uses JSONPath syntax (`$..['fd:viewType']`), but supporting full JSONPath pulls in a dep. For MVP we substitute a simpler `property` field that recursively walks the JSON and matches any property with that name. The scenario schema's `type` enum stays `json_path_equals`; we accept either `jsonPath` (future) or `property` (MVP). The first scenario uses `property`.

`skills/aem/forms/evals-runner/lib/validators.js`:
```javascript
import { readFile, stat } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

function resolveInside(workspace, relPath) {
  const full = path.resolve(workspace, relPath);
  const wsResolved = path.resolve(workspace);
  if (!full.startsWith(wsResolved + path.sep) && full !== wsResolved) {
    return { error: `path "${relPath}" resolves outside workspace` };
  }
  return { full };
}

const TYPES = {
  async file_exists(workspace, cfg) {
    const { full, error } = resolveInside(workspace, cfg.path);
    if (error) return { passed: false, reason: error };
    try {
      await stat(full);
      return { passed: true, reason: `exists: ${cfg.path}` };
    } catch {
      return { passed: false, reason: `file not found: ${cfg.path}` };
    }
  },
  async file_contains(workspace, cfg) {
    const { full, error } = resolveInside(workspace, cfg.path);
    if (error) return { passed: false, reason: error };
    try {
      const content = await readFile(full, 'utf8');
      const re = new RegExp(cfg.pattern);
      return re.test(content)
        ? { passed: true, reason: `matched /${cfg.pattern}/ in ${cfg.path}` }
        : { passed: false, reason: `pattern /${cfg.pattern}/ not found in ${cfg.path}` };
    } catch (err) {
      return { passed: false, reason: `cannot read ${cfg.path}: ${err.message}` };
    }
  },
  async file_not_contains(workspace, cfg) {
    const r = await TYPES.file_contains(workspace, cfg);
    if (r.reason.startsWith('cannot read')) return r;
    return r.passed
      ? { passed: false, reason: `pattern /${cfg.pattern}/ found in ${cfg.path} (should be absent)` }
      : { passed: true, reason: `pattern /${cfg.pattern}/ absent in ${cfg.path}` };
  },
  async json_path_equals(workspace, cfg) {
    const { full, error } = resolveInside(workspace, cfg.path);
    if (error) return { passed: false, reason: error };
    let data;
    try {
      data = JSON.parse(await readFile(full, 'utf8'));
    } catch (err) {
      return { passed: false, reason: `cannot parse JSON ${cfg.path}: ${err.message}` };
    }
    const prop = cfg.property;
    const found = [];
    (function walk(node) {
      if (node === null || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      for (const [k, v] of Object.entries(node)) {
        if (k === prop) found.push(v);
        walk(v);
      }
    })(data);
    if (found.length === 0) return { passed: false, reason: `property "${prop}" not found in ${cfg.path}` };
    if (found.some(v => v === cfg.expected)) {
      return { passed: true, reason: `property "${prop}" = ${JSON.stringify(cfg.expected)} in ${cfg.path}` };
    }
    return { passed: false, reason: `property "${prop}" found but no occurrence equals ${JSON.stringify(cfg.expected)} (saw ${JSON.stringify(found)})` };
  },
  async command_passes(workspace, cfg) {
    const cwd = cfg.cwd ? path.resolve(workspace, cfg.cwd) : workspace;
    try {
      execSync(cfg.command, { cwd, stdio: 'pipe', timeout: 60_000 });
      return { passed: true, reason: `command exited 0: ${cfg.command}` };
    } catch (err) {
      return { passed: false, reason: `command failed (${err.status}): ${cfg.command}` };
    }
  }
};

export async function runValidators(workspace, validators) {
  const results = [];
  for (const v of validators) {
    const required = v.required !== false;
    const impl = TYPES[v.type];
    if (!impl) {
      results.push({ type: v.type, name: v.name, required, passed: false, reason: `unknown validator type "${v.type}"`, config: v });
      continue;
    }
    const out = await impl(workspace, v);
    results.push({ type: v.type, name: v.name, required, passed: out.passed, reason: out.reason, config: v });
  }
  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd skills/aem/forms/evals-runner && node --test test/validators.test.js
```
Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add skills/aem/forms/evals-runner/lib/validators.js \
        skills/aem/forms/evals-runner/test/validators.test.js
git commit -m "feat(evals-runner): add validators module with 5 validator types"
```

---

## Task 5: Workspace module

**Files:**
- Create: `skills/aem/forms/evals-runner/lib/workspace.js`
- Create: `skills/aem/forms/evals-runner/test/workspace.test.js`
- Create: `skills/aem/forms/evals-runner/test/fixtures/plugin-root/` (test fixtures)

- [ ] **Step 1: Create test fixtures**

```bash
mkdir -p skills/aem/forms/evals-runner/test/fixtures/plugin-root/.claude-plugin
mkdir -p skills/aem/forms/evals-runner/test/fixtures/plugin-root/evals-fixtures/shared-fix
mkdir -p skills/aem/forms/evals-runner/test/fixtures/plugin-root/skill-a/evals/fixtures/local-only
mkdir -p skills/aem/forms/evals-runner/test/fixtures/plugin-root/skill-b/evals
```

`skills/aem/forms/evals-runner/test/fixtures/plugin-root/.claude-plugin/plugin.json`:
```json
{ "name": "test-plugin" }
```

`skills/aem/forms/evals-runner/test/fixtures/plugin-root/evals-fixtures/shared-fix/hello.txt`:
```
shared
```

`skills/aem/forms/evals-runner/test/fixtures/plugin-root/skill-a/evals/fixtures/local-only/hello.txt`:
```
local
```

- [ ] **Step 2: Write workspace tests**

`skills/aem/forms/evals-runner/test/workspace.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPluginRoot, resolveFixture, seedWorkspace, teardownWorkspace } from '../lib/workspace.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.join(__dirname, 'fixtures', 'plugin-root');
const skillA = path.join(pluginRoot, 'skill-a');
const skillB = path.join(pluginRoot, 'skill-b');

test('findPluginRoot walks up to .claude-plugin/plugin.json', async () => {
  const found = await findPluginRoot(path.join(skillA, 'evals'));
  assert.equal(found, pluginRoot);
});

test('findPluginRoot returns null when no plugin.json above', async () => {
  const found = await findPluginRoot('/tmp');
  assert.equal(found, null);
});

test('resolveFixture prefers per-skill override', async () => {
  const resolved = await resolveFixture({ skillDir: skillA, fixtureName: 'local-only' });
  assert.equal(resolved, path.join(skillA, 'evals/fixtures/local-only'));
});

test('resolveFixture falls back to shared pool', async () => {
  const resolved = await resolveFixture({ skillDir: skillB, fixtureName: 'shared-fix' });
  assert.equal(resolved, path.join(pluginRoot, 'evals-fixtures/shared-fix'));
});

test('resolveFixture throws when fixture not found anywhere', async () => {
  await assert.rejects(
    () => resolveFixture({ skillDir: skillB, fixtureName: 'missing' }),
    /fixture "missing" not found/
  );
});

test('seedWorkspace copies fixture into temp dir', async () => {
  const fixture = path.join(pluginRoot, 'evals-fixtures/shared-fix');
  const ws = await seedWorkspace({ fixturePath: fixture, scenarioId: 's1', attempt: 1 });
  const s = await stat(ws);
  assert.ok(s.isDirectory());
  const content = await readFile(path.join(ws, 'hello.txt'), 'utf8');
  assert.equal(content.trim(), 'shared');
  await teardownWorkspace(ws);
  await assert.rejects(() => stat(ws));
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd skills/aem/forms/evals-runner && node --test test/workspace.test.js
```
Expected: FAIL.

- [ ] **Step 4: Implement workspace module**

`skills/aem/forms/evals-runner/lib/workspace.js`:
```javascript
import { mkdtemp, rm, cp, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const activeWorkspaces = new Set();

for (const signal of ['exit', 'SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const ws of activeWorkspaces) {
      try {
        require('node:fs').rmSync(ws, { recursive: true, force: true });
      } catch {}
    }
    if (signal !== 'exit') process.exit(1);
  });
}

export async function findPluginRoot(startDir) {
  let dir = path.resolve(startDir);
  while (true) {
    try {
      await stat(path.join(dir, '.claude-plugin', 'plugin.json'));
      return dir;
    } catch {}
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export async function resolveFixture({ skillDir, fixtureName }) {
  const local = path.join(skillDir, 'evals', 'fixtures', fixtureName);
  try { await stat(local); return local; } catch {}

  const pluginRoot = await findPluginRoot(skillDir);
  if (!pluginRoot) {
    throw new Error(`fixture "${fixtureName}" not found: plugin root not discoverable from ${skillDir}`);
  }
  const shared = path.join(pluginRoot, 'evals-fixtures', fixtureName);
  try { await stat(shared); return shared; } catch {}

  throw new Error(`fixture "${fixtureName}" not found. Checked:\n  ${local}\n  ${shared}`);
}

export async function seedWorkspace({ fixturePath, scenarioId, attempt }) {
  const rand = crypto.randomBytes(4).toString('hex');
  const ws = await mkdtemp(path.join(os.tmpdir(), `skill-evals-${scenarioId}-${attempt}-${rand}-`));
  await cp(fixturePath, ws, { recursive: true, preserveTimestamps: true });
  activeWorkspaces.add(ws);
  return ws;
}

export async function teardownWorkspace(ws) {
  activeWorkspaces.delete(ws);
  await rm(ws, { recursive: true, force: true });
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd skills/aem/forms/evals-runner && node --test test/workspace.test.js
```
Expected: 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add skills/aem/forms/evals-runner/lib/workspace.js \
        skills/aem/forms/evals-runner/test/workspace.test.js \
        skills/aem/forms/evals-runner/test/fixtures/plugin-root/
git commit -m "feat(evals-runner): add workspace module with fixture resolution"
```

---

## Task 6: Scorecard module

**Files:**
- Create: `skills/aem/forms/evals-runner/lib/scorecard.js`
- Create: `skills/aem/forms/evals-runner/test/scorecard.test.js`

- [ ] **Step 1: Write scorecard tests**

`skills/aem/forms/evals-runner/test/scorecard.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildScorecard } from '../lib/scorecard.js';

test('verdict is pass when all required pass', () => {
  const card = buildScorecard({
    scenarioId: 's1',
    attempts: 1,
    duration_ms: 1000,
    validators: [{ type: 'file_exists', required: true, passed: true, reason: 'ok' }],
    rubric: [{ id: 'r1', required: true, passed: true, reason: 'ok' }]
  });
  assert.equal(card.verdict, 'pass');
  assert.deepEqual(card.requiredFailures, []);
});

test('verdict is fail when a required validator fails', () => {
  const card = buildScorecard({
    scenarioId: 's1',
    attempts: 2,
    duration_ms: 1000,
    validators: [{ type: 'file_exists', required: true, passed: false, reason: 'missing', config: { path: 'x' } }],
    rubric: [{ id: 'r1', required: true, passed: true, reason: 'ok' }]
  });
  assert.equal(card.verdict, 'fail');
  assert.equal(card.requiredFailures.length, 1);
  assert.match(card.requiredFailures[0], /file_exists/);
});

test('verdict is fail when a required rubric fails', () => {
  const card = buildScorecard({
    scenarioId: 's1',
    attempts: 1,
    duration_ms: 1000,
    validators: [],
    rubric: [{ id: 'r1', required: true, passed: false, reason: 'nope' }]
  });
  assert.equal(card.verdict, 'fail');
  assert.match(card.requiredFailures[0], /r1/);
});

test('non-required failures do not flip verdict', () => {
  const card = buildScorecard({
    scenarioId: 's1',
    attempts: 1,
    duration_ms: 1000,
    validators: [{ type: 'file_exists', required: false, passed: false, reason: 'missing', config: { path: 'x' } }],
    rubric: [{ id: 'r1', required: false, passed: false, reason: 'nope' }]
  });
  assert.equal(card.verdict, 'pass');
  assert.deepEqual(card.requiredFailures, []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd skills/aem/forms/evals-runner && node --test test/scorecard.test.js
```
Expected: FAIL.

- [ ] **Step 3: Implement scorecard**

`skills/aem/forms/evals-runner/lib/scorecard.js`:
```javascript
export function buildScorecard({ scenarioId, attempts, duration_ms, validators, rubric }) {
  const requiredFailures = [];
  for (const v of validators) {
    if (v.required && !v.passed) {
      const label = v.name || `${v.type}(${describeConfig(v.config)})`;
      requiredFailures.push(`validator:${label} — ${v.reason}`);
    }
  }
  for (const r of rubric) {
    if (r.required && !r.passed) {
      requiredFailures.push(`rubric:${r.id} — ${r.reason}`);
    }
  }
  return {
    scenarioId,
    attempts,
    verdict: requiredFailures.length === 0 ? 'pass' : 'fail',
    duration_ms,
    validators,
    rubric,
    requiredFailures
  };
}

function describeConfig(cfg) {
  if (!cfg) return '';
  if (cfg.path) return cfg.path;
  if (cfg.command) return cfg.command;
  return '';
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd skills/aem/forms/evals-runner && node --test test/scorecard.test.js
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add skills/aem/forms/evals-runner/lib/scorecard.js \
        skills/aem/forms/evals-runner/test/scorecard.test.js
git commit -m "feat(evals-runner): add scorecard module"
```

---

## Task 7: Baseline module

**Files:**
- Create: `skills/aem/forms/evals-runner/lib/baseline.js`
- Create: `skills/aem/forms/evals-runner/test/baseline.test.js`

- [ ] **Step 1: Write baseline tests**

`skills/aem/forms/evals-runner/test/baseline.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { diffBaseline, approve } from '../lib/baseline.js';

async function setup() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'baseline-test-'));
  await mkdir(path.join(dir, 'baseline'));
  await mkdir(path.join(dir, 'results'));
  return dir;
}

test('no regression when current matches baseline', async () => {
  const dir = await setup();
  const card = { scenarioId: 's1', verdict: 'pass', validators: [], rubric: [], requiredFailures: [] };
  await writeFile(path.join(dir, 'baseline', 's1.json'), JSON.stringify(card));
  await mkdir(path.join(dir, 'results', 's1'));
  await writeFile(path.join(dir, 'results', 's1', 'score.json'), JSON.stringify(card));

  const diff = await diffBaseline({ baselineDir: path.join(dir, 'baseline'), resultsDir: path.join(dir, 'results') });
  assert.deepEqual(diff.regressions, []);
  assert.deepEqual(diff.newScenarios, []);
  await rm(dir, { recursive: true, force: true });
});

test('regression when pass flips to fail', async () => {
  const dir = await setup();
  const baseCard = { scenarioId: 's1', verdict: 'pass', validators: [], rubric: [], requiredFailures: [] };
  const curCard = { scenarioId: 's1', verdict: 'fail', validators: [], rubric: [], requiredFailures: ['validator:file_exists(x) — missing'] };
  await writeFile(path.join(dir, 'baseline', 's1.json'), JSON.stringify(baseCard));
  await mkdir(path.join(dir, 'results', 's1'));
  await writeFile(path.join(dir, 'results', 's1', 'score.json'), JSON.stringify(curCard));

  const diff = await diffBaseline({ baselineDir: path.join(dir, 'baseline'), resultsDir: path.join(dir, 'results') });
  assert.equal(diff.regressions.length, 1);
  assert.equal(diff.regressions[0].scenarioId, 's1');
  assert.match(diff.regressions[0].reason, /pass.*fail/i);
  await rm(dir, { recursive: true, force: true });
});

test('regression when baseline scenario missing from current', async () => {
  const dir = await setup();
  const baseCard = { scenarioId: 's1', verdict: 'pass', validators: [], rubric: [], requiredFailures: [] };
  await writeFile(path.join(dir, 'baseline', 's1.json'), JSON.stringify(baseCard));

  const diff = await diffBaseline({ baselineDir: path.join(dir, 'baseline'), resultsDir: path.join(dir, 'results') });
  assert.equal(diff.regressions.length, 1);
  assert.match(diff.regressions[0].reason, /missing/i);
  await rm(dir, { recursive: true, force: true });
});

test('new scenarios listed but not regressions', async () => {
  const dir = await setup();
  const curCard = { scenarioId: 's1', verdict: 'pass', validators: [], rubric: [], requiredFailures: [] };
  await mkdir(path.join(dir, 'results', 's1'));
  await writeFile(path.join(dir, 'results', 's1', 'score.json'), JSON.stringify(curCard));

  const diff = await diffBaseline({ baselineDir: path.join(dir, 'baseline'), resultsDir: path.join(dir, 'results') });
  assert.deepEqual(diff.regressions, []);
  assert.deepEqual(diff.newScenarios, ['s1']);
  await rm(dir, { recursive: true, force: true });
});

test('approve copies current score.json files to baseline', async () => {
  const dir = await setup();
  const curCard = { scenarioId: 's1', verdict: 'pass', validators: [], rubric: [], requiredFailures: [] };
  await mkdir(path.join(dir, 'results', 's1'));
  await writeFile(path.join(dir, 'results', 's1', 'score.json'), JSON.stringify(curCard));

  await approve({ baselineDir: path.join(dir, 'baseline'), resultsDir: path.join(dir, 'results') });
  const written = JSON.parse(await readFile(path.join(dir, 'baseline', 's1.json'), 'utf8'));
  assert.equal(written.scenarioId, 's1');
  await rm(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd skills/aem/forms/evals-runner && node --test test/baseline.test.js
```
Expected: FAIL.

- [ ] **Step 3: Implement baseline module**

`skills/aem/forms/evals-runner/lib/baseline.js`:
```javascript
import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

async function readJsonIfExists(p) {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function readBaselines(baselineDir) {
  const out = new Map();
  let entries;
  try {
    entries = await readdir(baselineDir);
  } catch (err) {
    if (err.code === 'ENOENT') return out;
    throw err;
  }
  for (const file of entries.filter(f => f.endsWith('.json'))) {
    const card = await readJsonIfExists(path.join(baselineDir, file));
    if (card?.scenarioId) out.set(card.scenarioId, card);
  }
  return out;
}

async function readCurrent(resultsDir) {
  const out = new Map();
  let entries;
  try {
    entries = await readdir(resultsDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return out;
    throw err;
  }
  for (const d of entries.filter(d => d.isDirectory())) {
    const p = path.join(resultsDir, d.name, 'score.json');
    const card = await readJsonIfExists(p);
    if (card?.scenarioId) out.set(card.scenarioId, card);
  }
  return out;
}

export async function diffBaseline({ baselineDir, resultsDir }) {
  const baseline = await readBaselines(baselineDir);
  const current = await readCurrent(resultsDir);

  const regressions = [];
  const newScenarios = [];
  const matches = [];

  for (const [id, baseCard] of baseline) {
    const curCard = current.get(id);
    if (!curCard) {
      regressions.push({ scenarioId: id, reason: 'Scenario missing from current results (was present in baseline).' });
      continue;
    }
    if (baseCard.verdict === 'pass' && curCard.verdict === 'fail') {
      regressions.push({
        scenarioId: id,
        reason: `Verdict regressed: pass → fail. Failures:\n  - ${curCard.requiredFailures.join('\n  - ')}`
      });
      continue;
    }
    matches.push(id);
  }

  for (const [id] of current) {
    if (!baseline.has(id)) newScenarios.push(id);
  }

  return { regressions, newScenarios, matches };
}

export async function approve({ baselineDir, resultsDir }) {
  await mkdir(baselineDir, { recursive: true });
  const current = await readCurrent(resultsDir);
  for (const [id, card] of current) {
    await writeFile(path.join(baselineDir, `${id}.json`), JSON.stringify(card, null, 2));
  }
  return current.size;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd skills/aem/forms/evals-runner && node --test test/baseline.test.js
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add skills/aem/forms/evals-runner/lib/baseline.js \
        skills/aem/forms/evals-runner/test/baseline.test.js
git commit -m "feat(evals-runner): add baseline diff and approve"
```

---

## Task 8: Stub provider (for tests only)

**Files:**
- Create: `skills/aem/forms/evals-runner/lib/providers/stub.js`

- [ ] **Step 1: Implement stub provider**

The stub lets us test the agent harness without hitting a real API. It plays back a scripted sequence of tool-use turns supplied by the test.

`skills/aem/forms/evals-runner/lib/providers/stub.js`:
```javascript
export function createStubAgentProvider(scriptedTurns) {
  const queue = [...scriptedTurns];
  return {
    async runAgentLoop({ systemPrompt, userMessage, tools, maxTurns, toolDispatch }) {
      const turns = [];
      let turnCount = 0;
      while (turnCount < maxTurns) {
        if (queue.length === 0) {
          return { turns, stopReason: 'end_turn' };
        }
        const scripted = queue.shift();
        turnCount++;
        if (scripted.type === 'end_turn') {
          turns.push({ role: 'assistant', text: scripted.text ?? '', toolCalls: [] });
          return { turns, stopReason: 'end_turn' };
        }
        if (scripted.type === 'tool_use') {
          turns.push({
            role: 'assistant',
            text: scripted.text ?? '',
            toolCalls: [{ id: scripted.id, name: scripted.name, input: scripted.input }]
          });
          const result = await toolDispatch({ id: scripted.id, name: scripted.name, input: scripted.input });
          turns.push({ role: 'tool_result', toolCallId: scripted.id, content: result });
        }
      }
      return { turns, stopReason: 'max_turns' };
    }
  };
}

export function createStubJudgeProvider(scriptedResponses) {
  let idx = 0;
  return {
    async judge({ systemPrompt, userMessage, transcript, criteria }) {
      const response = scriptedResponses[idx++] ?? scriptedResponses.at(-1);
      if (response.throw) throw new Error(response.throw);
      if (response.raw) return { rawText: response.raw };
      return { results: response.results };
    }
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add skills/aem/forms/evals-runner/lib/providers/stub.js
git commit -m "feat(evals-runner): add stub provider for harness tests"
```

---

## Task 9: Anthropic provider

**Files:**
- Create: `skills/aem/forms/evals-runner/lib/providers/anthropic.js`
- Create: `skills/aem/forms/evals-runner/lib/providers/index.js`

- [ ] **Step 1: Implement Anthropic agent + judge provider**

Tested indirectly — this file wraps the Anthropic SDK and only runs against a real API. Unit-testing it would essentially be re-testing the SDK. End-to-end verification happens in Task 16.

`skills/aem/forms/evals-runner/lib/providers/anthropic.js`:
```javascript
import Anthropic from '@anthropic-ai/sdk';

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Export it before running evals.');
  }
  return new Anthropic({ apiKey });
}

export function createAnthropicAgentProvider({ model }) {
  const client = getClient();
  return {
    async runAgentLoop({ systemPrompt, userMessage, tools, maxTurns, toolDispatch }) {
      const turns = [];
      const messages = [{ role: 'user', content: userMessage }];
      let stopReason = 'end_turn';
      for (let i = 0; i < maxTurns; i++) {
        const response = await client.messages.create({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          tools,
          messages
        });

        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
        const textBlocks = response.content.filter(b => b.type === 'text');
        turns.push({
          role: 'assistant',
          text: textBlocks.map(b => b.text).join('\n'),
          toolCalls: toolUseBlocks.map(b => ({ id: b.id, name: b.name, input: b.input }))
        });

        messages.push({ role: 'assistant', content: response.content });

        if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
          stopReason = response.stop_reason || 'end_turn';
          break;
        }

        const toolResults = [];
        for (const tu of toolUseBlocks) {
          const result = await toolDispatch({ id: tu.id, name: tu.name, input: tu.input });
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: String(result) });
          turns.push({ role: 'tool_result', toolCallId: tu.id, content: String(result) });
        }
        messages.push({ role: 'user', content: toolResults });

        if (i === maxTurns - 1) stopReason = 'max_turns';
      }
      return { turns, stopReason };
    }
  };
}

export function createAnthropicJudgeProvider({ model }) {
  const client = getClient();
  return {
    async judge({ systemPrompt, userMessage, transcript, criteria }) {
      const prompt = buildJudgePrompt({ userMessage, transcript, criteria });
      const response = await client.messages.create({
        model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      });
      const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
      return { rawText: text };
    }
  };
}

function buildJudgePrompt({ userMessage, transcript, criteria }) {
  const transcriptText = transcript.turns.map(t => {
    if (t.role === 'assistant') {
      const tc = t.toolCalls.length
        ? '\n' + t.toolCalls.map(c => `[tool_call ${c.name}] ${JSON.stringify(c.input)}`).join('\n')
        : '';
      return `ASSISTANT: ${t.text}${tc}`;
    }
    if (t.role === 'tool_result') return `TOOL_RESULT (${t.toolCallId}): ${t.content}`;
    return '';
  }).join('\n\n');

  const criteriaText = criteria.map((c, i) => `${i + 1}. [id: ${c.id}] ${c.description}`).join('\n');

  return `You are evaluating an AI agent's behavior on a task.

<user_request>
${userMessage}
</user_request>

<transcript>
${transcriptText}
</transcript>

For each criterion below, return a JSON array with entries {"id": "...", "passed": true|false, "reason": "..."}.

Criteria:
${criteriaText}

Return ONLY the JSON array. No prose, no markdown fences.`;
}
```

- [ ] **Step 2: Implement provider registry**

`skills/aem/forms/evals-runner/lib/providers/index.js`:
```javascript
import { createAnthropicAgentProvider, createAnthropicJudgeProvider } from './anthropic.js';

export function getAgentProvider({ provider, model }) {
  if (provider === 'anthropic') return createAnthropicAgentProvider({ model });
  throw new Error(`unknown agent provider: ${provider}`);
}

export function getJudgeProvider({ provider, model }) {
  if (provider === 'anthropic') return createAnthropicJudgeProvider({ model });
  throw new Error(`unknown judge provider: ${provider}`);
}
```

- [ ] **Step 3: Commit**

```bash
git add skills/aem/forms/evals-runner/lib/providers/anthropic.js \
        skills/aem/forms/evals-runner/lib/providers/index.js
git commit -m "feat(evals-runner): add anthropic provider and registry"
```

---

## Task 10: Agent harness

**Files:**
- Create: `skills/aem/forms/evals-runner/lib/agent-harness.js`
- Create: `skills/aem/forms/evals-runner/test/agent-harness.test.js`

- [ ] **Step 1: Write harness tests**

`skills/aem/forms/evals-runner/test/agent-harness.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildSystemPrompt, buildToolDispatch, runAgent } from '../lib/agent-harness.js';
import { createStubAgentProvider } from '../lib/providers/stub.js';

async function makeSkill(tree) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skill-test-'));
  for (const [rel, content] of Object.entries(tree)) {
    const full = path.join(dir, rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  return dir;
}

test('buildSystemPrompt concatenates SKILL.md and all references', async () => {
  const skill = await makeSkill({
    'SKILL.md': '# The skill',
    'references/a.md': 'ref A',
    'references/nested/b.md': 'ref B'
  });
  const prompt = await buildSystemPrompt(skill);
  assert.match(prompt, /SKILL\.md/);
  assert.match(prompt, /# The skill/);
  assert.match(prompt, /references\/a\.md/);
  assert.match(prompt, /ref A/);
  assert.match(prompt, /references\/nested\/b\.md/);
  assert.match(prompt, /ref B/);
  await rm(skill, { recursive: true, force: true });
});

test('toolDispatch writes files relative to workspace', async () => {
  const ws = await mkdtemp(path.join(os.tmpdir(), 'ws-'));
  const dispatch = buildToolDispatch({ workspace: ws, allowedTools: ['Write'], mockedTools: {} });
  const result = await dispatch({ id: 't1', name: 'Write', input: { path: 'a.txt', content: 'hi' } });
  assert.match(result, /ok/i);
  const { readFile } = await import('node:fs/promises');
  const content = await readFile(path.join(ws, 'a.txt'), 'utf8');
  assert.equal(content, 'hi');
  await rm(ws, { recursive: true, force: true });
});

test('toolDispatch rejects path escape', async () => {
  const ws = await mkdtemp(path.join(os.tmpdir(), 'ws-'));
  const dispatch = buildToolDispatch({ workspace: ws, allowedTools: ['Write'], mockedTools: {} });
  const result = await dispatch({ id: 't1', name: 'Write', input: { path: '../escape.txt', content: 'bad' } });
  assert.match(result, /outside workspace/);
  await rm(ws, { recursive: true, force: true });
});

test('toolDispatch returns mock for mocked tool', async () => {
  const ws = await mkdtemp(path.join(os.tmpdir(), 'ws-'));
  const dispatch = buildToolDispatch({ workspace: ws, allowedTools: ['api-call'], mockedTools: { 'api-call': { hello: 'world' } } });
  const result = await dispatch({ id: 't1', name: 'api-call', input: {} });
  assert.match(result, /world/);
  await rm(ws, { recursive: true, force: true });
});

test('toolDispatch errors for disallowed tool', async () => {
  const ws = await mkdtemp(path.join(os.tmpdir(), 'ws-'));
  const dispatch = buildToolDispatch({ workspace: ws, allowedTools: ['Read'], mockedTools: {} });
  const result = await dispatch({ id: 't1', name: 'Write', input: {} });
  assert.match(result, /not allowed/);
  await rm(ws, { recursive: true, force: true });
});

test('runAgent completes against stub provider', async () => {
  const skill = await makeSkill({ 'SKILL.md': 'x' });
  const ws = await mkdtemp(path.join(os.tmpdir(), 'ws-'));
  const provider = createStubAgentProvider([
    { type: 'tool_use', id: 't1', name: 'Write', input: { path: 'out.txt', content: 'done' } },
    { type: 'end_turn', text: 'finished' }
  ]);
  const result = await runAgent({
    provider,
    skillDir: skill,
    workspace: ws,
    userMessage: 'do it',
    config: { maxTurns: 5, allowedTools: ['Write'], mockedTools: {} }
  });
  assert.equal(result.stopReason, 'end_turn');
  assert.equal(result.turns.length, 3); // assistant tool_use, tool_result, assistant end_turn
  await rm(skill, { recursive: true, force: true });
  await rm(ws, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd skills/aem/forms/evals-runner && node --test test/agent-harness.test.js
```
Expected: FAIL.

- [ ] **Step 3: Implement harness**

`skills/aem/forms/evals-runner/lib/agent-harness.js`:
```javascript
import { readFile, readdir, writeFile, stat, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

async function walkMd(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return acc;
    throw err;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walkMd(full, acc);
    else if (e.name.endsWith('.md')) acc.push(full);
  }
  return acc;
}

export async function buildSystemPrompt(skillDir) {
  const skillMd = path.join(skillDir, 'SKILL.md');
  const refs = await walkMd(path.join(skillDir, 'references'));
  const files = [skillMd, ...refs.sort()];
  const parts = [];
  for (const f of files) {
    try {
      const content = await readFile(f, 'utf8');
      parts.push(`=== ${path.relative(skillDir, f)} ===\n${content}`);
    } catch {}
  }
  return parts.join('\n\n');
}

function resolveInside(workspace, relPath) {
  const full = path.resolve(workspace, relPath);
  const ws = path.resolve(workspace);
  if (!full.startsWith(ws + path.sep) && full !== ws) {
    return { error: `path "${relPath}" resolves outside workspace` };
  }
  return { full };
}

export function buildToolDispatch({ workspace, allowedTools, mockedTools }) {
  return async function dispatch({ id, name, input }) {
    if (!allowedTools.includes(name)) {
      return `error: tool "${name}" not allowed`;
    }
    if (mockedTools && name in mockedTools) {
      return typeof mockedTools[name] === 'string' ? mockedTools[name] : JSON.stringify(mockedTools[name]);
    }
    try {
      switch (name) {
        case 'bash': {
          const out = execSync(input.command, { cwd: workspace, stdio: 'pipe', timeout: 60_000, maxBuffer: 8 * 1024 * 1024 });
          return `ok:\n${out.toString()}`;
        }
        case 'Read': {
          const { full, error } = resolveInside(workspace, input.path);
          if (error) return `error: ${error}`;
          return (await readFile(full, 'utf8')).slice(0, 64_000);
        }
        case 'Write': {
          const { full, error } = resolveInside(workspace, input.path);
          if (error) return `error: ${error}`;
          await mkdir(path.dirname(full), { recursive: true });
          await writeFile(full, input.content);
          return 'ok: wrote';
        }
        case 'Edit': {
          const { full, error } = resolveInside(workspace, input.path);
          if (error) return `error: ${error}`;
          const original = await readFile(full, 'utf8');
          if (!original.includes(input.old_string)) return 'error: old_string not found';
          const replaced = original.replace(input.old_string, input.new_string);
          await writeFile(full, replaced);
          return 'ok: edited';
        }
        case 'Glob': {
          const out = execSync(`find . -path './node_modules' -prune -o -name '${input.pattern.replaceAll("'", "\\'")}' -print`, { cwd: workspace, stdio: 'pipe' });
          return out.toString().slice(0, 32_000);
        }
        case 'Grep': {
          const pattern = String(input.pattern).replace(/'/g, "'\\''");
          const out = execSync(`grep -rIn --exclude-dir=node_modules '${pattern}' .`, { cwd: workspace, stdio: 'pipe' });
          return out.toString().slice(0, 32_000);
        }
        default:
          return `error: tool "${name}" has no implementation and no mock configured`;
      }
    } catch (err) {
      return `error: ${err.message}`;
    }
  };
}

const DEFAULT_TOOL_DECLARATIONS = {
  bash: {
    name: 'bash', description: 'Execute a shell command.',
    input_schema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] }
  },
  Read: {
    name: 'Read', description: 'Read a file from the workspace.',
    input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
  },
  Write: {
    name: 'Write', description: 'Write content to a file in the workspace.',
    input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] }
  },
  Edit: {
    name: 'Edit', description: 'Replace a string in a file.',
    input_schema: { type: 'object', properties: { path: { type: 'string' }, old_string: { type: 'string' }, new_string: { type: 'string' } }, required: ['path', 'old_string', 'new_string'] }
  },
  Glob: {
    name: 'Glob', description: 'Find files by name pattern.',
    input_schema: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] }
  },
  Grep: {
    name: 'Grep', description: 'Search file contents.',
    input_schema: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] }
  }
};

export async function runAgent({ provider, skillDir, workspace, userMessage, config }) {
  const systemPrompt = await buildSystemPrompt(skillDir);
  const { allowedTools, mockedTools = {}, maxTurns } = config;
  const tools = allowedTools.map(name => {
    if (DEFAULT_TOOL_DECLARATIONS[name]) return DEFAULT_TOOL_DECLARATIONS[name];
    return {
      name,
      description: `Custom tool "${name}"`,
      input_schema: { type: 'object' }
    };
  });
  const toolDispatch = buildToolDispatch({ workspace, allowedTools, mockedTools });
  return provider.runAgentLoop({ systemPrompt, userMessage, tools, maxTurns, toolDispatch });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd skills/aem/forms/evals-runner && node --test test/agent-harness.test.js
```
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add skills/aem/forms/evals-runner/lib/agent-harness.js \
        skills/aem/forms/evals-runner/test/agent-harness.test.js
git commit -m "feat(evals-runner): add agent harness with sandboxed tool dispatch"
```

---

## Task 11: Judge module

**Files:**
- Create: `skills/aem/forms/evals-runner/lib/judge.js`
- Create: `skills/aem/forms/evals-runner/test/judge.test.js`

- [ ] **Step 1: Write judge tests**

`skills/aem/forms/evals-runner/test/judge.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runJudge, parseJudgeResponse } from '../lib/judge.js';
import { createStubJudgeProvider } from '../lib/providers/stub.js';

const transcript = { turns: [{ role: 'assistant', text: 'I did the thing.', toolCalls: [] }] };
const criteria = [{ id: 'c1', description: 'Did the thing?', required: true }];

test('parses clean JSON response', () => {
  const parsed = parseJudgeResponse('[{"id":"c1","passed":true,"reason":"did it"}]', criteria);
  assert.equal(parsed.results[0].id, 'c1');
  assert.equal(parsed.results[0].passed, true);
});

test('tolerates surrounding prose', () => {
  const parsed = parseJudgeResponse('Here is the result:\n[{"id":"c1","passed":true,"reason":"ok"}]\nDone.', criteria);
  assert.equal(parsed.results[0].passed, true);
});

test('tolerates markdown code fences', () => {
  const parsed = parseJudgeResponse('```json\n[{"id":"c1","passed":false,"reason":"nope"}]\n```', criteria);
  assert.equal(parsed.results[0].passed, false);
});

test('fills missing criteria with failure', () => {
  const parsed = parseJudgeResponse('[]', criteria);
  assert.equal(parsed.results.length, 1);
  assert.equal(parsed.results[0].passed, false);
  assert.match(parsed.results[0].reason, /no judgment/);
});

test('returns null results when parse fails', () => {
  const parsed = parseJudgeResponse('this is not JSON at all', criteria);
  assert.equal(parsed.results, null);
  assert.match(parsed.parseError, /parse/i);
});

test('runJudge retries once on parse failure', async () => {
  const provider = createStubJudgeProvider([
    { raw: 'garbage' },
    { raw: '[{"id":"c1","passed":true,"reason":"ok"}]' }
  ]);
  const out = await runJudge({ provider, userMessage: 'x', transcript, criteria });
  assert.equal(out.results[0].passed, true);
  assert.equal(out.reprompted, true);
});

test('runJudge reports failure after second bad response', async () => {
  const provider = createStubJudgeProvider([
    { raw: 'first garbage' },
    { raw: 'second garbage' }
  ]);
  const out = await runJudge({ provider, userMessage: 'x', transcript, criteria });
  assert.equal(out.results, null);
  assert.match(out.parseError, /parse/i);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd skills/aem/forms/evals-runner && node --test test/judge.test.js
```
Expected: FAIL.

- [ ] **Step 3: Implement judge module**

`skills/aem/forms/evals-runner/lib/judge.js`:
```javascript
export function parseJudgeResponse(text, criteria) {
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) cleaned = fence[1].trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    return { results: null, parseError: 'could not locate JSON array in judge response' };
  }
  const slice = cleaned.slice(start, end + 1);
  let arr;
  try {
    arr = JSON.parse(slice);
  } catch (err) {
    return { results: null, parseError: `parse failed: ${err.message}` };
  }
  if (!Array.isArray(arr)) return { results: null, parseError: 'judge response is not an array' };

  const byId = new Map(arr.filter(x => x && typeof x === 'object').map(x => [x.id, x]));
  const results = criteria.map(c => {
    const entry = byId.get(c.id);
    if (!entry) {
      return { id: c.id, required: c.required !== false, passed: false, reason: 'judge returned no judgment for this criterion' };
    }
    return {
      id: c.id,
      required: c.required !== false,
      passed: Boolean(entry.passed),
      reason: String(entry.reason ?? '')
    };
  });
  return { results };
}

export async function runJudge({ provider, userMessage, transcript, criteria }) {
  const first = await provider.judge({ userMessage, transcript, criteria });
  const parsed1 = parseJudgeResponse(first.rawText ?? '', criteria);
  if (parsed1.results) return { ...parsed1, reprompted: false };

  const second = await provider.judge({ userMessage, transcript, criteria });
  const parsed2 = parseJudgeResponse(second.rawText ?? '', criteria);
  if (parsed2.results) return { ...parsed2, reprompted: true };
  return { results: null, parseError: parsed2.parseError, reprompted: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd skills/aem/forms/evals-runner && node --test test/judge.test.js
```
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add skills/aem/forms/evals-runner/lib/judge.js \
        skills/aem/forms/evals-runner/test/judge.test.js
git commit -m "feat(evals-runner): add judge with tolerant JSON parsing and reprompt"
```

---

## Task 12: Report module

**Files:**
- Create: `skills/aem/forms/evals-runner/lib/report.js`

- [ ] **Step 1: Implement reporter**

Tested via the end-to-end smoke in Task 16 — the module formats strings only, no logic branches worth isolated unit tests.

`skills/aem/forms/evals-runner/lib/report.js`:
```javascript
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export function formatSummary({ skillName, cards, diff }) {
  const lines = [];
  lines.push(`# Evals summary: ${skillName}`);
  lines.push('');
  lines.push(`| Scenario | Verdict | Attempts | Duration |`);
  lines.push(`|---|---|---|---|`);
  for (const card of cards) {
    lines.push(`| ${card.scenarioId} | ${verdictBadge(card.verdict)} | ${card.attempts} | ${ms(card.duration_ms)} |`);
  }
  lines.push('');

  if (diff.regressions.length) {
    lines.push(`## Regressions vs baseline (${diff.regressions.length})`);
    for (const r of diff.regressions) {
      lines.push(`- **${r.scenarioId}** — ${r.reason}`);
    }
    lines.push('');
  } else {
    lines.push(`## No regressions detected.`);
    lines.push('');
  }

  if (diff.newScenarios.length) {
    lines.push(`## New scenarios (not in baseline)`);
    for (const id of diff.newScenarios) lines.push(`- ${id}`);
    lines.push('');
  }

  for (const card of cards.filter(c => c.verdict === 'fail')) {
    lines.push(`## Failed scenario: ${card.scenarioId}`);
    for (const f of card.requiredFailures) lines.push(`- ${f}`);
    lines.push('');
  }

  return lines.join('\n');
}

function verdictBadge(v) {
  return v === 'pass' ? '✅ pass' : '❌ fail';
}

function ms(n) {
  if (!n && n !== 0) return '-';
  if (n < 1000) return `${n}ms`;
  return `${(n / 1000).toFixed(1)}s`;
}

export async function writeScenarioArtifacts({ resultsDir, scenarioId, transcript, scorecard }) {
  const dir = path.join(resultsDir, scenarioId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'run.json'), JSON.stringify(transcript, null, 2));
  await writeFile(path.join(dir, 'score.json'), JSON.stringify(scorecard, null, 2));
  await writeFile(path.join(dir, 'report.md'), formatScenarioReport(scorecard));
}

function formatScenarioReport(card) {
  const lines = [];
  lines.push(`# ${card.scenarioId} — ${card.verdict === 'pass' ? '✅ pass' : '❌ fail'}`);
  lines.push('');
  lines.push('## Validators');
  for (const v of card.validators) {
    const icon = v.passed ? '✅' : (v.required ? '❌' : '⚠️');
    const label = v.name || `${v.type}(${v.config?.path || v.config?.command || ''})`;
    lines.push(`- ${icon} ${label} — ${v.reason}`);
  }
  lines.push('');
  lines.push('## Rubric');
  for (const r of card.rubric) {
    const icon = r.passed ? '✅' : (r.required ? '❌' : '⚠️');
    lines.push(`- ${icon} ${r.id} — ${r.reason}`);
  }
  return lines.join('\n');
}

export async function writeSummary({ resultsDir, summary }) {
  await mkdir(resultsDir, { recursive: true });
  await writeFile(path.join(resultsDir, 'summary.md'), summary);
}
```

- [ ] **Step 2: Commit**

```bash
git add skills/aem/forms/evals-runner/lib/report.js
git commit -m "feat(evals-runner): add report module"
```

---

## Task 13: CLI orchestrator

**Files:**
- Modify: `skills/aem/forms/evals-runner/run.js`

- [ ] **Step 1: Replace stub run.js with the orchestrator**

`skills/aem/forms/evals-runner/run.js`:
```javascript
#!/usr/bin/env node
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { loadScenarios } from './lib/load-scenarios.js';
import { resolveFixture, seedWorkspace, teardownWorkspace } from './lib/workspace.js';
import { runValidators } from './lib/validators.js';
import { runAgent } from './lib/agent-harness.js';
import { runJudge } from './lib/judge.js';
import { buildScorecard } from './lib/scorecard.js';
import { diffBaseline, approve } from './lib/baseline.js';
import { formatSummary, writeScenarioArtifacts, writeSummary } from './lib/report.js';
import { getAgentProvider, getJudgeProvider } from './lib/providers/index.js';

function parseArgs(argv) {
  const args = { skill: null, scenario: null, approve: false, noBaseline: false, filter: null, verbose: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--skill') args.skill = argv[++i];
    else if (a === '--scenario') args.scenario = argv[++i];
    else if (a === '--approve') args.approve = true;
    else if (a === '--no-baseline') args.noBaseline = true;
    else if (a === '--filter') args.filter = argv[++i];
    else if (a === '--verbose') args.verbose = true;
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else { console.error(`Unknown argument: ${a}`); process.exit(2); }
  }
  if (!args.skill) { console.error('Missing required --skill <path>'); process.exit(2); }
  return args;
}

function printHelp() {
  console.log(`Usage: run.js --skill <path> [options]

Options:
  --skill <path>     Path to skill directory (contains SKILL.md and evals/)
  --scenario <id>    Run only scenarios whose id contains the substring
  --filter <substr>  Alias for --scenario
  --approve          Copy current results into baseline/
  --no-baseline      Skip baseline comparison
  --verbose          Stream agent turns to stdout
  --help             Show this help
`);
}

async function loadConfig(skillDir) {
  const p = path.join(skillDir, 'evals', 'evals.config.json');
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

function resolveConfig(raw) {
  return {
    agent: {
      provider: process.env.EVAL_AGENT_PROVIDER || raw.agent?.provider || 'anthropic',
      model: process.env.EVAL_AGENT_MODEL || raw.agent?.model || 'claude-haiku-4-5-20251001',
      maxTurns: raw.agent?.maxTurns || 20
    },
    judge: {
      provider: process.env.EVAL_JUDGE_PROVIDER || raw.judge?.provider || 'anthropic',
      model: process.env.EVAL_JUDGE_MODEL || raw.judge?.model || 'claude-sonnet-4-6'
    },
    retry: {
      attempts: Number(process.env.EVAL_ATTEMPTS) || raw.retry?.attempts || 2
    },
    timeout_ms: raw.timeout_ms || 180_000
  };
}

async function runScenario({ scenario, skillDir, resultsDir, config, agentProvider, judgeProvider, verbose }) {
  const attempts = config.retry.attempts;
  const fixturePath = await resolveFixture({ skillDir, fixtureName: scenario.workspace.fixture });

  let lastCard = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const started = Date.now();
    const workspace = await seedWorkspace({ fixturePath, scenarioId: scenario.id, attempt });
    if (verbose) console.error(`[${scenario.id}] attempt ${attempt}: workspace=${workspace}`);

    let agentResult;
    try {
      agentResult = await runAgent({
        provider: agentProvider,
        skillDir,
        workspace,
        userMessage: scenario.userMessage,
        config: {
          maxTurns: Math.min(config.agent.maxTurns, scenario.agent.maxTurns),
          allowedTools: scenario.agent.allowedTools,
          mockedTools: scenario.agent.mockedTools || {}
        }
      });
    } catch (err) {
      lastCard = buildScorecard({
        scenarioId: scenario.id,
        attempts: attempt,
        duration_ms: Date.now() - started,
        validators: [{ type: 'agent_error', required: true, passed: false, reason: err.message, config: {} }],
        rubric: scenario.rubric.map(c => ({ id: c.id, required: c.required !== false, passed: false, reason: 'agent failed before judging' }))
      });
      await teardownWorkspace(workspace);
      continue;
    }

    const validators = await runValidators(workspace, scenario.validators || []);

    const judgeOut = await runJudge({
      provider: judgeProvider,
      userMessage: scenario.userMessage,
      transcript: agentResult,
      criteria: scenario.rubric
    });

    const rubric = judgeOut.results ?? scenario.rubric.map(c => ({
      id: c.id, required: c.required !== false, passed: false, reason: `judge error: ${judgeOut.parseError}`
    }));

    const card = buildScorecard({
      scenarioId: scenario.id,
      attempts: attempt,
      duration_ms: Date.now() - started,
      validators,
      rubric
    });

    await writeScenarioArtifacts({ resultsDir, scenarioId: scenario.id, transcript: agentResult, scorecard: card });
    lastCard = card;
    if (card.verdict === 'pass') {
      await teardownWorkspace(workspace);
      return card;
    }
    await teardownWorkspace(workspace);
  }
  return lastCard;
}

async function main() {
  const args = parseArgs(process.argv);
  const skillDir = path.resolve(args.skill);
  const evalsDir = path.join(skillDir, 'evals');
  const scenariosDir = path.join(evalsDir, 'scenarios');
  const baselineDir = path.join(evalsDir, 'baseline');
  const resultsDir = path.join(evalsDir, 'results');

  const rawConfig = await loadConfig(skillDir);
  const config = resolveConfig(rawConfig);

  const loaded = await loadScenarios(scenariosDir, { filter: args.filter || args.scenario });
  const valid = loaded.filter(l => l.ok);
  const invalid = loaded.filter(l => !l.ok);
  if (invalid.length) {
    console.error('Invalid scenarios:');
    for (const i of invalid) console.error(`  ${i.file}\n    - ${i.errors.join('\n    - ')}`);
    process.exit(2);
  }
  if (valid.length === 0) {
    console.error('No scenarios to run.');
    process.exit(2);
  }

  const agentProvider = getAgentProvider(config.agent);
  const judgeProvider = getJudgeProvider(config.judge);

  const cards = [];
  for (const { scenario } of valid) {
    const card = await runScenario({
      scenario, skillDir, resultsDir, config, agentProvider, judgeProvider, verbose: args.verbose
    });
    cards.push(card);
    console.error(`[${scenario.id}] ${card.verdict}`);
  }

  let diff = { regressions: [], newScenarios: [], matches: [] };
  if (!args.noBaseline) {
    diff = await diffBaseline({ baselineDir, resultsDir });
  }

  const summary = formatSummary({ skillName: path.basename(skillDir), cards, diff });
  await writeSummary({ resultsDir, summary });
  console.log(summary);

  if (args.approve) {
    const n = await approve({ baselineDir, resultsDir });
    console.error(`approved ${n} scenarios`);
  }

  const failed = cards.some(c => c.verdict === 'fail');
  if (diff.regressions.length || failed) process.exit(1);
  process.exit(0);
}

main().catch(err => {
  console.error(err.stack || err.message);
  process.exit(2);
});
```

- [ ] **Step 2: Sanity-check --help**

```bash
node skills/aem/forms/evals-runner/run.js --help
```
Expected: prints the usage block.

- [ ] **Step 3: Sanity-check missing --skill**

```bash
node skills/aem/forms/evals-runner/run.js 2>&1 || true
```
Expected: exits 2 with "Missing required --skill".

- [ ] **Step 4: Run full test suite**

```bash
cd skills/aem/forms/evals-runner && node --test test/
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add skills/aem/forms/evals-runner/run.js
git commit -m "feat(evals-runner): implement CLI orchestrator"
```

---

## Task 14: Build form-repo fixture

**Files:**
- Create: `skills/aem/forms/evals-fixtures/form-repo/.gitignore`
- Create: `skills/aem/forms/evals-fixtures/form-repo/code/package.json`
- Create: `skills/aem/forms/evals-fixtures/form-repo/code/package-lock.json` (auto-generated)
- Create: `skills/aem/forms/evals-fixtures/form-repo/code/scripts/create-custom-component.js`
- Create: `skills/aem/forms/evals-fixtures/form-repo/code/blocks/form/mappings.js`
- Create: `skills/aem/forms/evals-fixtures/form-repo/code/blocks/form/form.js`
- Create: `skills/aem/forms/evals-fixtures/form-repo/form.json`

- [ ] **Step 1: Create fixture .gitignore**

`skills/aem/forms/evals-fixtures/form-repo/.gitignore`:
```
node_modules/
dist/
build/
.cache/
.parcel-cache/
coverage/
*.log
.DS_Store
.env
.env.local
```

- [ ] **Step 2: Create fixture package.json**

`skills/aem/forms/evals-fixtures/form-repo/code/package.json`:
```json
{
  "name": "form-repo-fixture",
  "version": "0.0.1",
  "private": true,
  "description": "Minimal EDS forms fixture for evals. Not a real publishable package.",
  "scripts": {
    "create:custom-component": "node scripts/create-custom-component.js"
  }
}
```

- [ ] **Step 3: Create stub scaffolder**

The stub mirrors the real boilerplate's `create:custom-component` behavior with enough fidelity for the agent to drive the workflow. It creates the three expected files with minimal templates that the agent is expected to edit.

`skills/aem/forms/evals-fixtures/form-repo/code/scripts/create-custom-component.js`:
```javascript
#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--name') args.name = argv[++i];
  else if (argv[i] === '--base') args.base = argv[++i];
}
if (!args.name || !args.base) {
  console.error('usage: create-custom-component --name <view-type> --base <base-type>');
  process.exit(1);
}

const dir = path.join('blocks', 'form', 'components', args.name);
if (existsSync(dir)) {
  console.error(`component "${args.name}" already exists at ${dir}`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });

const jsTemplate = `// ${args.name}.js — extends ${args.base}
export default function decorate(fieldDiv, field) {
  // TODO: implement component logic.
  // Subscribe to field changes using { listenChanges: true } when required.
  return fieldDiv;
}
`;

const cssTemplate = `/* ${args.name}.css */
`;

const jsonTemplate = JSON.stringify({
  name: args.name,
  base: args.base,
  properties: []
}, null, 2) + '\n';

writeFileSync(path.join(dir, `${args.name}.js`), jsTemplate);
writeFileSync(path.join(dir, `${args.name}.css`), cssTemplate);
writeFileSync(path.join(dir, `_${args.name}.json`), jsonTemplate);
console.log(`created component "${args.name}" extending "${args.base}" at ${dir}`);
```

- [ ] **Step 4: Create seed mappings.js**

`skills/aem/forms/evals-fixtures/form-repo/code/blocks/form/mappings.js`:
```javascript
// Seed mappings file. The agent should add new fd:viewType entries to customComponents.
export const customComponents = [];

export function getCustomComponent(viewType) {
  return customComponents.find(c => c === viewType);
}
```

- [ ] **Step 5: Create seed form.js**

`skills/aem/forms/evals-fixtures/form-repo/code/blocks/form/form.js`:
```javascript
// Minimal seed form.js — not a real implementation. Exists so the agent can
// see block structure when it reads references/field-html-structure.md.
export default function decorate(block) {
  return block;
}
```

- [ ] **Step 6: Create seed form.json**

`skills/aem/forms/evals-fixtures/form-repo/form.json`:
```json
{
  "adaptiveform": "0.14.0",
  "metadata": { "grammar": "json-formula-1.0.0" },
  "items": [
    {
      "fieldType": "text-input",
      "name": "name",
      "jcr:title": "Name"
    }
  ]
}
```

- [ ] **Step 7: Verify the scaffolder works**

```bash
cd skills/aem/forms/evals-fixtures/form-repo/code && \
  node scripts/create-custom-component.js --name demo --base datetime && \
  ls blocks/form/components/demo/ && \
  rm -rf blocks/form/components/demo
```
Expected: lists `demo.js`, `demo.css`, `_demo.json`; then cleaned up.

- [ ] **Step 8: Commit**

Do NOT commit the scaffolded `demo/` directory. Ensure it was removed in step 7.

```bash
git add skills/aem/forms/evals-fixtures/form-repo/
git commit -m "feat(evals-fixtures): add minimal form-repo fixture with stub scaffolder"
```

---

## Task 15: Author create-component scenarios and config

**Files:**
- Create: `<SKILL_PATH>/evals/.gitignore`
- Create: `<SKILL_PATH>/evals/evals.config.json`
- Create: `<SKILL_PATH>/evals/scenarios/01-happy-path-countdown.json`
- Create: `<SKILL_PATH>/evals/scenarios/02-extend-checkbox-group.json`
- Create: `<SKILL_PATH>/evals/scenarios/03-ambiguous-base-requests-clarification.json`
- Create: `<SKILL_PATH>/evals/baseline/.gitkeep`

Reminder: `<SKILL_PATH>` = `skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component`.

- [ ] **Step 1: Create evals .gitignore**

Path: `<SKILL_PATH>/evals/.gitignore`:
```
results/
```

- [ ] **Step 2: Create evals.config.json**

Path: `<SKILL_PATH>/evals/evals.config.json`:
```json
{
  "agent": {
    "provider": "anthropic",
    "model": "claude-haiku-4-5-20251001",
    "maxTurns": 25
  },
  "judge": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6"
  },
  "retry": {
    "attempts": 2
  },
  "timeout_ms": 240000
}
```

- [ ] **Step 3: Create scenario 01 — happy path countdown**

Path: `<SKILL_PATH>/evals/scenarios/01-happy-path-countdown.json`:
```json
{
  "id": "01-happy-path-countdown",
  "description": "Agent scaffolds a countdown-timer custom component extending datetime, registers it in mappings, adds fd:viewType to form.json, and wires subscribe with listenChanges.",
  "userMessage": "Add a countdown timer field to the form — it should count down to a target date and extend the existing datetime field. Use fd:viewType `countdown-timer`.",
  "workspace": { "fixture": "form-repo" },
  "agent": {
    "maxTurns": 25,
    "allowedTools": ["bash", "Read", "Write", "Edit", "Glob", "Grep"]
  },
  "validators": [
    { "type": "file_exists", "path": "code/blocks/form/components/countdown-timer/countdown-timer.js" },
    { "type": "file_exists", "path": "code/blocks/form/components/countdown-timer/countdown-timer.css" },
    { "type": "file_exists", "path": "code/blocks/form/components/countdown-timer/_countdown-timer.json" },
    { "type": "file_contains", "path": "code/blocks/form/mappings.js", "pattern": "countdown-timer" },
    { "type": "file_contains", "path": "code/blocks/form/components/countdown-timer/countdown-timer.js", "pattern": "listenChanges\\s*:\\s*true" },
    { "type": "json_path_equals", "path": "form.json", "property": "fd:viewType", "expected": "countdown-timer" }
  ],
  "rubric": [
    { "id": "uses-scaffold-command", "description": "The agent invokes `npm run create:custom-component` (with --name countdown-timer and --base datetime) rather than hand-creating the component files.", "required": true },
    { "id": "extends-not-replaces", "description": "The decorate() function the agent wrote extends the existing fieldDiv — it reads properties from the incoming DOM and modifies it, rather than clearing or rebuilding it from scratch.", "required": true },
    { "id": "adds-field-to-form-json", "description": "The agent adds a new field to form.json with both fieldType=datetime (base type) and fd:viewType=countdown-timer, not just one of them.", "required": true },
    { "id": "reads-html-structure-ref", "description": "Before writing decorate(), the agent reads references/field-html-structure.md (visible as a Read tool call on that file).", "required": false }
  ]
}
```

- [ ] **Step 4: Create scenario 02 — extend checkbox-group**

Path: `<SKILL_PATH>/evals/scenarios/02-extend-checkbox-group.json`:
```json
{
  "id": "02-extend-checkbox-group",
  "description": "Agent extends a multi-value base (checkbox-group) with a custom widget; exercises child-subscription patterns documented in references/subscribe-api.md.",
  "userMessage": "Create a custom `chip-selector` component that extends checkbox-group and renders each option as a toggleable chip. Use fd:viewType `chip-selector`.",
  "workspace": { "fixture": "form-repo" },
  "agent": {
    "maxTurns": 25,
    "allowedTools": ["bash", "Read", "Write", "Edit", "Glob", "Grep"]
  },
  "validators": [
    { "type": "file_exists", "path": "code/blocks/form/components/chip-selector/chip-selector.js" },
    { "type": "file_contains", "path": "code/blocks/form/mappings.js", "pattern": "chip-selector" },
    { "type": "file_contains", "path": "code/blocks/form/components/chip-selector/chip-selector.js", "pattern": "listenChanges\\s*:\\s*true" }
  ],
  "rubric": [
    { "id": "extends-checkbox-group", "description": "The scaffolder is invoked with --base checkbox-group (not --base text-input or another unrelated base).", "required": true },
    { "id": "handles-child-subscriptions", "description": "The agent acknowledges or implements child subscriptions — either by reading references/subscribe-api.md, by iterating child inputs in decorate(), or by setting up per-child listeners. Evidence may be in code or tool calls.", "required": true },
    { "id": "uses-listen-changes", "description": "The component's subscribe call includes `{ listenChanges: true }` as required by the skill's critical rules.", "required": true },
    { "id": "consults-subscribe-api-ref", "description": "The agent reads references/subscribe-api.md during the session.", "required": false }
  ]
}
```

- [ ] **Step 5: Create scenario 03 — ambiguous base requests clarification**

Path: `<SKILL_PATH>/evals/scenarios/03-ambiguous-base-requests-clarification.json`:
```json
{
  "id": "03-ambiguous-base-requests-clarification",
  "description": "User request is ambiguous about which OOTB base to extend. The skill demands identifying base_type explicitly, so the agent should ask rather than guess.",
  "userMessage": "I want a custom date picker component for my form. Can you build it?",
  "workspace": { "fixture": "form-repo" },
  "agent": {
    "maxTurns": 10,
    "allowedTools": ["bash", "Read", "Write", "Edit", "Glob", "Grep"]
  },
  "validators": [
    { "type": "file_not_contains", "path": "code/blocks/form/mappings.js", "pattern": "date-picker|custom-date", "required": true }
  ],
  "rubric": [
    { "id": "asks-before-guessing", "description": "The agent asks the user a clarifying question about which base type to extend (datetime? date? date-input?) instead of picking one unilaterally. A question that names multiple candidates is especially good.", "required": true },
    { "id": "does-not-scaffold", "description": "The agent does NOT invoke `npm run create:custom-component` before the user has confirmed the base type. No component files should be created in this scenario.", "required": true },
    { "id": "does-not-edit-mappings", "description": "The agent does NOT edit mappings.js in this scenario.", "required": true }
  ]
}
```

- [ ] **Step 6: Keep baseline/ present in git**

Path: `<SKILL_PATH>/evals/baseline/.gitkeep`:
```
# Baselines land here once `run.js --approve` is invoked.
```

- [ ] **Step 7: Validate scenarios load without errors**

This runs the scenario loader via a one-liner (no LLM calls):

```bash
cd skills/aem/forms/evals-runner && node --input-type=module -e "
import { loadScenarios } from './lib/load-scenarios.js';
const res = await loadScenarios('../forms-orchestrator/references/domain-registry/references/build/references/create-component/evals/scenarios');
for (const r of res) console.log(r.ok ? 'OK  ' + r.scenario.id : 'BAD ' + r.file + ' -> ' + r.errors.join('; '));
"
```
Expected: three `OK` lines.

- [ ] **Step 8: Commit**

```bash
git add skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component/evals/
git commit -m "feat(create-component/evals): add 3 scenarios, config, and .gitignore"
```

---

## Task 16: End-to-end smoke run and baseline capture

This task requires a real Anthropic API key. If unavailable, skip steps 2–5; the code paths are already covered by unit tests against the stub provider.

**Files:**
- Modify (commit): `<SKILL_PATH>/evals/baseline/*.json` (generated by `--approve`)

- [ ] **Step 1: Confirm auth is set**

```bash
test -n "$ANTHROPIC_API_KEY" && echo "key present" || echo "key missing"
```
Expected: `key present`. If `key missing`, set `ANTHROPIC_API_KEY` before continuing.

- [ ] **Step 2: Run a single scenario first (fastest + cheapest)**

```bash
node skills/aem/forms/evals-runner/run.js \
  --skill skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component \
  --scenario 01 \
  --no-baseline \
  --verbose
```
Expected: runs scenario 01, prints per-scenario verdict and a summary table. Exit code 0 if scenario passed.

- [ ] **Step 3: If scenario 01 passes, run all three**

```bash
node skills/aem/forms/evals-runner/run.js \
  --skill skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component \
  --no-baseline
```
Expected: three scenarios run; summary printed; exit code 0 if all three pass.

- [ ] **Step 4: If scenarios fail, iterate**

Failure modes to check before adjusting the runner:

| Symptom | Likely cause | Action |
|---|---|---|
| Validator `file_exists` fails on scaffolded files | Agent didn't run the scaffolder, or used wrong `--name` | Inspect `results/<id>/run.json` transcript; check whether SKILL.md rule was followed |
| `listenChanges` pattern not found | Agent didn't wire subscribe; SKILL.md rule 6 may be too subtle | Tighten the rubric item or refine the reference docs |
| Judge returns malformed JSON repeatedly | Rubric descriptions may be ambiguous or too long | Shorten and clarify criteria descriptions |
| `json_path_equals` fails on `fd:viewType` | Agent added it in a position the recursive walker doesn't see | Inspect form.json — should not occur since walker is recursive |
| `command_passes` flaky | Bash timeout, env issue | Check `timeout_ms` in config |

If the failures are real regressions in an intentional SKILL.md edit, stop and surface to the user. Otherwise adjust the scenario/rubric/fixture and rerun step 3.

- [ ] **Step 5: Once all three pass, approve baselines**

```bash
node skills/aem/forms/evals-runner/run.js \
  --skill skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component \
  --approve
```
Expected: writes `baseline/01-*.json`, `baseline/02-*.json`, `baseline/03-*.json`.

- [ ] **Step 6: Re-run without --approve to confirm no regression**

```bash
node skills/aem/forms/evals-runner/run.js \
  --skill skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component
```
Expected: summary says "No regressions detected.", exit code 0.

- [ ] **Step 7: Commit baselines**

```bash
git add skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component/evals/baseline/
git commit -m "feat(create-component/evals): capture initial baseline for 3 scenarios"
```

---

## Post-implementation verification

- [ ] All 9 runner-unit-test files pass: `cd skills/aem/forms/evals-runner && node --test test/`
- [ ] `run.js --help` prints usage
- [ ] Running the full scenario set against committed baseline exits 0 with "No regressions detected."
- [ ] Baseline files are committed; `results/` is not committed (gitignored by per-skill `.gitignore`)
- [ ] `form-repo` fixture contains no `node_modules/`, no scaffolded component dirs
- [ ] `evals-runner/` has no dependencies beyond `@anthropic-ai/sdk`

## Known follow-ups (not in scope for this plan)

- CI workflow wiring (GitHub Actions) — deferred per design spec.
- Additional leaf-skill evals (`add-rules`, `create-function`, `optimize-rules`, etc.) — next in DFS order.
- Richer JSONPath support — add when a scenario requires it.
- Agent-runtime provider for the Claude Agent SDK or a non-Anthropic provider — add when the need arrives; interface is already in place.
- IT suite at `skills/aem/forms/tests/` — after all leaf UTs exist.
