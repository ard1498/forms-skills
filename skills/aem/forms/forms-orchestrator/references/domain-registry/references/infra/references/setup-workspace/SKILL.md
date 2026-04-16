---
name: setup-workspace
description: >
  Initializes the AEM Forms workspace directory structure, configures AEM and GitHub credentials,
  verifies system requirements, and performs first-run setup. Creates .env with non-sensitive
  values collected conversationally and directs users to paste tokens (AEM bearer, GitHub PAT)
  directly into the .env file to avoid terminal escaping issues.
  Triggers: setup, workspace, initialize, init, configure, credentials, .env, get started,
  new project, first time, set up, create workspace, project setup, environment setup,
  system requirements, install plugin.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.2"
allowed-tools: Read, Write, Edit, Bash
---

# Workspace Setup

You help users set up and configure a new AEM Forms workspace through a guided, conversational flow — directory creation, credential collection, system checks, and first sync.

> **Token handling:** Bearer tokens and PATs contain characters (`+`, `/`, `=`, etc.) that get mangled when pasted into terminal prompts. **Always** write placeholder lines in `.env` and ask the user to paste tokens directly into the file — never collect tokens through the conversation.

## When to Use

- User just installed the plugin and needs to set up a workspace
- User needs to configure AEM or GitHub credentials
- User asks "how do I get started?" or "what do I need to set up?"
- User wants to create a new project from scratch
- User needs to verify system requirements (Node.js, Python, git)
- User is troubleshooting credential or connectivity issues

**Do NOT use for:** Building forms, adding rules, syncing code, or any task that assumes the workspace is already set up — use the appropriate skill instead.

## Critical Rules

1. **Ask for the workspace name first** — the very first thing you do is ask the user what they want to name their workspace
2. **Write `FORMS_WORKSPACE` to `.env` immediately after creating the directory** — this is the first line of `.env` and is how every CLI tool finds the workspace
3. **Collect non-sensitive values conversationally** — ask for URLs, paths, and repo names one at a time in the conversation
4. **Never collect tokens through the conversation** — for `AEM_TOKEN` and `GITHUB_TOKEN`, write a clearly marked placeholder line in `.env` and tell the user to open the file and paste the value directly. Terminal escaping corrupts tokens.
5. **Never hardcode credentials** — always write to `.env`; never commit `.env` to version control
6. **Verify system requirements** — confirm Node.js 18+ and Python 3.10+ are available
7. **Test credentials after collecting them** — use `eds-code-sync test` to verify AEM and GitHub connectivity
8. **Accept "skip"** — if the user doesn't have a value yet, write a placeholder comment and move on

## Interactive Setup Flow

Execute these steps in order. This is a conversation — wait for the user's response after each prompt.

### Step 1: Ask for workspace name

> "What would you like to name your workspace?"

Accept any reasonable name (e.g. `personal-loan-form`, `my-project`, `acme-onboarding`). This becomes the directory name.

### Step 2: Create workspace in cwd and write FORMS_WORKSPACE to .env

Create the workspace directory **inside the current working directory** — the directory the user already has open in their editor / terminal. Do NOT ask the user where to put it; it always goes in cwd.

```
mkdir -p <name>/{repo,refs/apis,code/blocks/form/{scripts,api-clients,components},journeys,plans,.agent}
```

Then immediately write the absolute path into `<name>/.env` as the first entry:

```
# ── Workspace ────────────────────────────────────────────
FORMS_WORKSPACE=<cwd>/<name>
```

Confirm to the user:
> "Created workspace at `<cwd>/<name>`. Now let's configure your credentials."

**IMPORTANT:** `FORMS_WORKSPACE` must be the first entry in `.env`. Every CLI tool reads this value from `.env` to resolve the workspace directory. All subsequent credentials are appended below it in the same file.

### Step 3: Collect credentials one by one

Ask for each value individually. After the user provides a value, confirm it and move to the next. Follow this exact order:

#### Required credentials

Collect these in two passes: **conversational values** first, then **token placeholders**.

**Pass 1 — Ask in conversation (safe to paste in terminal):**

| # | Variable | What to ask | Help text |
|---|----------|-------------|-----------|
| 1 | `AEM_HOST` | "What is your AEM Author URL?" | Pattern: `https://author-pXXXX-eYYYY.adobeaemcloud.com`. Find it in Cloud Manager → Program → Environment → Author URL. |
| 2 | `GITHUB_URL` | "What is the full GitHub URL for your EDS repo?" | e.g. `https://github.com/owner/repo` |
| 3 | `GITHUB_REPO` | "What is the repo in `owner/repo` format?" | e.g. `adobe/my-eds-repo`. You can usually derive this from the URL they just gave. If obvious, auto-fill and confirm. |
| 4 | `AEM_WRITE_PATHS` | "Which AEM content paths should be writable? (comma-separated)" | e.g. `/content/forms/af/my-team` |

**Pass 2 — Write placeholders, user pastes directly into `.env`:**

| # | Variable | Placeholder written to `.env` | Instructions to give user |
|---|----------|-------------------------------|---------------------------|
| 5 | `AEM_TOKEN` | `AEM_TOKEN=<paste-your-bearer-token-here>` | "Open `.env` in your editor and replace `<paste-your-bearer-token-here>` with your AEM bearer token. Get it from Developer Console → Integrations → Local Token → Get Local Development Token. Tokens expire after 24h." |
| 6 | `GITHUB_TOKEN` | `GITHUB_TOKEN=<paste-your-github-pat-here>` | "In the same `.env` file, replace `<paste-your-github-pat-here>` with your GitHub personal access token (classic PAT with `repo` scope, starts with `ghp_`). Generate one at github.com/settings/tokens." |

> **Why not paste tokens in the chat?** Bearer tokens and GitHub PATs contain special characters (`+`, `/`, `=`) that are silently corrupted by terminal escaping when pasted into a conversation prompt. Pasting directly into the `.env` file bypasses the terminal entirely and preserves the token exactly as-is.

After writing the placeholders, tell the user:
> "I've written your `.env` file with placeholder lines for `AEM_TOKEN` and `GITHUB_TOKEN`. Please open `<workspace>/.env` in your editor and paste the actual values on those lines. Let me know when you're done and I'll test the connection."

#### Optional credentials

Offer these but don't require them. Provide a default:

| Variable | Default | What to ask |
|----------|---------|-------------|
| `GITHUB_BRANCH` | `main` | "Which branch should I sync from? (default: main)" |
| `FORM_SYNC_ENV` | `prod` | "Which environment profile? local / stage / prod (default: prod)" |

#### Handling "skip" or "I'll do it later"

If the user says skip for any variable (including non-token values), write it as a commented placeholder:

```
# AEM_HOST=<your-aem-author-url>
```

And note to the user which values are still pending. Token placeholders are always written as uncommented lines with `<paste-...>` markers — the user replaces the marker with the real value.

#### Handling alternative auth

If the user says they use basic auth instead of a bearer token:
- Skip `AEM_TOKEN`
- Ask for `AEM_USERNAME` and `AEM_PASSWORD` instead

### Step 4: Write `.env`

Append all collected credentials to `<workspace>/.env` (below the `FORMS_WORKSPACE` line written in Step 2). For conversational values, write the actual collected value. For tokens, write the placeholder marker:

```
# ── Workspace ────────────────────────────────────────────
FORMS_WORKSPACE=<absolute-path-to-workspace>

# ── AEM Cloud Service ────────────────────────────────────
AEM_HOST=<collected-value>
AEM_TOKEN=<paste-your-bearer-token-here>

# ── GitHub EDS Repo ──────────────────────────────────────
GITHUB_URL=<collected-value>
GITHUB_REPO=<collected-value>
GITHUB_TOKEN=<paste-your-github-pat-here>
GITHUB_BRANCH=<collected-value>

# ── Form Sync ────────────────────────────────────────────
AEM_WRITE_PATHS=<collected-value>
FORM_SYNC_ENV=<collected-value>
```

After writing the file, tell the user to open it and paste their tokens:
> "I've saved your `.env` file. Two values need your attention — open `<workspace>/.env` in your editor and replace the placeholder markers for `AEM_TOKEN` and `GITHUB_TOKEN` with your actual tokens. Let me know when you're done."

**Never echo secrets back** to the user. Do not read or print token values from `.env` after the user has pasted them.

Wait for the user to confirm they've pasted the tokens before proceeding to Step 5.

### Step 5: Verify system requirements

Check that required tools are available:

```
node --version    # must be v18+
python3 --version # must be 3.10+
git --version
```

If any are missing, tell the user exactly what to install and from where.

### Step 6: Test connectivity

Run from the workspace:

```
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/eds-code-sync" test
```

This verifies both AEM and GitHub access. If it fails:
- Identify which credential is wrong from the error message
- If it's a **token** issue (401/403): tell the user to open `.env` and re-paste the token directly. Do NOT ask them to paste it in the conversation — terminal escaping will corrupt it.
- If it's a **non-token** issue (wrong URL, repo name, etc.): ask for the corrected value conversationally, update `.env`
- Re-test

### Step 7: Sync EDS code

Once connectivity is confirmed, pull the latest EDS form code from the GitHub repo into the workspace's `code/` directory:

```
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/eds-code-sync" sync
```

This clones the repository configured in `GITHUB_REPO` and maps the relevant EDS form files (blocks, components, custom functions, API clients) into the local `code/` folder using the default file mapping.

> **Important:** The `code/` directory is **not** part of the workspace's own git repository — it is synced from the EDS GitHub repo independently. Do not commit it with the workspace. Add `code/` to the workspace's `.gitignore` if the workspace is version-controlled.

If the sync fails:
- Verify `GITHUB_REPO` and `GITHUB_TOKEN` are correct in `.env`
- Re-run `eds-code-sync test` to diagnose
- Check the file mapping with `eds-code-sync show-mapping`

Confirm to the user:
> "Synced latest EDS code into `code/`. This folder mirrors your GitHub repo and will stay in sync via `eds-code-sync`."

### Step 8: Confirm and hand off

> "Your workspace is ready at `<path>`. What would you like to build?"

## System Requirements

| Requirement | Minimum | Why |
|-------------|---------|-----|
| Node.js | 18+ | Runs the form validator, rule transformer, and rule save tools |
| Python | 3.10+ | Runs form sync, API manager, and rule validation |
| `git` | on PATH | Used by `eds-code-sync` and `git-sandbox` for repo operations |

> **Note:** The plugin bundles its own Python virtual environment and dependencies — you don't need to install any Python packages yourself. The first time the agent calls a Python-based tool, a venv is created automatically inside the plugin directory.

## Workspace Directory Structure

```
<workspace-name>/
├── .env                           # Credentials (AEM + GitHub) — never commit
├── metadata.json                  # Tracks synced forms (auto-managed by form-sync)
├── sandbox.json                   # Git sandbox config (repo URL, branch, allowed paths)
├── .agent/                        # Agent memory — handover, history, session log
│   ├── handover.md
│   ├── history.md
│   └── sessions.md
├── repo/
│   └── content/forms/af/         # Mirrors AEM content path — pulled forms land here
│       └── <team>/<app>/
│           └── <form>/
│               ├── <form>.form.json
│               └── <form>.rule.json
├── refs/
│   ├── metadata.json             # Fragment registry
│   ├── apis/                     # OpenAPI 3.0 YAML specs and generated clients
│   └── <fragment>.form.json      # Fragment content (read-only references)
├── code/
│   └── blocks/form/              # EDS project code (synced from GitHub via git-sandbox)
│       ├── scripts/              # Custom functions (form-level, fragment, shared libs)
│       ├── api-clients/          # Deployed API client JS files
│       └── components/           # Custom component definitions
├── journeys/
│   └── <journey>.md              # Requirement docs & user stories (input)
└── plans/
    └── <journey>/                # Execution plans generated from journeys
        ├── 01-form-structure.md
        ├── 02-business-rules.md
        └── ...
```

### What each directory is for

| Directory | Purpose |
|-----------|---------|
| `repo/` | Mirrors AEM Author content structure; forms are pulled here under their AEM content path |
| `refs/` | Read-only references — fragments, API specs, and generated API clients (staging area) |
| `code/` | Mirrors your EDS GitHub repo; contains blocks, custom functions, API clients, and components |
| `journeys/` | Input requirement documents and user stories that describe what the form should do |
| `plans/` | Sequentially ordered execution plans generated by analyzing journeys |
| `.agent/` | Agent memory — handover state, history, and session log for continuity across sessions |

## Workspace Resolution

All CLI tools shipped with the plugin auto-resolve the workspace directory by reading `FORMS_WORKSPACE` from `.env`. This value is written during Step 2 of this setup flow. If the value is not found, tools fall back to the current working directory.

**Resolution order (first match wins):**

1. **`FORMS_WORKSPACE` already in environment** — e.g. exported by the caller
2. **`FORMS_WORKSPACE` read from `.env` in cwd** — written during this setup flow
3. **Fall back to cwd** — backwards-compatible default

> **Key point:** `FORMS_WORKSPACE` must be the first entry in `.env`. This is how every tool — form-sync, api-manager, rule-save, scaffold-form, etc. — knows where to find the workspace and all its files.

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `FORMS_WORKSPACE` | Yes (auto) | Absolute path to workspace root — first line of `.env`, written during setup, read by all tools |
| `AEM_HOST` | Yes | AEM Cloud Service Author URL |
| `AEM_TOKEN` | Yes* | Bearer token from AEM Developer Console |
| `AEM_USERNAME` | Yes* | Basic auth username (alternative to token) |
| `AEM_PASSWORD` | Yes* | Basic auth password (alternative to token) |
| `GITHUB_URL` | Yes | Full GitHub URL for the EDS repo |
| `AEM_WRITE_PATHS` | Yes | Comma-separated AEM paths allowed for push |
| `GITHUB_REPO` | Yes | Repository in `owner/repo` format |
| `GITHUB_TOKEN` | Yes | Classic personal access token with `repo` scope (starts with `ghp_`) |
| `GITHUB_BRANCH` | No | Branch to sync from (default: `main`) |
| `FORM_SYNC_ENV` | No | Environment profile — `local`, `stage`, or `prod` (default: `prod`) |
| `UE_SERVICE_URL` | No | Universal Editor Service URL |
| `UE_BEARER_TOKEN` | No | Universal Editor token (if static) |
| `FORM_SYNC_REPO_DIR` | No | Local directory for editable form files (default: `./repo`) |
| `FORM_SYNC_REFS_DIR` | No | Local directory for reference files (default: `./refs`) |
| `DEBUG` | No | Set to `true` to enable rule bridge debug output |

*Either `AEM_TOKEN` or `AEM_USERNAME` + `AEM_PASSWORD` must be provided.

## CLI Tools Reference

| Tool | Location | Purpose |
|------|----------|---------|
| `form-sync` | `skills/sync-forms/scripts/` | Sync forms between AEM Author and local workspace |
| `eds-code-sync` | `skills/sync-eds-code/scripts/` | Sync EDS code between GitHub and local via git |
| `api-manager` | `scripts/` (shared) | Manage API definitions, generate typed JS clients |
| `form-validate` | `skills/create-form/scripts/` | Validate form.json against EDS field schemas |
| `git-sandbox` | `skills/git-sandbox/scripts/` | Sandboxed git operations for AI agents |
| `scaffold-form` | `skills/scaffold-form/scripts/` | Scaffold empty form JSON from template |
| `rule-transform` | `scripts/` (shared) | Transform form JSON for rule editing |
| `rule-validate` | `scripts/` (shared) | Validate rule JSON against grammar |
| `rule-save` | `scripts/` (shared) | Save rules back to rule store |
| `rule-grammar` | `scripts/` (shared) | Print rule grammar reference |
| `parse-functions` | `scripts/` (shared) | Parse custom function JSDoc annotations |

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| `node: command not found` | Node.js not installed | Install Node.js 18+ from [nodejs.org](https://nodejs.org) |
| `python3: command not found` | Python not installed | Install Python 3.10+ from [python.org](https://python.org) |
| `AEM_HOST not set` | Missing `.env` or missing variable | Re-run setup or manually add `AEM_HOST` to `.env` |
| Tool reads wrong `.env` | `FORMS_WORKSPACE` missing from `.env` | Add `FORMS_WORKSPACE=/absolute/path/to/workspace` as the first line of your workspace's `.env` |
| Tool writes files in wrong directory | `FORMS_WORKSPACE` missing from `.env` | Add `FORMS_WORKSPACE=/absolute/path/to/workspace` as the first line of your workspace's `.env` |
| `401 Unauthorized` from AEM | Token expired or invalid | Regenerate bearer token from AEM Developer Console |
| `403 Forbidden` on push | Path not in allowlist | Add the AEM path to `AEM_WRITE_PATHS` in `.env` |
| `eds-code-sync test` fails for GitHub | Bad token or wrong repo | Verify `GITHUB_TOKEN` has `repo` scope and `GITHUB_REPO` is correct |
| Python venv errors | Corrupted venv | Delete the venv directory inside the plugin and retry (it auto-recreates) |
| `sandbox.json` not found | Missing config | Create `sandbox.json` in workspace root — run `git-sandbox example-config` for a starter |
| Forms not appearing after pull | Wrong DAM path | Use `form-sync list <dam-path>` to discover correct paths first |
| `.env` committed to git | Security risk | Add `.env` to `.gitignore` immediately; rotate all exposed credentials |