---
name: git-sandbox
description: >
  Provides a restricted, sandboxed git workspace for AI agents. Clones a repository
  using sparse checkout with configurable allowed paths, validates commits to ensure
  only permitted files are included, validates push branch names, supports rebase
  before push, and supports hard reset to clean state. Driven by a sandbox.json config file.
  Triggers: git sandbox, sandbox, workspace, restricted git, safe git, allowed paths,
  sparse checkout, isolated workspace, git-sandbox.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
allowed-tools: Read, Write, Edit, Bash
---

# Git Sandbox

You manage a restricted git workspace that ensures AI agents can only interact with approved files and branches, using the `git-sandbox` CLI.

## When to Use

- Setting up an isolated git workspace for safe code operations
- Committing changes with path validation (only allowed files)
- Pushing to pre-approved branch patterns
- Resetting a workspace to a clean state

## Critical Rules

1. **Always use the `git-sandbox` CLI** — do not use raw `git` commands in the sandbox workspace
2. **Check `sandbox.json` first** — all behavior is driven by this config file
3. **Init before use** — always `git-sandbox init` before any other operation
4. **Check status before commit** — `git-sandbox status` shows which files are allowed vs denied
5. **Never force-push** — the sandbox validates branch names to prevent accidents

## Tool Commands

| Action | Command |
|--------|---------|
| Initialize workspace | `git-sandbox init` |
| Check file status | `git-sandbox status` |
| Commit changes | `git-sandbox commit -m "message"` |
| Push to branch | `git-sandbox push <branch>` |
| Push (skip rebase) | `git-sandbox push <branch> --no-rebase` |
| Rebase onto origin | `git-sandbox rebase` |
| Show current branch | `git-sandbox branch` |
| Soft reset | `git-sandbox reset` |
| Hard reset (re-clone) | `git-sandbox reset --hard` |
| Show sample config | `git-sandbox example-config` |

## Workflow

1. **Configure** — create `sandbox.json` with repo URL, allowed paths, and branch patterns
2. **Init** — `git-sandbox init` to clone with sparse checkout
3. **Work** — edit files within allowed paths
4. **Check** — `git-sandbox status` to verify all changes are in allowed paths
5. **Commit** — `git-sandbox commit -m "description"` (validates paths)
6. **Rebase** — `git-sandbox rebase` to pull latest changes before pushing (optional, push does this automatically)
7. **Push** — `git-sandbox push feature-branch` (validates branch name, rebases by default)

## Configuration

Create `sandbox.json` in project root:

```json
{
  "repo": "https://${GITHUB_TOKEN}@github.com/owner/repo.git",
  "branch": "main",
  "workspace": "./workspace",
  "allowed_paths": [
    "blocks/form/**",
    "scripts/**"
  ],
  "allowed_branches": [
    "feature/*",
    "fix/*"
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `repo` | Yes | Git clone URL (supports `${VAR}` expansion from `.env`) |
| `branch` | Yes | Branch to clone from |
| `workspace` | No | Local workspace path (default: `./workspace`) |
| `allowed_paths` | No | Glob patterns for permitted files (default: `["**"]`) |
| `allowed_branches` | No | Glob patterns for permitted push branches (default: `["*"]`) |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Init fails | Check repo URL and `GITHUB_TOKEN` in `.env` |
| Commit rejected | Run `status` — some changed files are outside `allowed_paths` |
| Push rejected | Branch name doesn't match `allowed_branches` patterns |
| Rebase conflicts | Rebase auto-aborts on conflict; resolve manually or use `--no-rebase` on push |
| Stale workspace | Run `git-sandbox reset --hard` to re-clone |