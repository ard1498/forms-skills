#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AEM Forms Skills — Environment Setup
# Usage: setup.sh [--force] [--skip-deps] [--help]
#
# Sets up a Python virtual environment, installs Python dependencies,
# and installs the Node.js build dependencies for the content-update bundles.
#
# This script lives inside the shared library directory (lib/scripts/)
# and creates .venv at the project root (alongside pyproject.toml) so the
# plugin package directory stays clean and distributable.
#
# Layout:
#   SCRIPTS_DIR  = lib/scripts/   (where this file lives)
#   PLUGIN_ROOT  = lib/            (the shared library)
#   PROJECT_ROOT = <repo-root>/   (has pyproject.toml, .venv)
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
BRIDGE_DIR="$PROJECT_ROOT/skills/forms-content-author/references/forms-content-update"

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

  # ── Node.js build deps (content-update bundles) ──────────────────────────
  if [ -d "$BRIDGE_DIR" ]; then
    if command -v npm &>/dev/null; then
      info "Installing Node.js build dependencies …"
      (cd "$BRIDGE_DIR" && npm install)
      ok "Node.js build dependencies installed"
    else
      warn "npm not found — skipping Node.js build dependency installation."
      warn "Install Node.js (https://nodejs.org) and re-run, or run:"
      echo "      cd skills/forms-content-author/references/forms-content-update && npm install"
    fi
  else
    warn "Build directory not found at $BRIDGE_DIR — skipping npm install."
  fi
fi

# ── Done! ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}Setup complete!${RESET}"
echo ""
echo "  Shared tools (lib/scripts/):"
echo -e "    ${CYAN}api-manager${RESET}     — Manage OpenAPI specifications"
echo ""
echo "  Rule tools (forms-rule-creator/scripts/):"
echo -e "    ${CYAN}transform-jcr.jsh${RESET}              — Transform JCR form JSON for rule editing"
echo -e "    ${CYAN}transform-content-model.jsh${RESET}    — Transform content model JSON for rule editing"
echo -e "    ${CYAN}find-field.jsh${RESET}                 — Find field by name in content model"
echo -e "    ${CYAN}validate-rule.jsh${RESET}              — Validate rule AST against grammar"
echo -e "    ${CYAN}generate-formula.jsh${RESET}           — Compile rule AST → JSON Formula"
echo -e "    ${CYAN}merge-formula.jsh${RESET}              — Merge compiled formula into form"
echo -e "    ${CYAN}parse-functions.jsh${RESET}            — Parse custom function JSDoc annotations"
echo ""
echo "  Integration tools (skill scripts/):"
echo -e "    ${CYAN}api-skill${RESET}       — Generate API from cURL    (integration/manage-apis)"
echo ""
echo "  To activate the environment in a new shell:"
echo -e "    ${BOLD}source .venv/bin/activate${RESET}"
echo ""

# ── MCP Server Check ─────────────────────────────────────────────────────────
echo "─────────────────────────────────────"
echo ""
if command -v claude &>/dev/null; then
  if claude mcp list 2>/dev/null | grep -q "aem-sites-content"; then
    ok "Sites Content MCP server (aem-sites-content) registered"
  else
    warn "Sites Content MCP server not registered"
    echo ""
    echo "  The forms-content-author domain requires the Sites Content MCP server."
    echo "  Add it with one of these commands, then restart Claude Code:"
    echo ""
    echo "  AEM as a Cloud Service (default):"
    echo -e "    ${BOLD}claude mcp add --transport http aem-sites-content \\${RESET}"
    echo -e "    ${BOLD}  https://mcp.adobeaemcloud.com/adobe/mcp/content${RESET}"
    echo ""
    echo "  Local AEM SDK:"
    echo -e "    ${BOLD}claude mcp add aem-sites-content -- node /tmp/aem-sites-contentapi-mcp-server/build/index.js${RESET}"
    echo "  (See assets/setup-workspace.md § 'Sites Content MCP Server' for local setup details)"
    echo ""
  fi
else
  warn "claude CLI not found — skipping MCP server check"
  echo "  Install Claude Code, then add the Sites Content MCP server before using forms-content-author."
  echo ""
fi
