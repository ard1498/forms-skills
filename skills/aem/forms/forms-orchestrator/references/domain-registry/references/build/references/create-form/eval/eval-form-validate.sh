#!/usr/bin/env bash
# Eval: Form Validator smoke test for create-form skill
# Verifies eds_form_validator can validate a sample form.
#
# Usage: bash skills/create-form/eval/eval-form-validate.sh

set -euo pipefail

EVAL_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$EVAL_DIR/.." && pwd)"
FIXTURES="$EVAL_DIR/fixtures"
PASS=0; FAIL=0; TOTAL=0

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ❌ $1: $2"; }
skip() { TOTAL=$((TOTAL + 1)); echo "  ⏭️  $1 (skipped: $2)"; }

TMPDIR_EVAL="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_EVAL"' EXIT

echo "Form Validator Eval"
echo "==================="

# ── Prerequisites ──

HAS_NODE=false
if command -v node &>/dev/null; then
  pass "Node.js available ($(node --version))"
  HAS_NODE=true
else
  skip "Node.js" "node not found in PATH"
fi

FIXTURE_FORM="$FIXTURES/sample-contact.form.json"
if [[ ! -f "$FIXTURE_FORM" ]]; then
  echo "FATAL: Required fixture missing: $FIXTURE_FORM"
  exit 1
fi

# ── Form Validator ──

echo ""
echo "── Form Validator (validate.cjs) ──"

if [[ "$HAS_NODE" == true ]]; then
  STDOUT_FILE="$TMPDIR_EVAL/validate_stdout.txt"
  STDERR_FILE="$TMPDIR_EVAL/validate_stderr.txt"

  EXIT_CODE=0
  node "$SKILL_DIR/scripts/eds_form_validator/validate.cjs" "$FIXTURE_FORM" --json \
    >"$STDOUT_FILE" 2>"$STDERR_FILE" || EXIT_CODE=$?

  if [[ "$EXIT_CODE" -eq 0 ]]; then
    pass "validate.cjs exits with code 0"
  else
    fail "validate.cjs exit code $EXIT_CODE" "$(head -5 "$STDERR_FILE")"
  fi

  if grep -q '"success"' "$STDOUT_FILE" 2>/dev/null || grep -q '"valid"' "$STDOUT_FILE" 2>/dev/null; then
    pass "validate.cjs output contains result key"
  else
    fail "validate.cjs output missing result key" "$(head -3 "$STDOUT_FILE")"
  fi
else
  skip "validate.cjs" "Node.js not available"
fi

# ── Summary ──

echo ""
echo "════════════════════════════════"
echo "  $PASS/$TOTAL passed, $FAIL failed"
echo "════════════════════════════════"
[[ "$FAIL" -gt 0 ]] && exit 1 || exit 0
