# AEM Forms Skills for AI Coding Agents

> Turn natural language into production AEM Adaptive Forms.

Skills plugin that gives AI coding agents (Claude Code, etc.) the knowledge and tools to create, validate, and deploy AEM Adaptive Forms through conversation.

---

## Table of Contents

- [How It Works](#how-it-works)
- [User Guide](#user-guide) _(install, set up workspace, start building)_
- [Tutorial](tutorial.md) _(build a complete form end-to-end)_
- [Developer Guide](#developer-guide) _(work on the plugin itself)_

---

# How It Works

The plugin is organized as a **Plan-Driven Skill Gateway** — a layered routing architecture with two registries that maps user intents to the right skill automatically.

```
User Intent → forms-orchestrator → Planner / Domain Registry → Domain Router → Skill → Tools
```

The entry point is the **forms-orchestrator** (`forms-orchestrator/SKILL.md`). It uses a **Planner** to generate multi-step plans from requirements, and a **Domain Registry** to catalog all available domains and skills. Domain routers dispatch to leaf skills, and each skill owns its tools and references.

### Architecture

```
User Intent
     │
     ▼
┌────────────────────────────────────────┐
│  forms-orchestrator                     │  ← type: router (entry point)
│  forms-orchestrator/SKILL.md            │
└──────────────────┬─────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌──────────────┐    ┌──────────────┐
│  Planner     │    │  Domain      │
│  (generates  │    │  Registry    │
│   plans)     │    │  (catalogs   │
│              │    │   domains &  │
│              │    │   skills)    │
└──────┬───────┘    └──────┬───────┘
       │                   │
       ▼                   ▼
  Plan files          Domain Routers
  plans/<journey>/    ┌──────────────┐
  NN-<title>.md       │ type: domain │
                      └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │ type: skill  │  ← leaf nodes do the work
                      └──────────────┘
```

### 6-Step Routing Algorithm

Routing follows a strict 6-step algorithm defined in `forms-orchestrator/assets/routing-table.md`:

| Step | Name | Condition | Action |
|------|------|-----------|--------|
| 1 | **Workspace gate** | No workspace detected? | → `infra` › `setup-workspace` (hard block) |
| 2 | **Active plan** | Active plan in `.agent/handover.md`? | → Resume it |
| 3 | **Plans exist** | Pending plans in `plans/<journey>/`? | → Activate next → execute |
| 4 | **Generate plans** | User has requirements but no plans? | → Planner generates them |
| 5 | **Domain fallback** | Intent is a single task? | → Route to domain directly |
| 6 | **No match** | None of the above? | → Ask user to clarify |

You don't need to memorize this — just start talking to the agent. The orchestrator handles routing.

> **Full details:** See `forms-orchestrator/SKILL.md` for the complete routing table and orchestrator constraints, and `forms-orchestrator/assets/routing-table.md` for the algorithm definition.

### Domains

| Domain | Purpose | Skills |
|--------|---------|--------|
| `analysis` | Requirements & documentation | `analyze-requirements`, `analyze-v1-form`, `create-screen-doc`, `jud-to-screen` |
| `content-author` | Form structure & components via Sites Content MCP | `forms-custom-components` (+ `forms-content-update`, `forms-content-generate` internally) |
| `rule-creator` | Business rules & custom functions | `forms-rule-creator` |
| `integration` | APIs & data | `manage-apis` |
| `infra` | Workspace setup | `setup-workspace` |
| `context-management` | Agent memory & session continuity | `manage-context` |

### Plan Types

Instead of fixed phases, the **Planner** dynamically generates plans from user requirements. Each plan is one of five types:

| Plan Type | Purpose |
|-----------|---------|
| Structure | Building the form skeleton — panels, fields, basic validations |
| Workflow | Implementing a specific user flow or conditional branch |
| Logic | Adding cross-cutting validations and business rules |
| Integration | Wiring APIs — data loading, save/submit, external services |
| Infrastructure | Cross-cutting concerns — error handling, session management |

Plans are generated as Markdown files in `plans/<journey>/NN-<title>.md` and executed sequentially by the orchestrator.

---

# User Guide

Everything you need to install the plugin, set up a workspace, and start building forms.

## 1. System Requirements

| Requirement | Why |
|-------------|-----|
| Node.js 18+ | Runs the form validator, rule transformer, and rule save tools |
| Python 3.10+ | Runs API manager and rule validation (deps managed by the plugin) |
| `git` on PATH | Version control for EDS code changes in the repo |

The plugin bundles its own Python virtual environment — you don't install any Python packages yourself.

## 2. Install the Plugin

### Claude Code

```
/plugin install github:adobe/forms-skills
```

### Vercel Skills (npx)

```
# Install all skills
npx skills add adobe/forms-skills --all

# Or install a single skill
npx skills add adobe/forms-skills --skill forms-content-author

# List what's available
npx skills add adobe/forms-skills --list
```

Python dependencies are installed automatically on first use.

## 3. Get Started

After installation, tell your agent:

> _"Set up a new AEM Forms workspace for my project."_

The `setup-workspace` skill handles everything — directory structure, `.env` credentials, system checks, and first sync. See [`skills/forms-infra/references/setup-workspace/SKILL.md`](../forms-infra/references/setup-workspace/SKILL.md) for the full workspace layout, credential reference, and configuration guide.

Once your workspace is ready, just start talking:

> _"Here's the requirements doc for a personal loan application. Build the form."_

The **forms-orchestrator** (`forms-orchestrator/SKILL.md`) receives your intent and runs through the 6-step routing algorithm. For complex requirements it invokes the **Planner** to generate a sequence of plans, then executes each plan by routing to the appropriate domain and skill. For simple single-task requests it routes directly to the matching domain. See the orchestrator for the complete routing table and available skills across all six domains: `analysis`, `content-author`, `rule-creator`, `integration`, `infra`, and `context-management`.

---

# Developer Guide

Everything you need to work on the plugin code — add skills, modify scripts, and run tests.

## Prerequisites

- Python 3.10+ (3.13 recommended)
- Node.js 18+
- `git` and `npm` on PATH
- [`uv`](https://docs.astral.sh/uv/) (recommended) or `python3 -m venv`

## 1. Clone and Set Up

```
git clone <repo-url>
cd forms-skills

# Run the setup script — creates .venv at project root, installs everything
./skills/aem/forms/forms-shared/scripts/setup.sh
```

The script will:
1. Create a `.venv` virtual environment at the project root (uses `uv` if available, falls back to `python3 -m venv`).
2. Install the project in editable mode (`pip install -e ".[dev]"`).
3. Install the Node.js bridge dependencies (`npm install` in `forms-rule-creator/`).

After setup, activate the venv in any new shell:

```
source .venv/bin/activate
```

| Flag | What it does |
|------|-------------|
| `--force` | Delete existing `.venv/` and recreate from scratch |
| `--skip-deps` | Create/activate venv but skip package installation |

## 2. Run Tests

```bash
# Validate plugin structure against the agentskills.io spec
npx check-plugin .
```

This checks that every skill path registered in `plugin.json` has a valid `SKILL.md` with `name` and `description` frontmatter. The `check-plugin` command ships with `@aemforms/crispy-garbanzo` — run `npm install` once to make it available.

See `forms-orchestrator/assets/error-handling.md` for CLI tool error patterns and recovery.

## 3. Run Evals

Deterministic script evals (no token needed):

```bash
node evals/scripts/run-evals.js
node evals/scripts/run-evals.js --filter find-field   # subset
```

LLM evals (Bedrock bearer token or `ANTHROPIC_API_KEY`):

```bash
# Bedrock
AWS_BEARER_TOKEN_BEDROCK=<token> AWS_REGION=us-east-1 node evals/scripts/run-llm-evals.js

# Direct Anthropic API
ANTHROPIC_API_KEY=<key> node evals/scripts/run-llm-evals.js

node evals/scripts/run-llm-evals.js --filter routing/01 --verbose  # single scenario
```

Scenarios live in `evals/scenarios/`, fixtures in `evals/fixtures/`.

## Repository Structure

```
forms-skills/                            # repo root — aem-forms plugin
├── .claude-plugin/
│   └── plugin.json                      # Plugin metadata and skill registry
├── evals/                               # Eval scenarios, fixtures, runner scripts
│   ├── scripts/
│   │   ├── run-evals.js
│   │   └── run-llm-evals.js
│   ├── scenarios/
│   └── fixtures/
└── skills/
    ├── forms-orchestrator/              # Entry point router (type: router)
    │   ├── SKILL.md
    │   ├── assets/
    │   │   ├── guidelines.md
    │   │   ├── routing-table.md
    │   │   └── error-handling.md
    │   ├── references/
    │   │   ├── planner/                 # Plan generator (type: skill)
    │   │   └── domain-registry/         # Domain & skill catalog (type: router)
    │   └── tutorial.md
    ├── forms-analysis/                  # Analysis domain
    │   └── references/
    │       ├── analyze-requirements/
    │       ├── analyze-v1-form/
    │       ├── create-screen-doc/
    │       └── jud-to-screen/
    ├── forms-content-author/            # Content authoring domain
    │   ├── SKILL.md
    │   ├── forms-content-update/        # MCP-based form authoring (internal sub-skill)
    │   ├── forms-content-generate/      # Component payload builder (internal sub-skill)
    │   └── references/
    │       └── forms-custom-components/
    ├── forms-rule-creator/              # Rule & custom function authoring
    │   ├── SKILL.md
    │   ├── scripts/                     # Pre-built bundles (no npm install at runtime)
    │   ├── assets/
    │   │   ├── agent-kb/                # Rule authoring reference docs
    │   │   └── grammar/                 # Grammar reference docs
    │   └── references/
    ├── forms-infra/                     # Infra domain
    │   └── references/
    │       └── setup-workspace/
    ├── forms-integration/               # Integration domain
    │   └── references/
    │       └── manage-apis/
    ├── forms-context-management/        # Context & session domain
    │   └── references/
    │       └── manage-context/
    └── forms-shared/                    # Shared scripts
        └── scripts/
            ├── api-manager
            └── api_manager/
```

Every level follows the [agentskills.io specification](https://agentskills.io/specification): `SKILL.md` (required) + `scripts/` + `references/` + `assets/` (optional).

## Shared CLI Tools (`forms-shared/scripts/`)

| Tool | Backend | Description |
|------|---------|-------------|
| `api-manager` | `forms-shared/scripts/api_manager/cli.py` | Manage OpenAPI specs and JS clients |

## Rule Creator Bundles (`forms-rule-creator/scripts/`)

Pre-built Node.js bundles — no `npm install` at runtime.

| Bundle | Description |
|--------|-------------|
| `content-model-to-tree.bundle.js` | Content model → treeJson |
| `validate-rule.bundle.js` | Validate rule AST |
| `generate-formula.bundle.js` | Compile rule AST → JSON Formula |
| `parse-functions.bundle.js` | Parse custom function JSDoc annotations |
| `validate-merge.bundle.js` | Validate merged rule patch |

## Content Update Bundles (`forms-content-author/forms-content-update/scripts/`)

| Bundle | Description |
|--------|-------------|
| `find-field.bundle.js` | Find field/panel by name → capiKey + pointer |
| `resolve-insert-position.bundle.js` | Resolve insert index in panel |
| `validate-patch.bundle.js` | Type-check replace ops against Content API definition |
| `list-form-fields.bundle.js` | Flat list of all fields in content model |

## Skill-Embedded CLI Tools

| Tool | Skill | Language |
|------|-------|----------|
| `api-skill` | `forms-integration/references/manage-apis/scripts/` | Python |

## Adding a New Skill

1. Decide which domain it belongs to (`analysis`, `content-author`, `rule-creator`, `integration`, `infra`, or `context-management`).
2. Create a directory under `skills/forms-<domain>/references/<skill-name>/`.
3. Add a `SKILL.md` file with frontmatter (`name`, `description`, `type`) and instructions.
4. If the skill needs a CLI tool, add a `scripts/` directory inside the skill.
5. Register it in `skills/forms-orchestrator/references/domain-registry/assets/skills-catalog.md`.
6. Register it in `.claude-plugin/plugin.json` (repo root) under the `skills` array.
7. Run `npx check-plugin .` from the repo root to verify.

---

## License

Apache 2.0 — see [LICENSE](../../../LICENSE) for details.