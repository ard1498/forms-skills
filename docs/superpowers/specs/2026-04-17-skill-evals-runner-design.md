# Skill Evals Runner — Design Spec

## Purpose

Detect behavioral regressions in AEM Forms skills when their `SKILL.md`, references, or scripts change. The runner answers one question per scenario:

> After this edit, does an agent using the skill still behave at least as well as it did before?

The first implementation targets a single leaf skill (`create-component`) with a shared runner reusable across all forms skills. Cross-skill orchestration checks are out of scope — they belong to a later integration-test suite.

## Scope

### In scope (MVP)

- Shared runner at `skills/aem/forms/evals-runner/`.
- Colocated `evals/` per leaf skill, starting with `create-component`.
- Three scenarios for `create-component`, covering happy path, non-trivial base type, and clarification behavior.
- Hybrid scoring: deterministic artifact validators + LLM-judge rubric.
- Baseline-diff regression detection with explicit `--approve` flow.
- Anthropic SDK provider behind a provider-neutral interface.
- Local execution only. No CI wiring in this iteration.

### Out of scope

- Integration tests across multiple skills.
- Benchmarking (aggregate performance metrics, regression gates on speed) — emerges later as a side-effect of the IT suite.
- Non-Anthropic provider implementations. Interface is in place; implementations are future work.
- Auto-approval of baselines. Baselines must be committed explicitly per change.

## Terminology

| Term | Meaning | Java analogue |
|---|---|---|
| **UT / evals** | Per-skill, isolated regression checks | JUnit tests next to the class under test |
| **IT / suite** | Cross-skill flows through orchestrator (future) | Spring integration tests |
| **Scenario** | One evaluation case — user message + validators + rubric | `@Test` method |
| **Validator** | Deterministic check (file exists, contains, schema valid) | `assertEquals` |
| **Rubric** | LLM-judge criteria evaluated against the transcript | soft behavioral assertion |
| **Baseline** | Last-accepted scorecard, committed to git | approved test output snapshot |
| **Verdict** | `pass` / `fail` per scenario after all retries | test result |

The field name `rubric` lives in scenario JSON only. The judge model never sees it — the runner constructs a model-agnostic prompt that asks the judge to evaluate a transcript against a list of criteria.

## Architecture

### Directory layout

```
skills/aem/forms/
  evals-runner/
    package.json              # @anthropic-ai/sdk
    run.js                    # CLI entry
    lib/
      load-scenarios.js
      workspace.js
      agent-harness.js
      validators.js
      judge.js
      scorecard.js
      baseline.js
      report.js
      providers/
        index.js              # getProvider()
        anthropic.js          # AgentProvider + JudgeProvider impl
    schemas/
      scenario.schema.json    # JSON Schema; enforced at load time
      config.schema.json
    test/                     # runner self-tests (node:test)

  evals-fixtures/             # shared fixture pool — plugin-level test data
    form-repo/                # minimal executable EDS forms boilerplate
      .gitignore              # node_modules/, dist/, .cache/, *.log, etc.
      code/
        package.json
        package-lock.json
        scripts/
        blocks/form/
      form.json
    # additional variants added as other leaf skills need them

  forms-orchestrator/.../create-component/
    evals/
      evals.config.json
      scenarios/
        01-happy-path-countdown.json
        02-extend-checkbox-group.json
        03-ambiguous-base-requests-clarification.json
      fixtures/               # per-skill overrides; usually empty
      baseline/               # last-accepted score.json per scenario
      results/                # gitignored; per-run outputs
```

Rationale for locating shared fixtures at the plugin root (not under `evals-runner/`): fixtures are test data, not runner code. Keeping them at the plugin root decouples them from any particular test harness — the future IT suite under `skills/aem/forms/tests/` will consume the same pool without reaching into the runner's directory.

### Module responsibilities

Each module has one concern, explicit inputs, typed return. No shared mutable state.

| Module | Responsibility |
|---|---|
| `load-scenarios.js` | Discover scenarios under `<skill>/evals/scenarios/`, validate against JSON Schema, resolve fixture paths |
| `workspace.js` | Create temp dir, copy fixture, run cached `npm install` if needed, teardown on exit |
| `agent-harness.js` | Build system prompt from `SKILL.md` + references, run agent loop via provider, capture transcript |
| `validators.js` | Registry of validator types; each takes `(workspacePath, config) → {passed, reason}` |
| `judge.js` | Build judge prompt, call judge provider, parse JSON response (with one reprompt on parse failure) |
| `scorecard.js` | Combine validator + rubric outcomes into verdict; write `score.json` |
| `baseline.js` | Diff current run against `baseline/`, classify regressions, implement `--approve` |
| `report.js` | Emit `summary.md` and stdout table |
| `providers/*` | Provider-specific agent loop and judge call; normalize to shared transcript shape |

### Runner pipeline

```
  load-scenarios
        ↓
  for each scenario (up to EVAL_ATTEMPTS):
    workspace.seed
    agent-harness.run        ← provider.runAgentLoop
    validators.run
    judge.score              ← provider.judge
    scorecard.build
    if verdict == pass: break
    else: workspace.teardown, retry
        ↓
  baseline.diff
        ↓
  report.write  →  exit 0 / 1 / 2
```

## Scenario schema

```json
{
  "id": "01-happy-path-countdown",
  "description": "Scaffolds a countdown-timer custom component extending datetime, registers it, and wires subscribe correctly.",
  "userMessage": "Add a countdown timer field to the form — should count down to a target date and extend the existing datetime field.",

  "workspace": {
    "fixture": "form-repo"
  },

  "agent": {
    "maxTurns": 20,
    "allowedTools": ["bash", "Read", "Write", "Edit", "Glob", "Grep"],
    "mockedTools": {}
  },

  "validators": [
    { "type": "file_exists", "path": "code/blocks/form/components/countdown-timer/countdown-timer.js" },
    { "type": "file_exists", "path": "code/blocks/form/components/countdown-timer/countdown-timer.css" },
    { "type": "file_exists", "path": "code/blocks/form/components/countdown-timer/_countdown-timer.json" },
    { "type": "file_contains", "path": "code/blocks/form/mappings.js", "pattern": "countdown-timer" },
    { "type": "json_path_equals", "path": "form.json", "jsonPath": "$..['fd:viewType']", "expected": "countdown-timer" },
    { "type": "file_contains", "path": "code/blocks/form/components/countdown-timer/countdown-timer.js", "pattern": "listenChanges\\s*:\\s*true" }
  ],

  "rubric": [
    { "id": "uses-scaffold-command", "description": "Agent invokes `npm run create:custom-component -- --name countdown-timer --base datetime` rather than creating files by hand.", "required": true },
    { "id": "uses-listen-changes", "description": "Subscribe call in countdown-timer.js includes `{ listenChanges: true }`.", "required": true },
    { "id": "extends-not-replaces", "description": "decorate() modifies the provided fieldDiv rather than rebuilding HTML from scratch.", "required": true },
    { "id": "reads-html-structure-ref", "description": "Agent consults references/field-html-structure.md before writing decorate().", "required": false }
  ]
}
```

### Validator types (MVP)

| Type | Config | Check |
|---|---|---|
| `file_exists` | `path` | File exists under workspace |
| `file_contains` | `path`, `pattern` (regex) | File matches pattern |
| `file_not_contains` | `path`, `pattern` | File does not match pattern |
| `json_path_equals` | `path`, `jsonPath`, `expected` | JSONPath query against file returns expected value |
| `command_passes` | `command`, `cwd` | Command exits 0 |

All validators accept `required` (default `true`) and `name` (optional label for reports).

### Rubric criteria

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Short kebab-case identifier |
| `description` | yes | What the judge should check. Specific and unambiguous. |
| `required` | no (default true) | Whether failing this criterion blocks the scenario |

## Runner internals

### Provider interface

```javascript
// lib/providers/index.js
function getProvider(name) { /* returns { AgentProvider, JudgeProvider } */ }

// AgentProvider
async runAgentLoop({ systemPrompt, userMessage, tools, maxTurns, toolDispatch }) {
  return {
    turns: [
      { role: "assistant", text, toolCalls },
      { role: "tool_result", toolCallId, content }
    ],
    stopReason: "end_turn" | "max_turns" | "error",
    error?: string
  };
}

// JudgeProvider
async judge({ systemPrompt, userMessage, transcript, criteria }) {
  return { results: [{ id, passed, reason }], parseError?: string };
}
```

MVP ships one implementation at `lib/providers/anthropic.js`. Additional providers (OpenAI, Google) are future work; no core runner changes needed to add them.

### System prompt construction

```javascript
const skillFiles = [
  path.join(skillDir, 'SKILL.md'),
  ...glob.sync(path.join(skillDir, 'references/**/*.md'))
];
const systemPrompt = skillFiles
  .map(p => `=== ${path.relative(skillDir, p)} ===\n${fs.readFileSync(p, 'utf8')}`)
  .join('\n\n');
```

`SKILL.md` and every reference file. Scripts are not inlined; the agent reads and executes them via tools, matching production behavior.

### Tool exposure and dispatch

`scenario.agent.allowedTools` is the full set of tools declared to the agent. Anything not listed is never exposed — the agent cannot call it. `scenario.agent.mockedTools` is a subset of `allowedTools` whose names map to canned responses.

Dispatch for a `tool_use` from the agent:

| Tool | Behavior |
|---|---|
| `bash` (when in `allowedTools`) | Real `execSync`, scoped to the scenario temp workspace |
| `Read`, `Write`, `Edit`, `Glob`, `Grep` (when in `allowedTools`) | Real filesystem ops, paths resolved relative to temp workspace |
| Any name present in `scenario.agent.mockedTools` | Return the configured mock response |
| Any other declared tool with no mock | Return error tool_result ("tool not configured") |

The workspace sandbox is enforced in the dispatcher: paths that escape the temp dir are rejected.

### Judge prompt

Model-agnostic. Does not contain the word "rubric."

```
You are evaluating an AI agent's behavior on a task.

<user_request>
{userMessage}
</user_request>

<transcript>
{formatted transcript — assistant messages, tool calls, tool results}
</transcript>

For each criterion below, return a JSON array with entries {id, passed, reason}.
Criteria:
1. {criteria[0].description}
2. {criteria[1].description}
...

Return ONLY the JSON array, no prose.
```

Response parsed with a tolerant JSON extractor. On parse failure, one inline reprompt ("return only a JSON array"). Second failure → scenario fails with `requiredFailures: ["judge_error"]`.

### Optimistic retry

Scenario-level. Default `EVAL_ATTEMPTS=2`. The scenario passes on the first attempt where every `required: true` validator and rubric item passes. Workspace is re-seeded between attempts — no state leakage.

### Scorecard

```json
{
  "scenarioId": "01-happy-path-countdown",
  "attempts": 1,
  "verdict": "pass",
  "duration_ms": 47321,
  "validators": [
    { "type": "file_exists", "path": "...", "passed": true, "required": true }
  ],
  "rubric": [
    { "id": "uses-scaffold-command", "passed": true, "reason": "Agent ran npm run create:custom-component at turn 3.", "required": true }
  ],
  "requiredFailures": []
}
```

`verdict = pass` iff no `required: true` item failed on the successful attempt. Otherwise `fail`.

### Baseline diff

**Two modes:**

| Mode | Command | Effect |
|---|---|---|
| `run` (default) | `node run.js --skill <path>` | Compare current run against `baseline/`; exit 1 on regression |
| `approve` | `node run.js --skill <path> --approve` | Copy current `results/<id>/score.json` → `baseline/<id>.json` |

**Regression rules (per scenario):**

1. Verdict flipped `pass` → `fail` → regression.
2. Scenario exists in `baseline/` but is missing in current results (scenario removed or failed to run) → regression.

When a regression is reported, `summary.md` lists every `required` validator or rubric item whose `passed` flipped from `true` → `false`, with the judge's reason text, so the cause is visible without re-running.

**Not regressions:**

- Judge `reason` text changing while pass/fail outcome stays the same.
- Non-required rubric items flipping.
- Duration changes.
- Scenarios present in current results that are absent from baseline (treated as new scenarios; their outcome is reported but doesn't count as regression).

Baselines are committed to git in the same PR as the skill change. No auto-approval.

## Workspace lifecycle

### Fixture resolution

Scenarios reference fixtures by name only: `"workspace": { "fixture": "form-repo" }`. The runner resolves the name against two locations, in order (local wins, Maven/npm style):

1. `<skill>/evals/fixtures/<name>/` — per-skill override.
2. `<plugin-root>/evals-fixtures/<name>/` — shared pool.

Plugin root is discovered by walking up from the skill directory until a `.claude-plugin/plugin.json` is found — the same mechanism the plugin system uses. No config needed.

If neither path exists, the runner exits with code 2 and an error listing both paths it checked.

Per-skill overrides are rare. Most leaf skills share `form-repo`. Variants (e.g., `form-repo-with-rules`) live in the shared pool when multiple skills would reuse them.

### Per scenario attempt

1. Create temp dir at `os.tmpdir()/skill-evals/<scenarioId>-<attempt>-<random>/`.
2. Copy resolved fixture into the temp dir (deep copy, preserve executable bits).
3. If fixture has a `package.json` and install marker, run `npm install` — cached via `package-lock.json` content hash under `os.tmpdir()/skill-evals/cache/`.
4. Pass the temp-dir path to agent harness and validators as their working root.
5. After scorecard written:
   - If scenario failed: `tar czf results/<id>/workspace.tar.gz <tempdir>` for debugging.
   - If scenario passed: skip archive.
6. Delete temp dir. Cleanup registered on `exit`, `SIGINT`, `SIGTERM`.

### Fixture gitignore convention

Each fixture directory ships a `.gitignore` that excludes generated artifacts so a developer experimenting locally (e.g., running `npm install` inside the fixture to verify it works) doesn't pollute the committed tree:

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

Committed contents are the source tree only: `package.json`, `package-lock.json`, hand-written scripts, seed block files, and the seed `form.json`. Anything derived (`node_modules/`, build output) and anything the agent creates during a scenario (scaffolded component dirs) stays out of the committed fixture.

## Configuration

### Precedence

CLI flags > environment variables > `evals.config.json` > runner defaults.

### `evals.config.json` (per skill)

```json
{
  "agent": {
    "provider": "anthropic",
    "model": "claude-haiku-4-5-20251001",
    "maxTurns": 20
  },
  "judge": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6"
  },
  "retry": {
    "attempts": 2
  },
  "timeout_ms": 180000
}
```

All keys optional. Unspecified keys fall back.

### Environment variables

| Variable | Overrides |
|---|---|
| `EVAL_AGENT_MODEL` | `agent.model` |
| `EVAL_JUDGE_MODEL` | `judge.model` |
| `EVAL_ATTEMPTS` | `retry.attempts` |
| `ANTHROPIC_API_KEY` | Anthropic provider auth |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock auth |
| AWS credential chain | Bedrock SigV4 |

Auth detection order matches the eval-architecture doc: `ANTHROPIC_API_KEY` → `AWS_BEARER_TOKEN_BEDROCK` → AWS credential chain.

## CLI

```
node skills/aem/forms/evals-runner/run.js --skill <path> [options]

Options:
  --scenario <id>     Run a single scenario (default: all)
  --approve           Write current results to baseline/ after a successful run
  --no-baseline       Skip baseline comparison (useful when authoring new scenarios)
  --filter <substr>   Run scenarios whose id contains substring
  --verbose           Stream agent turns to stdout as they happen
```

### Exit codes

| Code | Meaning |
|---|---|
| 0 | All scenarios pass, no regressions |
| 1 | One or more scenarios regressed |
| 2 | Runner error (setup failure, config malformed, provider unauthorized) |

## MVP scenarios for `create-component`

| ID | Probes | Catches regression in |
|---|---|---|
| `01-happy-path-countdown` | Full scaffold + register + subscribe on datetime extension | Scaffold-command rule, mappings.js edit, subscribe wiring |
| `02-extend-checkbox-group` | Extension of a multi-value base type with children | HTML-structure reference consultation, child-subscription patterns |
| `03-ambiguous-base-requests-clarification` | User asks for "a custom date picker" without base type | Clarification behavior — agent must not guess a base |

All three share the `form-repo` fixture. Each defines at least one deterministic validator and at least three rubric items. Scenarios 1 and 2 run the full workflow to completion; scenario 3 asserts the agent stops before any mutation.

### Fixture: `form-repo`

A minimal executable form code tree checked into the shared pool at `skills/aem/forms/evals-fixtures/form-repo/`. Shared across all leaf skills whose evals need a form code repo to operate on (`create-component`, future `add-rules`, `create-function`, `optimize-rules`, `manage-apis`, etc.).

Contents:

- `code/package.json` with the `create:custom-component` script wired + dev dependencies declared
- `code/package-lock.json` pinning exact versions for reproducibility
- `code/scripts/create-custom-component.js` — the scaffolding helper invoked by `npm run create:custom-component`
- `code/blocks/form/mappings.js` with a seed (empty) `customComponents` array
- `code/blocks/form/` other essential block files the agent may read
- `form.json` with a small seed form definition
- `.gitignore` per the fixture gitignore convention

The fixture is small but real — the agent should be able to drive the full workflow inside it without external dependencies beyond `npm install` of the dev dependencies declared in its `package.json`. When another leaf skill needs a variant (e.g., a form with pre-existing rules for `add-rules` happy-path), the variant is added as a sibling under `evals-fixtures/` (e.g., `form-repo-with-rules/`), not copied into that skill's `fixtures/` directory.

## Error handling

| Situation | Verdict | Exit code |
|---|---|---|
| Agent hits `maxTurns` without `end_turn` | Scenario fails (retries consumed → regression if baseline passed) | 1 |
| Tool dispatch throws (bash error, file missing) | Returned to agent as error `tool_result` | — |
| Agent API error (5xx, rate limit) | Consumes one attempt; scenario fails if all attempts error | 1 |
| Judge API error after successful agent run | Scenario fails with `requiredFailures: ["judge_error"]` | 1 |
| Judge returns unparseable JSON | One inline reprompt; second failure → scenario fails | 1 |
| Workspace setup fails (fixture missing, disk full) | Runner error, scenario never runs | 2 |
| Config malformed | Runner error, no scenarios run | 2 |
| Scenario schema invalid | Runner error, no scenarios run | 2 |

No silent failures. Every failure produces either a verdict or a runner error.

## Runner self-tests

The runner decides whether other code works, so it must be trustworthy.

| Target | Approach |
|---|---|
| `lib/validators.js` | `node:test` unit tests with temp-dir fixtures |
| `lib/scorecard.js` | Unit tests on verdict computation across validator + rubric combinations |
| `lib/baseline.js` | Unit tests on diff logic (pass→fail, fail→pass, new failures, missing baseline) |
| `lib/agent-harness.js` | Integration test with a stub `AgentProvider` returning scripted tool_use sequences |
| `lib/judge.js` | Unit tests with stub `JudgeProvider` including JSON parse failure paths |

All run via `node --test skills/aem/forms/evals-runner/**/*.test.js`. No test framework dependency.

## Output artifacts (per run)

```
<skill>/evals/results/
  <scenarioId>/
    run.json              # userMessage, transcript, timings per attempt
    score.json            # validator + rubric outcomes, verdict
    report.md             # human-readable scenario summary
    workspace.tar.gz      # only if scenario failed
  summary.md              # table across all scenarios, baseline diff
```

`results/` is gitignored. Only `baseline/` is committed.

## Non-goals (reiterated)

- Not a performance benchmark. No latency gates, no throughput metrics, no aggregate scores.
- Not a cross-skill integration test. Each run exercises exactly one skill.
- Not a replacement for production telemetry. It runs in controlled workspaces with fixed fixtures.
- Not tied to Claude. Skills remain platform-agnostic; the runner is swap-ready via the provider interface.

## Open items for implementation

These are known details to resolve during implementation, not design-level uncertainties:

- Exact content of the `form-repo` fixture — derived from an existing Edge Delivery forms boilerplate.
- Regex for JSONPath support in `json_path_equals` — pick a small, dependency-free implementation or a minimal vendored one.
- Whether `npm install` caching should be eager (at runner startup) or lazy (first scenario that needs it). Default: lazy.

## Future work (explicitly deferred)

- IT / suite pipeline at `skills/aem/forms/tests/` covering cross-skill flows. Reuses scenario/validator/rubric vocabulary.
- CI wiring (GitHub Actions): script-eval parity + scheduled LLM evals with OIDC auth.
- Additional provider implementations (OpenAI, Google) behind the existing interface.
- Performance/benchmark layer emerging from the IT suite, aligned with the broader framework sketched in `crispy-garbanzo/docs/architecture/benchmark-framework-spec.md`.
- Evals for remaining leaf skills in DFS order: other `build` leaves → `logic`, `analysis`, `integration`, `infra`, `context` → domain ITs → `forms-orchestrator` IT.

## Success criteria

The MVP is done when:

1. A developer edits `create-component/SKILL.md` in a branch.
2. Running `node skills/aem/forms/evals-runner/run.js --skill <path-to-create-component>` executes the three MVP scenarios against a fresh fixture workspace each.
3. Output clearly reports pass/fail per scenario with judge reasoning and validator outcomes.
4. If behavior regressed against `baseline/`, exit code is 1 and the regression is identifiable from `summary.md` alone.
5. If the edit was intentional, `--approve` updates the baseline in one command, ready to commit.
6. The runner's own tests pass via `node --test`.
