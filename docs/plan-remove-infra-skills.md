# Plan: Remove `sync-eds-code` + `git-sandbox` and Migrate to `.skills-workspace` Model

## Context

The current workspace model has two sources of unnecessary complexity:

1. **`sync-eds-code`** — a Python CLI that maintains a `code/` directory as a **copy** of EDS form files synced from GitHub, with bidirectional file mapping, temp-clone validation, and push/PR handling — all of which duplicate what native git already does.
2. **`git-sandbox`** — a Python CLI that clones the repo into a separate sparse-checkout workspace and gates commits/pushes through path validation rules — unnecessary when the agent is already working inside the live EDS repo.

The new model eliminates both tools entirely: the EDS GitHub repo IS the working directory. A `.skills-workspace/` folder lives inside the EDS repo root (gitignored). Skills that referenced `code/blocks/form/X` now reference `blocks/form/X` directly. Git operations use native `git` commands. This removes both Python CLIs, keeps setup at 8 steps (old Step 7 "sync" is replaced by new Step 7 "add to .gitignore"), and makes validation trivial (`npm run lint` directly in the repo).

---

## New Workspace Structure

```
<eds-repo-root>/                   ← EDS GitHub repo (user's existing repo)
├── .claude/settings.json          ← hooks (at repo root — Claude Code reads from here)
├── blocks/form/                   ← Edit EDS code directly here
│   ├── functions.js
│   ├── mappings.js
│   ├── scripts/
│   ├── api-clients/
│   └── components/
├── package.json                   ← lint/build live here
├── .gitignore                     ← must contain .skills-workspace
└── .skills-workspace/             ← agent workspace (gitignored from EDS repo)
    ├── .env                       ← FORMS_WORKSPACE + FORMS_EDS_ROOT + AEM creds
    ├── CLAUDE.md
    ├── .agent/
    ├── repo/                      ← pulled AEM forms
    ├── refs/apis/                 ← OpenAPI specs
    ├── journeys/
    └── plans/
```

**New env vars written by `setup-workspace`:**
- `FORMS_WORKSPACE` — absolute path to `.skills-workspace/` (semantics unchanged)
- `FORMS_EDS_ROOT` — absolute path to the EDS repo root (parent of `.skills-workspace/`)

GitHub creds demoted from required → optional: `GITHUB_TOKEN` is only needed for authenticated `git push` over HTTPS or `gh pr create`; `GITHUB_REPO`, `GITHUB_URL`, `GITHUB_BRANCH` become fully optional, commented out in `.env`.

---

## Files to Delete

| Path | Action |
|------|--------|
| `skills/forms-infra/references/sync-eds-code/` | Delete entire directory (SKILL.md + scripts/) |
| `skills/forms-infra/references/git-sandbox/` | Delete entire directory (SKILL.md + scripts/) |

---

## Files to Update (18 files)

### 1. `.claude-plugin/plugin.json`
Remove two entries from the `skills` array:
```
"./skills/forms-infra/references/sync-eds-code",
"./skills/forms-infra/references/git-sandbox",
```
Count goes from 12 → 10 skills.

---

### 2. `skills/forms-infra/references/setup-workspace/SKILL.md` *(major rewrite)*

**Step 1** — Change from "ask for workspace name" to "confirm EDS repo root":
- Check that `package.json` and `blocks/form/` exist in cwd
- Workspace name is now fixed as `.skills-workspace` (not user-chosen)

**Step 2** — Update mkdir and first `.env` entries:
```bash
# Before
mkdir -p <name>/{repo,refs/apis,code/blocks/form/{scripts,api-clients,components},journeys,plans,.agent}
FORMS_WORKSPACE=<cwd>/<name>

# After (workspace dir only — no code/ subdirectory)
mkdir -p .skills-workspace/{repo,refs/apis,.agent,journeys,plans}
mkdir -p .claude   # at EDS repo root, for settings.json hooks
FORMS_WORKSPACE=<cwd>/.skills-workspace
FORMS_EDS_ROOT=<cwd>
```

Also update the embedded CLAUDE.md template written during Step 2 (lines 82–129 of `setup-workspace/SKILL.md`):
- Remove `Session Pre-Flight` command that runs `eds-code-sync test` (line 96) — replace with AEM connectivity check
- Remove `Workspace Setup Checklist` bullet that says "Connectivity passes — `eds-code-sync test`" (line 112)
- Remove GitHub error-recovery guidance referencing `GITHUB_TOKEN`/`GITHUB_REPO`

**Step 3** — Credentials: move `GITHUB_URL`, `GITHUB_REPO`, `GITHUB_TOKEN`, `GITHUB_BRANCH` from required → optional (comment them out in `.env` template with note: "required for authenticated git push over HTTPS or `gh pr create`").

**Step 4** — `.env` template: Add `FORMS_EDS_ROOT`. GitHub vars become commented-out optional block.

**Step 5** — System requirements: update `git` row to remove "Used by `eds-code-sync`". Update `python` row to remove "Runs form sync" — keep "Runs API manager and rule validation".

**Step 6** — Connectivity check: replace `eds-code-sync test` with AEM-only check:
```bash
# Before
"${CLAUDE_PLUGIN_ROOT}/skills/forms-infra/scripts/eds-code-sync" test

# After: use get-aem-sites MCP tool, or curl:
curl -sf -o /dev/null -H "Authorization: Bearer $AEM_TOKEN" "${AEM_HOST}/api/assets.json"
```

**New Step 7** — Add `.skills-workspace` to EDS repo's `.gitignore`:
```bash
echo '.skills-workspace' >> .gitignore
```

**Remove old Step 7** (the `eds-code-sync sync` step) entirely.

**Step 8 → Step 8** — Hand-off: update confirmation message to reference `.skills-workspace/` inside EDS repo.

**Workspace Directory Structure table** — remove `code/` and `sandbox.json` rows; move `.claude/settings.json` to EDS repo root in diagram; add EDS repo root layout showing `blocks/form/` directly.

**Env var table** — add `FORMS_EDS_ROOT` as required-auto; `GITHUB_TOKEN` as optional (for authenticated git push over HTTPS or `gh pr create`); `GITHUB_URL`, `GITHUB_REPO`, `GITHUB_BRANCH` all optional/commented-out.

**Troubleshooting** — remove `eds-code-sync test fails for GitHub` and `sandbox.json not found` rows.

**CLI tools reference table** — remove `eds-code-sync` and `git-sandbox` rows.

**Headless Workspace Validation section** (lines 480–492) — remove the `eds-code-sync test` bash command (line 487); remove `GITHUB_REPO`/`GITHUB_TOKEN` from the env var check list; replace with AEM-only curl check.

**Lint hook in `<eds-repo-root>/.claude/settings.json`** — `settings.json` moves from `.skills-workspace/.claude/` to the EDS repo root `.claude/`. The lint hook `lint_dir` changes from `$CLAUDE_PROJECT_DIR/code` to `$CLAUDE_PROJECT_DIR` (since `$CLAUDE_PROJECT_DIR` IS the EDS repo root where `package.json` lives — no env var sourcing needed).

---

### 3. `skills/forms-infra/SKILL.md`

- Remove routing row for `sync-eds-code` ("pull/push EDS code")
- Remove routing row for `git-sandbox` ("sandboxed git commit/push/reset")
- Remove Skills table rows #2 (`sync-eds-code`) and #3 (`git-sandbox`); `setup-workspace` becomes the only infra skill
- Remove Skill Locations rows for both deleted skills
- Remove `sandbox.json` row from Config Files table
- File Locations: `code/blocks/form/` → `blocks/form/` (in `$FORMS_EDS_ROOT`)
- Dependencies: `sync-eds-code, git-sandbox` → `(none — native git)`
- Plan Integration: `sync-eds-code, git-sandbox` → `native git commands (add, commit, push, branch)`

---

### 4. `skills/forms-rule-creator/SKILL.md`

Line 112:
```
# Before
Store the function in `code/blocks/form/functions.js`

# After
Store the function in `blocks/form/functions.js` (EDS repo root, i.e. `$FORMS_EDS_ROOT/blocks/form/functions.js`)
```

---

### 5. `skills/forms-integration/SKILL.md`

Line 66 guard policy and line 76 file locations:
```
# Before
`code/blocks/form/api-clients/`

# After
`blocks/form/api-clients/` (in `$FORMS_EDS_ROOT`)
```

---

### 6. `skills/forms-integration/references/manage-apis/SKILL.md`

- Line 35 critical rule #3: `code/blocks/form/api-clients/` → `blocks/form/api-clients/`
- Line 66 diff command (both sides must be absolute since paths come from different roots):
  ```bash
  # Before
  diff -rq refs/apis/api-clients/ code/blocks/form/api-clients/
  # After
  diff -rq "$FORMS_WORKSPACE/refs/apis/api-clients/" "$FORMS_EDS_ROOT/blocks/form/api-clients/"
  ```
- Line 206 file structure: `code/blocks/form/api-clients/` → `<eds-repo-root>/blocks/form/api-clients/`

---

### 7. `skills/forms-content-author/references/forms-custom-components/SKILL.md`

- Line 36 critical rule #2: `code/blocks/form/mappings.js` → `blocks/form/mappings.js` (EDS repo root)
- Line 84 workflow step: same path update
- Scaffolding command preamble: "Run from inside the `code` folder" → "Run from the EDS repo root (`$FORMS_EDS_ROOT`)"

---

### 8. `skills/forms-analysis/references/jud-to-screen/SKILL.md`

Line 350:
```
# Before
[README](code/blocks/form/components/<name>/README.md)

# After
[README](blocks/form/components/<name>/README.md)
```

---

### 9. `skills/forms-context-management/references/manage-context/SKILL.md`

Line 217:
```
# Before
| Form script | `code/blocks/form/scripts/form/<name>.js` |

# After
| Form script | `blocks/form/scripts/form/<name>.js` (EDS repo root) |
```

---

### 10. `README.md` *(repo root)*

- Line 35: `| infra | setup-workspace, sync-eds-code, git-sandbox |` → `| infra | setup-workspace |`
- Line 58: `forms-shared/ ← shared scripts (api-manager, eds-code-sync, etc.)` → `forms-shared/ ← shared scripts (api-manager, etc.)`

---

### 11. `skills/forms-orchestrator/README.md`

- Line 86 domains table: remove `sync-eds-code`, `git-sandbox`; `infra` description → "Workspace setup"
- Line 115 system requirements: `eds-code-sync and git-sandbox` → `git` (for version control in the EDS repo); `python` row: remove "form sync" from description
- Lines 274–275: remove both `├── sync-eds-code/` and `└── git-sandbox/` from directory tree
- Lines 285–286: remove `├── eds-code-sync` and `├── git-sandbox` from CLI tools list
- Line 323–324: remove both `eds-code-sync` and `git-sandbox` rows from Skill-Embedded CLI Tools table

---

### 12. `skills/forms-orchestrator/tutorial.md`

Line 34 — workspace tree:
```
# Before
├── code/                 ← your EDS project code

# After
(remove this line — EDS code is now at the repo root, not a subdirectory)
```

---

### 13. `skills/forms-orchestrator/references/domain-registry/assets/skills-catalog.md`

- Remove row 9 (`sync-eds-code`) and row 10 (`git-sandbox`)
- Renumber remaining row(s) accordingly
- Update header count: "All 12 skills" → "All 9 skills" (the catalog has 11 data rows today; removing 2 leaves 9; note the header was already off-by-one vs reality)
- Intent→Domain table: `setup-workspace, sync-eds-code, git-sandbox` → `setup-workspace`

---

### 14. `skills/forms-orchestrator/references/domain-registry/assets/contribution-guide.md`

Lines 60, 83–92 — illustrative CLI invocation examples use `eds-code-sync` as their example tool. Replace with `api-manager` (its actual path is `skills/forms-shared/scripts/api-manager`):
```bash
# Before (correct example)
"${CLAUDE_PLUGIN_ROOT}/skills/forms-infra/scripts/eds-code-sync" sync

# After (correct example — api-manager lives in forms-shared, not forms-integration)
"${CLAUDE_PLUGIN_ROOT}/skills/forms-shared/scripts/api-manager" list
```
Update the three ❌ wrong-usage examples accordingly (same substitution).

---

### 15. `skills/forms-orchestrator/assets/guidelines.md`

- Lines 30, 37: Remove both `eds-code-sync` and `git-sandbox` rows from Available Scripts table
- Line 58: Remove mention of `sandbox.json` from workspace resolution description
- Line 116: Remove `sandbox.json` row from Config Files table
- Lines 141–144 File Locations table:
  ```
  # Before
  code/blocks/form/scripts/fragment/<fragment>.js
  code/blocks/form/scripts/form/<form>.js
  code/blocks/form/scripts/script-libs/libs.js
  code/blocks/form/api-clients/

  # After
  blocks/form/scripts/fragment/<fragment>.js  (in $FORMS_EDS_ROOT)
  blocks/form/scripts/form/<form>.js          (in $FORMS_EDS_ROOT)
  blocks/form/scripts/script-libs/libs.js     (in $FORMS_EDS_ROOT)
  blocks/form/api-clients/                    (in $FORMS_EDS_ROOT)
  ```

---

### 16. `skills/forms-orchestrator/assets/routing-table.md`

**Line 19 — Pre-Flight Check label:**
```
# Before
│  Step 1.5: Pre-Flight Check  │──→ eds-code-sync test (skip if mid-execution)

# After
│  Step 1.5: Pre-Flight Check  │──→ AEM connectivity check (skip if mid-execution)
```

**Line 71 — Pre-Flight bash command:**
```bash
# Before
"${CLAUDE_PLUGIN_ROOT}/skills/forms-infra/scripts/eds-code-sync" test

# After: use get-aem-sites MCP call or curl to AEM_HOST
curl -sf -o /dev/null -H "Authorization: Bearer $AEM_TOKEN" "${AEM_HOST}/api/assets.json"
```
Update failure table: remove GitHub failure row; update AEM 401 guidance.

**Lines 239–242 — Post-Plan deploy steps (EDS code):**
```
# Before
1. Validate — Run `eds-code-sync validate`
2. Push — Push with `eds-code-sync push --branch <name> --pr`
3. Wait for merge
4. Re-sync — Run `eds-code-sync sync`

# After
1. Validate — Run `npm run lint` in `$FORMS_EDS_ROOT`
2. Commit and push:
   git checkout -b <branch-name>
   git add blocks/form/
   git commit -m "<message>"
   git push origin <branch-name>
   # Then open PR on GitHub (provide URL or use `gh pr create` if gh CLI available)
3. Wait for merge
4. Pull latest — Run `git checkout main && git pull` in `$FORMS_EDS_ROOT`
```

---

### 17. `skills/forms-orchestrator/assets/error-handling.md`

Line 203:
```
# Before
| `AEM_HOST` + `AEM_TOKEN` env vars | `api-manager`, `eds-code-sync` | Set in shell or MCP config |

# After
| `AEM_HOST` + `AEM_TOKEN` env vars | `api-manager` | Set in shell or MCP config |
```

---

### 18. `skills/forms-orchestrator/SKILL.md`

Verify and remove any references to `sync-eds-code` or `git-sandbox` from the orchestrator's own routing logic or domain descriptions. The `infra` domain entry should list only `setup-workspace`.

---

## Verification

After all changes:

```bash
# 1. No remaining sync-eds-code, eds-code-sync, or git-sandbox references anywhere
grep -rn "sync-eds-code\|eds-code-sync\|eds_code_sync\|git-sandbox\|sandbox\.json" . \
  --include="*.md" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=".git"
# Expected: 0 hits

# 2. No remaining code/blocks/form paths in skill files (exclude historical eval reports)
grep -rn "code/blocks/form" skills/ --include="*.md" \
  | grep -v "evals/results"
# Expected: 0 hits

# 3. plugin.json has 10 skills
grep -c '"\./' .claude-plugin/plugin.json
# Expected: 10

# 4. FORMS_EDS_ROOT appears in setup-workspace
grep "FORMS_EDS_ROOT" skills/forms-infra/references/setup-workspace/SKILL.md
# Expected: multiple hits

# 5. Deleted directories are gone
ls skills/forms-infra/references/
# Expected: only setup-workspace/ remains

# 6. .claude/settings.json is NOT inside .skills-workspace in setup-workspace docs
grep "skills-workspace.*\.claude\|\.claude.*skills-workspace" \
  skills/forms-infra/references/setup-workspace/SKILL.md
# Expected: 0 hits (settings.json must live at EDS repo root)
```
