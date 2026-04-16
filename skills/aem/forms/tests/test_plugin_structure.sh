#!/usr/bin/env bash
# Plugin Structure Integration Test
# Validates that the aem-forms plugin has all required files and references.
# Run from: forms-skills/skills/aem/forms/
#
# Usage: bash tests/test_plugin_structure.sh

set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
TOTAL=0

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ❌ $1"; }
section() { echo ""; echo "── $1 ──"; }

cd "$PLUGIN_ROOT"

echo "Plugin Structure Integration Test"
echo "================================="
echo "Plugin root: $PLUGIN_ROOT"

# ── Plugin Metadata ──

section "Plugin Metadata"

if [[ -f ".claude-plugin/plugin.json" ]]; then
  pass "plugin.json exists"
else
  fail "plugin.json missing at .claude-plugin/plugin.json"
fi

if grep -q '"name": "aem-forms"' ".claude-plugin/plugin.json" 2>/dev/null; then
  pass "plugin.json contains name \"aem-forms\""
else
  fail "plugin.json does not contain name \"aem-forms\""
fi

if grep -q '"skills"' ".claude-plugin/plugin.json" 2>/dev/null; then
  pass "plugin.json contains \"skills\" array"
else
  fail "plugin.json does not contain \"skills\" array"
fi

SKILL_COUNT=$(grep -c '\./skills/' ".claude-plugin/plugin.json" 2>/dev/null || echo "0")
if [[ "$SKILL_COUNT" -eq 14 ]]; then
  pass "plugin.json skills array has exactly 14 entries"
else
  fail "plugin.json skills array has $SKILL_COUNT entries (expected 14)"
fi

# ── Marketplace Registration ──

section "Marketplace Registration"

MARKETPLACE="$PLUGIN_ROOT/../../../.claude-plugin/marketplace.json"
if [[ -f "$MARKETPLACE" ]]; then
  pass "marketplace.json exists at repo root"
else
  fail "marketplace.json missing at repo root (.claude-plugin/marketplace.json)"
fi

if grep -q '"aem-forms"' "$MARKETPLACE" 2>/dev/null; then
  pass "marketplace.json contains \"aem-forms\" entry"
else
  fail "marketplace.json does not contain \"aem-forms\" entry"
fi

# ── Skill Definitions ──

section "Skill Definitions"

SKILLS=("analyze-requirements" "create-form" "add-rules" "create-function" "create-component" "manage-apis" "optimize-rules" "analyze-v1-form" "review-screen-doc" "sync-forms" "sync-eds-code" "git-sandbox" "scaffold-form" "create-screen-doc")

for skill in "${SKILLS[@]}"; do
  skill_file="skills/$skill/SKILL.md"
  if [[ -f "$skill_file" ]]; then
    pass "$skill_file exists"
  else
    fail "$skill_file missing"
  fi

  if [[ -f "$skill_file" ]]; then
    file_size=$(wc -c < "$skill_file" | tr -d ' ')
    if [[ "$file_size" -ge 100 ]]; then
      pass "$skill_file is non-empty (${file_size} bytes)"
    else
      fail "$skill_file is too small (${file_size} bytes, expected >= 100)"
    fi
  fi
done

# ── Skill References ──

section "Skill References"

REFERENCES=(
  "skills/create-form/references/field-types.md"
  "skills/add-rules/references/grammar-reference.md"
  "skills/add-rules/references/rule-types.md"
  "skills/add-rules/references/examples/visibility/show-on-dropdown.json"
  "skills/create-function/references/api-patterns.md"
  "skills/create-function/references/implementation-patterns.md"
  "skills/create-function/references/scope-functions-reference.md"
  "skills/create-component/references/field-html-structure.md"
)

for ref in "${REFERENCES[@]}"; do
  if [[ -f "$ref" ]]; then
    pass "$ref exists"
  else
    fail "$ref missing"
  fi
done

# ── Script Directories ──

section "Script Directories"

# Shared script directories (remain in scripts/)
SHARED_SCRIPT_DIRS=("api_manager" "rule_coder")

for dir in "${SHARED_SCRIPT_DIRS[@]}"; do
  script_dir="scripts/$dir"
  if [[ -d "$script_dir" ]]; then
    pass "$script_dir/ exists and is a directory"
  else
    fail "$script_dir/ missing or not a directory"
  fi
done

# Skill-local script directories
SKILL_SCRIPT_DIRS=(
  "skills/create-form/scripts/eds_form_validator"
  "skills/manage-apis/scripts/api_skill"
  "skills/sync-forms/scripts/form_sync"
  "skills/sync-eds-code/scripts/eds_code_sync"
  "skills/git-sandbox/scripts/git_sandbox"
  "skills/scaffold-form/scripts/scaffold_form"
)

for script_dir in "${SKILL_SCRIPT_DIRS[@]}"; do
  if [[ -d "$script_dir" ]]; then
    pass "$script_dir/ exists and is a directory"
  else
    fail "$script_dir/ missing or not a directory"
  fi
done

# ── Critical Script Files ──

section "Critical Script Files"

CRITICAL_SCRIPTS=(
  # Shared scripts
  "scripts/rule_coder/bridge/cli/transform-form.js"
  "scripts/rule_coder/bridge/cli/parse-functions.js"
  "scripts/rule_coder/bridge/cli/save-rule.js"
  "scripts/rule_coder/bridge/cli/summary.js"
  "scripts/rule_coder/bridge/cli/rule-metadata.js"
  "scripts/rule_coder/bridge/cli/merge.js"
  "scripts/rule_coder/bridge/cli/generate-formula.js"
  "scripts/rule_coder/validator/__main__.py"
  "scripts/rule_coder/validator/rule_validator.py"
  "scripts/rule_coder/grammar/annotated_subset_grammar.json"
  "scripts/rule_coder/functions/ootb-functions.json"
  "scripts/rule_coder/bridge/package.json"
  "scripts/api_manager/cli.py"
  "scripts/api_manager/__init__.py"
  # Skill-local scripts
  "skills/create-form/scripts/eds_form_validator/validate.cjs"
  "skills/create-form/scripts/eds_form_validator/FormFieldValidator.cjs"
  "skills/manage-apis/scripts/api_skill/__init__.py"
  "skills/manage-apis/scripts/api_skill/cli.py"
  "skills/sync-forms/scripts/form_sync/__init__.py"
  "skills/sync-forms/scripts/form_sync/cli.py"
  "skills/sync-eds-code/scripts/eds_code_sync/cli.py"
  "skills/sync-eds-code/scripts/eds_code_sync/__init__.py"
  "skills/git-sandbox/scripts/git_sandbox/cli.py"
  "skills/git-sandbox/scripts/git_sandbox/__init__.py"
  "skills/scaffold-form/scripts/scaffold_form/__init__.py"
  "skills/scaffold-form/scripts/scaffold_form/cli.py"
)

for script in "${CRITICAL_SCRIPTS[@]}"; do
  if [[ -f "$script" ]]; then
    pass "$script exists"
  else
    fail "$script missing"
  fi
done

# ── Python Package Structure ──

section "Python Package Structure"

PYTHON_INITS=(
  # Shared packages
  "scripts/rule_coder/__init__.py"
  "scripts/rule_coder/validator/__init__.py"
  "scripts/rule_coder/context/__init__.py"
  "scripts/rule_coder/functions/__init__.py"
  "scripts/api_manager/__init__.py"
  # Skill-local packages
  "skills/manage-apis/scripts/api_skill/__init__.py"
  "skills/sync-forms/scripts/form_sync/__init__.py"
  "skills/sync-eds-code/scripts/eds_code_sync/__init__.py"
  "skills/git-sandbox/scripts/git_sandbox/__init__.py"
  "skills/scaffold-form/scripts/scaffold_form/__init__.py"
)

for init in "${PYTHON_INITS[@]}"; do
  if [[ -f "$init" ]]; then
    pass "$init exists"
  else
    fail "$init missing"
  fi
done

# ── Node.js Dependencies ──

section "Node.js Dependencies"

if [[ -d "scripts/rule_coder/bridge/node_modules" ]]; then
  pass "scripts/rule_coder/bridge/node_modules/ exists"
else
  fail "scripts/rule_coder/bridge/node_modules/ missing (run: cd scripts/rule_coder/bridge && npm install)"
fi

# ── Summary ──

echo ""
echo "════════════════════════════════"
echo "  $PASS/$TOTAL tests passed, $FAIL failed"
echo "════════════════════════════════"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
else
  echo ""
  echo "All checks passed ✅"
  exit 0
fi
