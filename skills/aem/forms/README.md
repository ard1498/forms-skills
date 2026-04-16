# AEM Forms Skills for AI Coding Agents

> Turn natural language into production AEM Adaptive Forms.

Skills plugin that gives AI coding agents (Claude Code, etc.) the knowledge and tools to create, validate, and deploy AEM Adaptive Forms through conversation.

---

## Table of Contents

- [How It Works](#how-it-works)
- [User Guide](#user-guide) _(install, set up workspace, start building)_
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
| `analysis` | Requirements & documentation | `analyze-requirements`, `analyze-v1-form`, `create-screen-doc`, `jud-to-screen`, `review-screen-doc` |
| `build` | Form structure & components | `scaffold-form`, `create-form`, `create-component` |
| `logic` | Business rules & functions | `add-rules`, `create-function`, `optimize-rules` |
| `integration` | APIs & data | `manage-apis` |
| `infra` | Setup, sync, deploy | `setup-workspace`, `sync-forms`, `sync-eds-code`, `git-sandbox` |
| `context` | Agent memory & session continuity | `manage-context` |

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
| Python 3.10+ | Runs form sync, API manager, and rule validation (deps managed by the plugin) |
| `git` on PATH | Used by `eds-code-sync` and `git-sandbox` for repo operations |

The plugin bundles its own Python virtual environment — you don't install any Python packages yourself.

## 2. Install the Plugin

### Claude Code

```
/plugin install aem-forms@adobe-skills
```

### Vercel Skills (npx)

```
# Install all skills
npx skills add adobe/skills --path skills/aem/forms --all

# Or install a single skill
npx skills add adobe/skills --path skills/aem/forms --skill create-form

# List what's available
npx skills add adobe/skills --path skills/aem/forms --list
```

Python dependencies are installed automatically on first use.

## 3. Get Started

After installation, tell your agent:

> _"Set up a new AEM Forms workspace for my project."_

The `setup-workspace` skill handles everything — directory structure, `.env` credentials, system checks, and first sync. See [`forms-orchestrator/references/domain-registry/references/infra/references/setup-workspace/SKILL.md`](forms-orchestrator/references/domain-registry/references/infra/references/setup-workspace/SKILL.md) for the full workspace layout, credential reference, and configuration guide.

Once your workspace is ready, just start talking:

> _"Here's the requirements doc for a personal loan application. Build the form."_

The **forms-orchestrator** (`forms-orchestrator/SKILL.md`) receives your intent and runs through the 6-step routing algorithm. For complex requirements it invokes the **Planner** to generate a sequence of plans, then executes each plan by routing to the appropriate domain and skill. For simple single-task requests it routes directly to the matching domain. See the orchestrator for the complete routing table and available skills across all six domains: `analysis`, `build`, `logic`, `integration`, `infra`, and `context`.

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
cd skills/aem/forms

# Run the setup script — creates .venv at project root, installs everything
./forms-orchestrator/scripts/setup.sh
```

The script will:
1. Create a `.venv` virtual environment at the project root (uses `uv` if available, falls back to `python3 -m venv`).
2. Install the project in editable mode (`pip install -e ".[dev]"`).
3. Install the Node.js bridge dependencies (`npm install` in `forms-orchestrator/scripts/rule_coder/bridge/`).

After setup, activate the venv in any new shell:

```
source .venv/bin/activate
# (The root ./setup.sh wrapper also works — it forwards to forms-orchestrator/scripts/setup.sh)
```

| Flag | What it does |
|------|-------------|
| `--force` | Delete existing `.venv/` and recreate from scratch |
| `--skip-deps` | Create/activate venv but skip package installation |

## 2. Run Tests

```
source .venv/bin/activate

# Validate plugin structure (14 skill entries, all SKILL.md files, script directories, Python packages)
bash tests/test_plugin_structure.sh
```

There's also a manual end-to-end test plan in `tests/e2e-test-plan.md` (30–45 min, covers analyze → create → rules → functions → validate) and an error-handling guide in `tests/error-handling-guide.md` for CLI tool error patterns and recovery.

Individual skills may also have `eval/` directories for skill-level testing.

## Repository Structure

```
forms/
├── pyproject.toml                  # Python packaging — deps, entry points
├── setup.sh                       # Wrapper → forms-orchestrator/scripts/setup.sh
├── README.md                      # This file
├── .claude-plugin/
│   └── plugin.json                # Plugin metadata and skill registry
├── forms-orchestrator/
│   ├── SKILL.md                   # forms-orchestrator — entry point (type: router)
│   ├── assets/
│   │   ├── guidelines.md          # Orchestrator constraints & conventions
│   │   └── routing-table.md       # 6-step routing algorithm
│   ├── scripts/                   # Shared CLI wrappers + tool backends
│   │   ├── setup.sh               # Environment setup (creates .venv at project root)
│   │   ├── _resolve-workspace     # Workspace resolution helper (sourced by all tools)
│   │   ├── api-manager            # CLI wrapper
│   │   ├── eds-code-sync          # CLI wrapper
│   │   ├── form-sync              # CLI wrapper
│   │   ├── git-sandbox            # CLI wrapper
│   │   ├── parse-functions        # CLI wrapper
│   │   ├── python3                # Python venv wrapper
│   │   ├── rule-grammar           # CLI wrapper
│   │   ├── rule-save              # CLI wrapper
│   │   ├── rule-transform         # CLI wrapper
│   │   ├── rule-validate          # CLI wrapper
│   │   ├── api_manager/           # Python backend for api-manager
│   │   └── rule_coder/            # Node.js backend for rule-* tools
│   └── references/
│       ├── planner/               # Plan generator (type: skill)
│       │   ├── SKILL.md
│       │   ├── assets/
│       │   │   └── plan-template.md
│       │   └── references/
│       │       ├── default-strategy.md
│       │       ├── structure-plan.md
│       │       ├── workflow-plan.md
│       │       ├── logic-plan.md
│       │       ├── integration-plan.md
│       │       └── infrastructure-plan.md
│       └── domain-registry/       # Domain & skill catalog (type: router)
│           ├── SKILL.md
│           ├── assets/
│           │   ├── skills-catalog.md
│           │   ├── skill-resolution.md
│           │   ├── contribution-guide.md
│           │   └── templates/
│           │       └── domain-template.md
│           └── references/
│               ├── analysis/      # SKILL.md + references/{analyze-requirements, analyze-v1-form, create-screen-doc, jud-to-screen, review-screen-doc}
│               ├── build/         # SKILL.md + references/{scaffold-form, create-form, create-component}
│               ├── logic/         # SKILL.md + references/{add-rules, create-function, optimize-rules}
│               ├── integration/   # SKILL.md + references/{manage-apis}
│               ├── infra/         # SKILL.md + references/{setup-workspace, sync-forms, sync-eds-code, git-sandbox}
│               └── context/       # SKILL.md + references/{manage-context}
└── tests/
    ├── README.md
    ├── test_plugin_structure.sh
    ├── e2e-test-plan.md
    └── error-handling-guide.md
```

Every level follows the [agentskills.io specification](https://agentskills.io/specification): `SKILL.md` (required) + `scripts/` + `references/` + `assets/` (optional).

## Shared CLI Tools (`forms-orchestrator/scripts/`)

| Tool | Backend | Description |
|------|---------|-------------|
| `api-manager` | `forms-orchestrator/scripts/api_manager/cli.py` | Manage OpenAPI specs and JS clients |
| `rule-transform` | `forms-orchestrator/scripts/rule_coder/bridge/cli/transform-form.js` | Transform form JSON for rule editing |
| `rule-validate` | `forms-orchestrator/scripts/rule_coder/validator/` | Validate rule JSON against grammar |
| `rule-save` | `forms-orchestrator/scripts/rule_coder/bridge/cli/save-rule.js` | Save compiled rules back to form |
| `rule-grammar` | `forms-orchestrator/scripts/rule_coder/grammar/` | Print the rule grammar reference |
| `parse-functions` | `forms-orchestrator/scripts/rule_coder/bridge/cli/parse-functions.js` | Parse custom function JSDoc annotations |

## Skill-Embedded CLI Tools

These tools live inside individual skill directories at `forms-orchestrator/references/domain-registry/references/<domain>/references/<skill>/scripts/`.

| Tool | Domain / Skill | Language |
|------|----------------|----------|
| `form-sync` | `infra/sync-forms` | Python |
| `eds-code-sync` | `infra/sync-eds-code` | Python |
| `git-sandbox` | `infra/git-sandbox` | Python |
| `form-validate` | `build/create-form` | Node.js |
| `scaffold-form` | `build/scaffold-form` | Python |
| `api-skill` | `integration/manage-apis` | Python |

## Pending from XPL Sync

- **`screen-builder`** — orchestration skill that decomposes a Screen.md into ordered user stories and executes them via build skills (`create-form`, `create-component`, `manage-apis`, `add-rules`). Present in the source XPL repo but not yet ported. Deferred because it sits above the analysis domain as an execution bridge.

## Adding a New Skill

1. Decide which domain it belongs to (`analysis`, `build`, `logic`, `integration`, `infra`, or `context`).
2. Create a directory under `forms-orchestrator/references/domain-registry/references/<domain>/references/<skill-name>/`.
3. Add a `SKILL.md` file with frontmatter (`name`, `description`) and instructions.
4. If the skill needs a CLI tool, add a `scripts/` directory inside the skill.
5. If the skill has a **Python** package, add its `scripts/` path to the `PYTHONPATH` block in `forms-orchestrator/scripts/python3` (the central Python wrapper manages all package paths — no individual script should set `PYTHONPATH`).
6. If the skill has a **Python** package, add its `scripts/` path to `pyproject.toml` under `[tool.setuptools.packages.find]` `where`.
7. Register it in `forms-orchestrator/references/domain-registry/assets/skills-catalog.md`.
8. Register it in `.claude-plugin/plugin.json` under the `skills` array.
9. Run `bash tests/test_plugin_structure.sh` to verify.

---

## License

Apache 2.0 — see [LICENSE](../../../LICENSE) for details.