#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AEM Forms Skills — Environment Setup
# Usage: setup.sh [--force] [--skip-deps] [--help]
#
# Sets up a Python virtual environment, installs Python dependencies,
# and installs the Node.js bridge dependencies for the rule-coder tool.
#
# This script lives inside the plugin directory (forms-orchestrator/scripts/)
# and creates .venv at the project root (alongside pyproject.toml) so the
# plugin package directory stays clean and distributable.
#
# Layout:
#   SCRIPTS_DIR  = forms-orchestrator/scripts/   (where this file lives)
#   PLUGIN_ROOT  = forms-orchestrator/            (the plugin package)
#   PROJECT_ROOT = forms/                         (has pyproject.toml, .venv)
#
# Options:
#   --force       Remove an existing .venv and recreate it from scratch
#   --skip-deps   Create/activate the venv but skip package installation
#   --help        Show this help message and exit
# ─────────────────────────────────────────────────────────────────────────────
set -e

# ── Colour helpers (no-op when stdout is not a terminal) ─────────────────────
if [ -t 1 ]; then
  GREEN="\033[0;32m"
  YELLOW="\033[0;33m"
  RED="\033[0;31m"
  CYAN="\033[0;36m"
  BOLD="\033[1m"
  RESET="\033[0m"
else
  GREEN="" YELLOW="" RED="" CYAN="" BOLD="" RESET=""
fi

ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET} $*"; }
fail() { echo -e "${RED}❌${RESET} $*"; }
info() { echo -e "${CYAN}ℹ${RESET} $*"; }

# ── Resolve paths ────────────────────────────────────────────────────────────
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$PLUGIN_ROOT/.." && pwd)"
VENV_PATH="$PROJECT_ROOT/.venv"
BRIDGE_DIR="$SCRIPTS_DIR/rule_coder/bridge"

# ── Parse CLI arguments ──────────────────────────────────────────────────────
FORCE=false
SKIP_DEPS=false

for arg in "$@"; do
  case "$arg" in
    --force)
      FORCE=true
      ;;
    --skip-deps)
      SKIP_DEPS=true
      ;;
    --help|-h)
      echo "Usage: setup.sh [--force] [--skip-deps] [--help]"
      echo ""
      echo "Options:"
      echo "  --force       Remove existing .venv and recreate from scratch"
      echo "  --skip-deps   Create/activate venv but skip package installation"
      echo "  --help        Show this help message"
      exit 0
      ;;
    *)
      fail "Unknown option: $arg"
      echo "Run setup.sh --help for usage information."
      exit 1
      ;;
  esac
done

echo ""
echo -e "${BOLD}AEM Forms Skills — Environment Setup${RESET}"
echo "─────────────────────────────────────"
echo ""

# ── Handle --force: tear down existing venv ──────────────────────────────────
if [ "$FORCE" = true ] && [ -d "$VENV_PATH" ]; then
  warn "Removing existing virtual environment (--force) …"
  rm -rf "$VENV_PATH"
fi

# ── Create virtual environment ───────────────────────────────────────────────
if [ -d "$VENV_PATH" ]; then
  ok "Virtual environment already exists at .venv/"
else
  info "Creating virtual environment …"

  if command -v uv &>/dev/null; then
    info "Using ${BOLD}uv${RESET} to create venv (Python 3.13)"
    uv venv --python 3.13 --seed "$VENV_PATH"
  elif command -v python3 &>/dev/null; then
    info "uv not found — falling back to ${BOLD}python3 -m venv${RESET}"
    python3 -m venv "$VENV_PATH"
  else
    fail "Neither uv nor python3 found. Please install Python 3.10+ first."
    exit 1
  fi

  ok "Virtual environment created at .venv/"
fi

# ── Activate the virtual environment ─────────────────────────────────────────
# shellcheck disable=SC1091
source "$VENV_PATH/bin/activate"
ok "Virtual environment activated ($(python3 --version))"

# ── Install dependencies ─────────────────────────────────────────────────────
if [ "$SKIP_DEPS" = true ]; then
  warn "Skipping dependency installation (--skip-deps)"
else
  # ── Python deps (editable install from project root where pyproject.toml lives)
  info "Installing Python project in editable mode …"
  pip install --upgrade pip --quiet
  pip install -e "$PROJECT_ROOT[dev]"
  ok "Python dependencies installed"

  # ── Node.js bridge deps ───────────────────────────────────────────────────
  if [ -d "$BRIDGE_DIR" ]; then
    if command -v npm &>/dev/null; then
      info "Installing Node.js bridge dependencies …"
      (cd "$BRIDGE_DIR" && npm install)
      ok "Node.js bridge dependencies installed"
    else
      warn "npm not found — skipping Node.js bridge dependency installation."
      warn "Install Node.js (https://nodejs.org) and re-run, or run:"
      echo "      cd forms-orchestrator/scripts/rule_coder/bridge && npm install"
    fi
  else
    warn "Bridge directory not found at $BRIDGE_DIR — skipping npm install."
  fi
fi

# ── Done! ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}Setup complete!${RESET}"
echo ""
echo "  Shared CLI tools (forms-orchestrator/scripts/):"
echo -e "    ${CYAN}api-manager${RESET}     — Manage OpenAPI specifications"
echo -e "    ${CYAN}rule-transform${RESET}  — Transform form JSON for rule editing"
echo -e "    ${CYAN}rule-validate${RESET}   — Validate rule JSON against grammar"
echo -e "    ${CYAN}rule-save${RESET}       — Save compiled rules back to form"
echo -e "    ${CYAN}rule-grammar${RESET}    — Print the rule grammar reference"
echo -e "    ${CYAN}parse-functions${RESET} — Parse custom function JSDoc annotations"
echo ""
echo "  Skill-embedded CLI tools:"
echo -e "    ${CYAN}form-validate${RESET}   — Validate form JSON        (build/create-form)"
echo -e "    ${CYAN}api-skill${RESET}       — Generate API from cURL    (integration/manage-apis)"
echo -e "    ${CYAN}form-sync${RESET}       — Sync forms with AEM       (infra/sync-forms)"
echo -e "    ${CYAN}eds-code-sync${RESET}   — Sync EDS code via GitHub  (infra/sync-eds-code)"
echo -e "    ${CYAN}git-sandbox${RESET}     — Isolated Git workspace    (infra/git-sandbox)"
echo -e "    ${CYAN}scaffold-form${RESET}   — Scaffold empty form JSON  (build/scaffold-form)"
echo ""
echo "  To activate the environment in a new shell:"
echo -e "    ${BOLD}source .venv/bin/activate${RESET}"
echo ""
