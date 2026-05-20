# Crispy-Garbanzo Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the skill-agnostic evals runner (and the shared `form-repo` fixture) out of `adobe-rnd/forms-skills` into the `anirudhaggar_adobe/crispy-garbanzo` benchmarking repo, so other skill/agent projects can consume the same runner.

**Architecture:** Publish crispy-garbanzo as a Node.js ESM package with a CLI bin, library modules, JSON schemas, and a `fixtures/aem/` tree. forms-skills depends on it via a `file:` path reference for now, keeps per-skill `evals.config.json`/`scenarios/`/`baseline/`, and deletes its local runner. A third fixture-lookup tier is added so scenarios can reference package-provided fixtures without knowing their absolute path.

**Tech Stack:** Node.js 20+, ESM modules, `@anthropic-ai/sdk`, `@anthropic-ai/bedrock-sdk`, Node's built-in test runner.

---

## Design Decisions (locked before tasks)

These are baked into the tasks below. Call them out if you disagree before execution.

1. **Single package, not a monorepo.** Layering into `core`/`runners/*` is YAGNI for current usage.
2. **Package name: `crispy-garbanzo`** (matches repo). Easy to rename later — only one `package.json` name field and one `file:` reference to update.
3. **Dependency mechanism: `file:` path reference.** `forms-skills/package.json` gets `"crispy-garbanzo": "file:../../anirudhaggar_adobe/crispy-garbanzo"` (relative from the forms-skills repo root, since the two checkouts sit as siblings under `~/Documents/aem/codes/`). Swap to a git URL or published npm later.
4. **Scenarios remain JSON.** No YAML conversion in this plan (YAGNI).
5. **`form-repo` moves to `crispy-garbanzo/fixtures/aem/form-repo/`** verbatim. Scenarios keep `"fixture": "form-repo"` — no scenario edits.
6. **Fixture lookup gains a third tier.** After per-skill and plugin-root lookups fail, `resolveFixture` searches a list of `packageFixtureRoots` (directories that contain named fixture subdirs). The CLI auto-registers `<package-dir>/fixtures/aem`.
7. **Per-skill `evals/` stays put.** Config, scenarios, baseline, results all remain under each skill.
8. **Old `skills/aem/forms/evals-runner/` and `skills/aem/forms/evals-fixtures/` are deleted** after the consumer cutover succeeds.

---

## Repo Roles

Two repos are touched. Tasks note which repo each step runs in.

- **GARBANZO** = `/Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo`
- **FORMS** = `/Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills`

Each task is contained within one repo so commits don't straddle boundaries.

---

## Target File Structure

### Crispy-garbanzo after extraction

```
crispy-garbanzo/
├── bin/
│   └── crispy-garbanzo.js          # CLI entry — parses args, drives runScenario loop
├── lib/
│   ├── agent-harness.js            # runAgent + buildSystemPrompt
│   ├── baseline.js                 # diffBaseline + approve
│   ├── judge.js                    # runJudge (LLM-as-judge)
│   ├── load-scenarios.js           # loadScenarios with schema validation
│   ├── report.js                   # formatSummary, writeScenarioArtifacts, writeSummary
│   ├── schema-validate.js          # minimal JSON Schema validator
│   ├── scorecard.js                # buildScorecard
│   ├── validators.js               # file_exists, file_contains, file_not_contains, json_path_equals, command_passes
│   ├── workspace.js                # findPluginRoot, resolveFixture, seedWorkspace, teardownWorkspace
│   └── providers/
│       ├── anthropic.js
│       ├── bedrock.js
│       ├── index.js
│       └── stub.js
├── schemas/
│   ├── config.schema.json
│   └── scenario.schema.json
├── fixtures/
│   └── aem/
│       └── form-repo/              # moved from FORMS/skills/aem/forms/evals-fixtures/
│           ├── .gitignore
│           ├── code/
│           │   ├── blocks/form/mappings.js
│           │   ├── blocks/form/form.js
│           │   ├── package.json
│           │   └── scripts/create-custom-component.js
│           └── form.json
├── test/
│   ├── agent-harness.test.js
│   ├── baseline.test.js
│   ├── fixtures/                   # unchanged (plugin-root/ synthetic test fixture)
│   ├── judge.test.js
│   ├── load-scenarios.test.js
│   ├── schema-validate.test.js
│   ├── scorecard.test.js
│   ├── smoke.test.js
│   ├── validators.test.js
│   └── workspace.test.js
├── docs/architecture/...           # already exists, unchanged
├── package.json
├── .envrc.example
├── .gitignore
└── README.md
```

### forms-skills after cutover

```
forms-skills/
├── package.json                    # new, at repo root: depends on crispy-garbanzo via file:
├── skills/aem/forms/
│   ├── evals-runner/               # DELETED
│   ├── evals-fixtures/             # DELETED
│   └── forms-orchestrator/
│       └── ...create-component/evals/
│           ├── evals.config.json   # unchanged
│           ├── scenarios/*.json    # unchanged
│           ├── baseline/*.json     # unchanged
│           └── results/            # runtime, gitignored
```

---

## File-Level Responsibilities (unchanged from current runner)

All `lib/*.js` files keep their current single-responsibility boundaries. The only semantic change is in `workspace.js` (adds a third fixture-lookup tier). The only structural change is moving the CLI entry from `run.js` → `bin/crispy-garbanzo.js` and adjusting relative imports.

---

# Phase A: Stand up the crispy-garbanzo package (GARBANZO repo)

### Task 1: Initialize package manifest

**Repo:** GARBANZO
**Files:**
- Create: `crispy-garbanzo/package.json`
- Create: `crispy-garbanzo/.gitignore`
- Create: `crispy-garbanzo/.envrc.example`

- [ ] **Step 1: Create `package.json`**

Create `crispy-garbanzo/package.json`:

```json
{
  "name": "crispy-garbanzo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Benchmarking and evals runner for skills, tools, and agents.",
  "bin": {
    "crispy-garbanzo": "./bin/crispy-garbanzo.js"
  },
  "scripts": {
    "test": "node --test test/"
  },
  "dependencies": {
    "@anthropic-ai/bedrock-sdk": "^0.28.1",
    "@anthropic-ai/sdk": "^0.30.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

Create `crispy-garbanzo/.gitignore`:

```
node_modules/
.envrc
*.log
.DS_Store
```

- [ ] **Step 3: Create `.envrc.example`**

Create `crispy-garbanzo/.envrc.example` by copying the existing one from FORMS:

```bash
cp /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/skills/aem/forms/evals-runner/.envrc.example /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/.envrc.example
```

- [ ] **Step 4: Install dependencies and verify the package parses**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
npm install
node -e "import('./package.json', { with: { type: 'json' } }).then(m => console.log(m.default.name))"
```

Expected output: `crispy-garbanzo`

- [ ] **Step 5: Commit**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
git add package.json package-lock.json .gitignore .envrc.example
git commit -m "chore: initialize crispy-garbanzo package manifest"
```

---

### Task 2: Move schemas

**Repo:** GARBANZO
**Files:**
- Create: `crispy-garbanzo/schemas/config.schema.json`
- Create: `crispy-garbanzo/schemas/scenario.schema.json`

- [ ] **Step 1: Copy schemas verbatim**

```bash
mkdir -p /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/schemas
cp /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/skills/aem/forms/evals-runner/schemas/config.schema.json /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/schemas/
cp /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/skills/aem/forms/evals-runner/schemas/scenario.schema.json /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/schemas/
```

- [ ] **Step 2: Verify both files exist and parse as JSON**

```bash
node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('/Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/schemas/config.schema.json'))))"
node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('/Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/schemas/scenario.schema.json'))))"
```

Expected: both print `[ '$schema', 'type', 'required', 'properties', ... ]` or similar top-level keys without errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
git add schemas/
git commit -m "chore: import JSON schemas from forms-skills evals-runner"
```

---

### Task 3: Move lib/ verbatim (no code changes)

**Repo:** GARBANZO
**Files:**
- Create: `crispy-garbanzo/lib/` (whole tree from FORMS)

- [ ] **Step 1: Copy the entire lib/ tree**

```bash
cp -R /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/skills/aem/forms/evals-runner/lib /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/
```

- [ ] **Step 2: Verify the file list matches**

```bash
ls /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/lib/
ls /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/lib/providers/
```

Expected `lib/` contents: `agent-harness.js baseline.js judge.js load-scenarios.js providers report.js schema-validate.js scorecard.js validators.js workspace.js`
Expected `lib/providers/` contents: `anthropic.js bedrock.js index.js stub.js`

- [ ] **Step 3: Sanity-check an import resolves**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
node -e "import('./lib/validators.js').then(m => console.log(Object.keys(m)))"
```

Expected: `[ 'runValidators' ]` (or similar — non-empty export list, no module resolution errors).

- [ ] **Step 4: Commit**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
git add lib/
git commit -m "chore: import runner library modules from forms-skills"
```

---

### Task 4: Move tests verbatim and make the suite pass

**Repo:** GARBANZO
**Files:**
- Create: `crispy-garbanzo/test/` (whole tree from FORMS, including `test/fixtures/`)

- [ ] **Step 1: Copy the entire test/ tree**

```bash
cp -R /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/skills/aem/forms/evals-runner/test /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/
```

- [ ] **Step 2: Run the existing suite — all tests should pass unchanged**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
npm test
```

Expected: all tests pass (same count as in FORMS). The test files import from `../lib/...` which is still correct since `test/` and `lib/` are siblings under the new package root.

- [ ] **Step 3: Commit**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
git add test/
git commit -m "chore: import unit tests from forms-skills evals-runner"
```

---

### Task 5: Add the CLI bin entry

**Repo:** GARBANZO
**Files:**
- Create: `crispy-garbanzo/bin/crispy-garbanzo.js`

- [ ] **Step 1: Copy `run.js` to `bin/crispy-garbanzo.js` and fix relative imports**

The source imports use `./lib/...`. After the move, the bin script sits one level deeper, so imports become `../lib/...`. Create `crispy-garbanzo/bin/crispy-garbanzo.js` by hand (do not blind-copy) with exactly this content:

```javascript
#!/usr/bin/env node
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadScenarios } from '../lib/load-scenarios.js';
import { resolveFixture, seedWorkspace, teardownWorkspace } from '../lib/workspace.js';
import { runValidators } from '../lib/validators.js';
import { runAgent } from '../lib/agent-harness.js';
import { runJudge } from '../lib/judge.js';
import { buildScorecard } from '../lib/scorecard.js';
import { diffBaseline, approve } from '../lib/baseline.js';
import { formatSummary, writeScenarioArtifacts, writeSummary } from '../lib/report.js';
import { getAgentProvider, getJudgeProvider } from '../lib/providers/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');
const DEFAULT_PACKAGE_FIXTURE_ROOTS = [path.join(PKG_ROOT, 'fixtures', 'aem')];

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
  console.log(`Usage: crispy-garbanzo --skill <path> [options]

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
    timeout_ms: raw.timeout_ms || 180_000,
    fixtureRoots: Array.isArray(raw.fixtureRoots) ? raw.fixtureRoots : []
  };
}

async function runScenario({ scenario, skillDir, resultsDir, config, agentProvider, judgeProvider, packageFixtureRoots, verbose }) {
  const attempts = config.retry.attempts;
  const fixturePath = await resolveFixture({
    skillDir,
    fixtureName: scenario.workspace.fixture,
    packageFixtureRoots
  });

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

  const packageFixtureRoots = [
    ...config.fixtureRoots.map(r => path.resolve(skillDir, r)),
    ...DEFAULT_PACKAGE_FIXTURE_ROOTS
  ];

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
      scenario, skillDir, resultsDir, config, agentProvider, judgeProvider, packageFixtureRoots, verbose: args.verbose
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

- [ ] **Step 2: Make the bin executable**

```bash
chmod +x /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/bin/crispy-garbanzo.js
```

- [ ] **Step 3: Verify the CLI loads and prints help**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
node bin/crispy-garbanzo.js --help
```

Expected: prints `Usage: crispy-garbanzo --skill <path> [options]` and the flags block, then exits 0.

Note: This step will still fail `resolveFixture` for scenarios using `form-repo` because the fixture isn't moved yet and `workspace.js` doesn't know about `packageFixtureRoots` yet. That's expected — Task 7 fixes that. Don't run with `--skill` yet.

- [ ] **Step 4: Commit**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
git add bin/
git commit -m "feat: add crispy-garbanzo CLI entry under bin/"
```

---

### Task 6: Move the `form-repo` fixture

**Repo:** GARBANZO
**Files:**
- Create: `crispy-garbanzo/fixtures/aem/form-repo/` (whole tree from FORMS)

- [ ] **Step 1: Copy form-repo into the package**

```bash
mkdir -p /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/fixtures/aem
cp -R /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/skills/aem/forms/evals-fixtures/form-repo /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/fixtures/aem/
```

- [ ] **Step 2: Verify the fixture files are all present**

```bash
find /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/fixtures/aem/form-repo -type f | sort
```

Expected:

```
/Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/fixtures/aem/form-repo/.gitignore
/Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/fixtures/aem/form-repo/code/blocks/form/form.js
/Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/fixtures/aem/form-repo/code/blocks/form/mappings.js
/Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/fixtures/aem/form-repo/code/package.json
/Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/fixtures/aem/form-repo/code/scripts/create-custom-component.js
/Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/fixtures/aem/form-repo/form.json
```

- [ ] **Step 3: Commit**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
git add fixtures/
git commit -m "chore: import AEM form-repo fixture from forms-skills"
```

---

### Task 7: Extend `resolveFixture` with a package-fixture-roots tier (TDD)

**Repo:** GARBANZO
**Files:**
- Modify: `crispy-garbanzo/lib/workspace.js:33-45`
- Modify: `crispy-garbanzo/test/workspace.test.js`
- Modify: `crispy-garbanzo/test/fixtures/plugin-root/` (add a package-fixtures subtree for the new test)

Context: Today `resolveFixture({ skillDir, fixtureName })` checks two locations. The CLI needs to also check a list of caller-supplied package fixture roots. The function signature becomes `resolveFixture({ skillDir, fixtureName, packageFixtureRoots })` where `packageFixtureRoots` is an optional array of directories; each is checked for a subdirectory matching `fixtureName`. Lookup order: per-skill → plugin-root → each entry in `packageFixtureRoots` (in order).

- [ ] **Step 1: Add a test fixture that simulates a package fixtures root**

```bash
mkdir -p /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/test/fixtures/pkg-fixtures/package-fix
echo 'from package' > /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo/test/fixtures/pkg-fixtures/package-fix/hello.txt
```

- [ ] **Step 2: Write the failing test**

Append to `crispy-garbanzo/test/workspace.test.js` (after the existing tests, before the `seedWorkspace` test):

```javascript
test('resolveFixture falls back to packageFixtureRoots after plugin lookup misses', async () => {
  const pkgRoot = path.join(__dirname, 'fixtures', 'pkg-fixtures');
  const resolved = await resolveFixture({
    skillDir: skillB,
    fixtureName: 'package-fix',
    packageFixtureRoots: [pkgRoot]
  });
  assert.equal(resolved, path.join(pkgRoot, 'package-fix'));
});

test('resolveFixture still prefers per-skill and plugin tiers over packageFixtureRoots', async () => {
  const pkgRoot = path.join(__dirname, 'fixtures', 'pkg-fixtures');
  const resolved = await resolveFixture({
    skillDir: skillB,
    fixtureName: 'shared-fix',
    packageFixtureRoots: [pkgRoot]
  });
  assert.equal(resolved, path.join(pluginRoot, 'evals-fixtures/shared-fix'));
});
```

- [ ] **Step 3: Run the test — confirm it fails**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
node --test test/workspace.test.js
```

Expected: the new `packageFixtureRoots` test fails with an error like `fixture "package-fix" not found. Checked: ...` because the current `resolveFixture` doesn't know about `packageFixtureRoots`.

- [ ] **Step 4: Update `resolveFixture` to accept and check `packageFixtureRoots`**

Edit `crispy-garbanzo/lib/workspace.js`. Replace the existing `resolveFixture` function (lines 33-45) with:

```javascript
export async function resolveFixture({ skillDir, fixtureName, packageFixtureRoots = [] }) {
  const checked = [];

  const local = path.join(skillDir, 'evals', 'fixtures', fixtureName);
  checked.push(local);
  try { await stat(local); return local; } catch {}

  const pluginRoot = await findPluginRoot(skillDir);
  if (pluginRoot) {
    const shared = path.join(pluginRoot, 'evals-fixtures', fixtureName);
    checked.push(shared);
    try { await stat(shared); return shared; } catch {}
  }

  for (const root of packageFixtureRoots) {
    const candidate = path.join(root, fixtureName);
    checked.push(candidate);
    try { await stat(candidate); return candidate; } catch {}
  }

  throw new Error(`fixture "${fixtureName}" not found. Checked:\n  ${checked.join('\n  ')}`);
}
```

- [ ] **Step 5: Run the test — confirm it passes and nothing else broke**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
npm test
```

Expected: all tests pass, including the two new ones.

- [ ] **Step 6: Commit**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
git add lib/workspace.js test/workspace.test.js test/fixtures/pkg-fixtures/
git commit -m "feat: resolveFixture checks packageFixtureRoots after plugin lookup"
```

---

### Task 8: End-to-end smoke — point the CLI at the real create-component skill

**Repo:** GARBANZO (invokes FORMS read-only)
**Files:**
- None modified — this is a validation step only.

- [ ] **Step 1: Run a stub-provider scenario to confirm CLI wiring**

The stub provider ships with the package and requires no API keys. Use it to confirm the CLI can drive one of the real scenarios end-to-end with the new fixture lookup.

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
EVAL_AGENT_PROVIDER=stub EVAL_JUDGE_PROVIDER=stub node bin/crispy-garbanzo.js \
  --skill /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component \
  --scenario 01-happy-path \
  --no-baseline \
  --verbose
```

Expected:
- `resolveFixture` succeeds (no "fixture not found" error) — it locates `form-repo` via the new `packageFixtureRoots` tier.
- Agent runs under the stub provider (no network calls).
- Exits non-zero because the stub agent can't actually produce valid output, but the validator table in the summary lists `validator:file_exists(...)` etc. — confirming the full pipeline executed.

- [ ] **Step 2: No commit — this is validation only.**

---

# Phase B: Consume crispy-garbanzo from forms-skills (FORMS repo)

### Task 9: Add crispy-garbanzo as a file-path dependency

**Repo:** FORMS
**Files:**
- Create: `forms-skills/package.json`
- Create: `forms-skills/.gitignore` entry for `node_modules/`

- [ ] **Step 1: Check whether forms-skills already has a root `package.json`**

```bash
ls /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/package.json 2>/dev/null && echo "exists" || echo "missing"
```

If it exists, skip Step 2 and go to Step 3 to add the dependency. If it's missing, continue with Step 2.

- [ ] **Step 2: Create the root `package.json` (only if missing)**

Create `/Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/package.json`:

```json
{
  "name": "forms-skills",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "evals": "crispy-garbanzo"
  },
  "devDependencies": {
    "crispy-garbanzo": "file:../../anirudhaggar_adobe/crispy-garbanzo"
  },
  "engines": {
    "node": ">=20"
  }
}
```

If Step 1 said "exists", instead edit the existing `package.json` to add the `devDependencies` entry and `scripts.evals` entry shown above. Do not overwrite other fields.

- [ ] **Step 3: Ensure `node_modules/` is gitignored at the repo root**

```bash
grep -qE '^node_modules/?$' /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/.gitignore 2>/dev/null || echo 'node_modules/' >> /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/.gitignore
```

- [ ] **Step 4: Install**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills
npm install
```

Expected: `npm install` completes with no errors. `node_modules/crispy-garbanzo` is a symlink (or a copy on some systems) pointing at the sibling checkout.

- [ ] **Step 5: Verify the bin is callable**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills
npx crispy-garbanzo --help
```

Expected: prints the help text from Task 5.

- [ ] **Step 6: Commit**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills
git add package.json package-lock.json .gitignore
git commit -m "chore: depend on crispy-garbanzo via file: path for evals"
```

---

### Task 10: Cut the create-component skill over to the new runner

**Repo:** FORMS
**Files:**
- None modified — this task validates that the per-skill `evals.config.json` and scenarios work unchanged against the new runner.

- [ ] **Step 1: Run the create-component scenarios through the new CLI**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills
npx crispy-garbanzo \
  --skill skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component \
  --no-baseline
```

Expected: same scenario verdicts as the last baseline run (scenarios 02, 03, 04 pass; 01 fails on the `listenChanges` validator — that's the accepted-as-honest-signal baseline). The run should complete without any "fixture not found" errors, confirming the package-provided `form-repo` resolves correctly.

- [ ] **Step 2: Compare the summary to the existing baseline to confirm no regressions**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills
npx crispy-garbanzo \
  --skill skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component
```

Expected: exit code 0 (no regressions) or 1 (only if one of the currently-passing scenarios flipped to fail). If exit is 1 with a scenario that used to pass, investigate before proceeding — do not move to Task 11. If exit is 0 or is 1 only because of the already-failing scenario 01 (not listed as a regression), proceed.

- [ ] **Step 3: No commit.** This is validation only.

---

### Task 11: Delete the old evals-runner directory

**Repo:** FORMS
**Files:**
- Delete: `forms-skills/skills/aem/forms/evals-runner/`

- [ ] **Step 1: Delete the directory**

```bash
rm -rf /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/skills/aem/forms/evals-runner
```

- [ ] **Step 2: Verify the replacement still works end-to-end**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills
npx crispy-garbanzo \
  --skill skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component \
  --scenario 04 \
  --no-baseline
```

Expected: the single scenario runs successfully, exits 0 (it's a currently-passing scenario in the baseline). No reference to the deleted `skills/aem/forms/evals-runner/` path appears in any error.

- [ ] **Step 3: Commit the removal**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills
git add -A skills/aem/forms/evals-runner
git commit -m "chore: remove skill-local evals-runner (replaced by crispy-garbanzo dependency)"
```

---

### Task 12: Delete the moved `evals-fixtures/` directory

**Repo:** FORMS
**Files:**
- Delete: `forms-skills/skills/aem/forms/evals-fixtures/`

- [ ] **Step 1: Delete the directory**

```bash
rm -rf /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/skills/aem/forms/evals-fixtures
```

- [ ] **Step 2: Re-run one scenario to confirm the fixture now resolves via the package**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills
npx crispy-garbanzo \
  --skill skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component \
  --scenario 04 \
  --no-baseline
```

Expected: scenario runs successfully, using `form-repo` resolved from `crispy-garbanzo/fixtures/aem/form-repo/` via the `packageFixtureRoots` tier. Exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills
git add -A skills/aem/forms/evals-fixtures
git commit -m "chore: remove form-repo fixture (now provided by crispy-garbanzo package)"
```

---

# Phase C: Documentation

### Task 13: Write crispy-garbanzo README

**Repo:** GARBANZO
**Files:**
- Modify: `crispy-garbanzo/README.md`

- [ ] **Step 1: Replace the one-line README with usage docs**

Overwrite `crispy-garbanzo/README.md` with:

````markdown
# crispy-garbanzo

Benchmarking and evals runner for skills, tools, and agents. Runs a target against a set of scenarios in isolated workspaces, records validator + rubric outcomes, and compares to a baseline.

## Install (local-path consumer)

In a consuming repo (e.g. `forms-skills`):

```bash
npm install --save-dev file:../relative/path/to/crispy-garbanzo
```

## Usage

```bash
npx crispy-garbanzo --skill <path-to-skill-dir>
```

Options:

- `--skill <path>` — path to a skill directory containing `SKILL.md` and `evals/`
- `--scenario <id>` — run only scenarios whose id contains the substring
- `--filter <substr>` — alias for `--scenario`
- `--approve` — copy current results into `evals/baseline/`
- `--no-baseline` — skip baseline comparison
- `--verbose` — stream agent turns to stdout
- `--help` — show this help

## Expected skill layout

```
<skill-dir>/
├── SKILL.md
├── references/*.md (optional)
└── evals/
    ├── evals.config.json
    ├── scenarios/*.json
    └── baseline/*.json (optional)
```

## Fixture lookup order

Scenarios reference a fixture by name (e.g. `"fixture": "form-repo"`). The runner resolves it by checking, in order:

1. `<skill>/evals/fixtures/<name>` — per-skill override
2. `<plugin-root>/evals-fixtures/<name>` — shared pool in the consuming plugin
3. Any directory listed in `evals.config.json` `fixtureRoots` (relative to the skill dir)
4. `<crispy-garbanzo-pkg>/fixtures/aem/<name>` — fixtures shipped with the package

## Environment variables

- `ANTHROPIC_API_KEY` — for the `anthropic` provider
- `AWS_BEARER_TOKEN_BEDROCK` — for the `bedrock` provider
- `EVAL_AGENT_PROVIDER`, `EVAL_AGENT_MODEL` — override config agent
- `EVAL_JUDGE_PROVIDER`, `EVAL_JUDGE_MODEL` — override config judge
- `EVAL_ATTEMPTS` — override retry count

See `docs/architecture/benchmark-framework-spec.md` for the longer-term design direction.
````

- [ ] **Step 2: Commit**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/anirudhaggar_adobe/crispy-garbanzo
git add README.md
git commit -m "docs: usage guide for crispy-garbanzo runner"
```

---

### Task 14: Document the consumer setup in forms-skills

**Repo:** FORMS
**Files:**
- Create: `forms-skills/skills/aem/forms/evals.md`

- [ ] **Step 1: Write the consumer-side notes**

Create `forms-skills/skills/aem/forms/evals.md`:

````markdown
# Running AEM Forms skill evals

The evals runner lives in the [`crispy-garbanzo`](../../../../anirudhaggar_adobe/crispy-garbanzo) sibling repo and is installed here as a `file:` dependency.

## One-time setup

```bash
npm install
```

This installs `crispy-garbanzo` from `../../anirudhaggar_adobe/crispy-garbanzo` (relative to this repo root).

## Run a skill's evals

```bash
npx crispy-garbanzo --skill <path-to-skill-dir>
```

Example — create-component:

```bash
npx crispy-garbanzo \
  --skill skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component
```

## Approve current results as the new baseline

```bash
npx crispy-garbanzo --skill <path> --approve
```

## Where things live

- Per-skill config, scenarios, and baseline: `<skill>/evals/`
- Shared AEM fixtures (e.g. `form-repo`): ship with `crispy-garbanzo` under `fixtures/aem/`
- Runner code and CLI: in `crispy-garbanzo`
````

- [ ] **Step 2: Commit**

```bash
cd /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills
git add skills/aem/forms/evals.md
git commit -m "docs: point to crispy-garbanzo for AEM forms skill evals"
```

---

## Post-execution checklist

- [ ] Both `npm test` (GARBANZO) passes
- [ ] `npx crispy-garbanzo --skill <create-component>` (FORMS) produces the same verdicts as the prior baseline
- [ ] `skills/aem/forms/evals-runner/` and `skills/aem/forms/evals-fixtures/` are gone from FORMS
- [ ] `crispy-garbanzo/fixtures/aem/form-repo/` and `crispy-garbanzo/bin/crispy-garbanzo.js` exist in GARBANZO
- [ ] Both repos have green commits — no amended or squashed history

## Rollback strategy

If consumer cutover (Task 10) reveals an unfixable regression, roll back Phase B only:

```bash
cd /Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills
git revert <task-11-sha> <task-12-sha> <task-9-sha>
```

Phase A (GARBANZO) stays — the extracted package doesn't affect FORMS behavior until it's depended on.
