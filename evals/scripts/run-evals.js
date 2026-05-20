#!/usr/bin/env node
/**
 * Script-level eval runner for forms-content-authoring.
 * Runs each scenario JSON file, executes the referenced bundle script with
 * fixture-backed args, and reports pass/fail against expected output + exit code.
 *
 * Usage:
 *   node evals/scripts/run-evals.js
 *   node evals/scripts/run-evals.js --filter find-field
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.resolve(__dirname, '../..');
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
const SCENARIOS_DIR = path.resolve(__dirname, '../scenarios');

const filterArg = process.argv.includes('--filter')
  ? process.argv[process.argv.indexOf('--filter') + 1]
  : null;

// ─── Scenario discovery ───────────────────────────────────────────────────────

function findScenarios(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findScenarios(full));
    else if (entry.name.endsWith('.json')) {
        try {
          const s = JSON.parse(fs.readFileSync(full, 'utf8'));
          if (s.type !== 'llm') results.push(full);
        } catch (_) { results.push(full); }
      }
  }
  return results.sort();
}

// ─── Arg resolution ───────────────────────────────────────────────────────────
// "@fixtures/<file>" → inline JSON string (for --content-model etc.)
// "fixture:<file>"   → absolute path (for --content-model-file etc.)
// anything else      → pass through as-is

function resolveArg(value) {
  if (typeof value !== 'string') return String(value);
  if (value.startsWith('@fixtures/')) {
    const p = path.join(FIXTURES_DIR, value.slice('@fixtures/'.length));
    return fs.readFileSync(p, 'utf8').trim();
  }
  if (value.startsWith('fixture:')) {
    return path.join(FIXTURES_DIR, value.slice('fixture:'.length));
  }
  return value;
}

// ─── Deep partial match ───────────────────────────────────────────────────────
// Returns null on match, or an error string on mismatch.
// Arrays: element-wise partial match (actual may have extra fields per element).
// Objects: partial match (actual may have extra keys).
// Primitives: exact equality.

function partialMatch(actual, expected, keyPath = '') {
  if (expected === null || expected === undefined) return null;
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return `${keyPath || 'root'}: expected array, got ${typeof actual}`;
    }
    for (let i = 0; i < expected.length; i++) {
      const err = partialMatch(actual[i], expected[i], `${keyPath || 'root'}[${i}]`);
      if (err) return err;
    }
    return null;
  }
  if (typeof expected === 'object') {
    for (const [k, v] of Object.entries(expected)) {
      const child = actual?.[k];
      const err = partialMatch(child, v, keyPath ? `${keyPath}.${k}` : k);
      if (err) return err;
    }
    return null;
  }
  // Primitive
  if (actual !== expected) {
    return `${keyPath || 'root'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
  }
  return null;
}

// ─── Run one scenario ─────────────────────────────────────────────────────────

function runScenario(scenarioFile) {
  const scenario = JSON.parse(fs.readFileSync(scenarioFile, 'utf8'));
  const scriptPath = path.join(SKILL_DIR, scenario.script);

  if (!fs.existsSync(scriptPath)) {
    return { ...scenario, passed: false, error: `script not found: ${scenario.script}` };
  }

  // Build argv: positional first, then named flags
  const argv = [];
  for (const val of scenario.positionalArgs || []) {
    argv.push(resolveArg(val));
  }
  for (const [flag, value] of Object.entries(scenario.args || {})) {
    argv.push(flag, resolveArg(value));
  }

  const nodeArgs = scriptPath.endsWith('.jsh') ? ['--experimental-require-module'] : [];
  const result = spawnSync('node', [...nodeArgs, scriptPath, ...argv], {
    encoding: 'utf8',
    timeout: 15000,
  });

  const exitCode = result.status ?? 1;
  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();

  const exitOk = exitCode === scenario.expectedExitCode;
  let outputError = null;

  if (scenario.expectedOutput !== undefined && exitOk) {
    let parsed;
    try { parsed = JSON.parse(stdout); } catch { parsed = stdout; }
    outputError = partialMatch(parsed, scenario.expectedOutput);
  }

  const passed = exitOk && outputError === null;
  return {
    id: scenario.id,
    description: scenario.description,
    passed,
    exitCode,
    expectedExitCode: scenario.expectedExitCode,
    outputError,
    stderr: stderr.slice(0, 300),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const allScenarios = findScenarios(SCENARIOS_DIR).filter(f =>
  !filterArg || f.includes(filterArg)
);

if (allScenarios.length === 0) {
  console.error('No scenarios found' + (filterArg ? ` matching "${filterArg}"` : ''));
  process.exit(1);
}

console.log(`\nRunning ${allScenarios.length} eval(s)...\n`);

let passed = 0;
let failed = 0;
const failures = [];

for (const file of allScenarios) {
  const result = runScenario(file);
  const rel = path.relative(SCENARIOS_DIR, file);
  if (result.passed) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m  ${rel}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m  ${rel}`);
    failures.push({ rel, result });
  }
}

if (failures.length > 0) {
  console.log('\nFailures:\n');
  for (const { rel, result } of failures) {
    console.log(`  ${rel}  —  ${result.description}`);
    if (result.error) console.log(`    error:    ${result.error}`);
    if (result.exitCode !== result.expectedExitCode) {
      console.log(`    exit:     expected ${result.expectedExitCode}, got ${result.exitCode}`);
    }
    if (result.outputError) console.log(`    output:   ${result.outputError}`);
    if (result.stderr) console.log(`    stderr:   ${result.stderr}`);
    console.log();
  }
}

const total = passed + failed;
const colour = failed > 0 ? '\x1b[31m' : '\x1b[32m';
console.log(`${colour}${passed}/${total} passed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
