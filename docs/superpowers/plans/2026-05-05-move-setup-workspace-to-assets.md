# Move setup-workspace to Orchestrator Assets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the `forms-infra` domain entirely by moving `setup-workspace/SKILL.md` into `forms-orchestrator/assets/setup-workspace.md` and deregistering it from the plugin, so setup is a plain orchestrator-read document rather than a separately loadable skill.

**Architecture:** `setup-workspace` becomes `skills/forms-orchestrator/assets/setup-workspace.md` — an inline asset the orchestrator reads directly at the workspace gate instead of routing to a registered skill. The entire `skills/forms-infra/` directory is deleted. All references to `infra › setup-workspace` become direct references to `assets/setup-workspace.md`. The registered skill count drops from 10 to 9.

**Tech Stack:** Markdown only — no code changes, no build steps.

---

## File Map

| Action | Path |
|--------|------|
| Create | `skills/forms-orchestrator/assets/setup-workspace.md` |
| Delete | `skills/forms-infra/` (entire directory) |
| Modify | `.claude-plugin/plugin.json` |
| Modify | `skills/forms-orchestrator/SKILL.md` |
| Modify | `skills/forms-orchestrator/assets/routing-table.md` |
| Modify | `skills/forms-orchestrator/assets/guidelines.md` |
| Modify | `skills/forms-orchestrator/references/domain-registry/SKILL.md` |
| Modify | `skills/forms-orchestrator/references/domain-registry/assets/skills-catalog.md` |
| Modify | `skills/forms-orchestrator/README.md` |
| Verify | `skills/forms-orchestrator/tutorial.md` |
| Modify | `README.md` |

---

## Task 1: Copy setup-workspace content to orchestrator assets

**Files:**
- Create: `skills/forms-orchestrator/assets/setup-workspace.md`

- [ ] **Step 1: Read the source file**

  ```bash
  cat skills/forms-infra/references/setup-workspace/SKILL.md
  ```

- [ ] **Step 2: Write the asset file (strip YAML frontmatter)**

  Read `skills/forms-infra/references/setup-workspace/SKILL.md`. The file starts with a YAML frontmatter block (lines 1–17: opening `---` on line 1, closing `---` on line 17, then a blank line on line 18). Write the file to `skills/forms-orchestrator/assets/setup-workspace.md` starting from line 19 onward (i.e., from `# Workspace Setup` — skip the blank line after the closing `---`). The rest of the content is preserved exactly as-is.

- [ ] **Step 3: Verify the asset file starts with the heading**

  ```bash
  head -3 skills/forms-orchestrator/assets/setup-workspace.md
  ```
  Expected first line: `# Workspace Setup`

---

## Task 2: Delete the forms-infra directory

**Files:**
- Delete: `skills/forms-infra/` (entire directory)

- [ ] **Step 1: Confirm directory contents**

  ```bash
  find skills/forms-infra/ -type f | sort
  ```
  Expected: `skills/forms-infra/LICENSE`, `skills/forms-infra/SKILL.md`, `skills/forms-infra/references/setup-workspace/SKILL.md`

- [ ] **Step 2: Delete the directory**

  ```bash
  rm -rf skills/forms-infra/
  ```

- [ ] **Step 3: Verify it is gone**

  ```bash
  ls skills/forms-infra/ 2>&1
  ```
  Expected: `ls: cannot access 'skills/forms-infra/': No such file or directory`

---

## Task 3: Deregister from plugin.json

**Files:**
- Modify: `.claude-plugin/plugin.json`

The current `skills` array has 10 entries. Remove `"./skills/forms-infra/references/setup-workspace"`.

- [ ] **Step 1: Read plugin.json to confirm current state**

  Read `.claude-plugin/plugin.json`. Confirm `"./skills/forms-infra/references/setup-workspace"` is present.

- [ ] **Step 2: Remove the entry**

  Edit `.claude-plugin/plugin.json`:

  Before (the relevant line in the `skills` array):
  ```
      "./skills/forms-infra/references/setup-workspace",
  ```

  After: *(line deleted)*

- [ ] **Step 3: Verify count is now 9**

  ```bash
  grep -c '"\./' .claude-plugin/plugin.json
  ```
  Expected: `9`

---

## Task 4: Update orchestrator SKILL.md routing step

**Files:**
- Modify: `skills/forms-orchestrator/SKILL.md`

The routing section lists 6 steps. Step 1 currently reads:
```
1. **Workspace gate** — no workspace? → `infra` › `setup-workspace` (hard block)
```

After this change, `setup-workspace` is no longer a routable skill — it is an asset the orchestrator reads directly.

- [ ] **Step 1: Read the routing section of orchestrator SKILL.md**

  Read `skills/forms-orchestrator/SKILL.md` lines 48–58. Confirm step 1 text.

- [ ] **Step 2: Update step 1**

  Edit `skills/forms-orchestrator/SKILL.md`:

  Before:
  ```
  1. **Workspace gate** — no workspace? → `infra` › `setup-workspace` (hard block)
  ```

  After:
  ```
  1. **Workspace gate** — no workspace? → read `assets/setup-workspace.md` and run setup inline (hard block)
  ```

- [ ] **Step 3: Verify**

  ```bash
  grep "Workspace gate" skills/forms-orchestrator/SKILL.md
  ```
  Expected: `1. **Workspace gate** — no workspace? → read \`assets/setup-workspace.md\` and run setup inline (hard block)`

---

## Task 5: Update routing-table.md (4 references)

**Files:**
- Modify: `skills/forms-orchestrator/assets/routing-table.md`

Four places reference `infra` or `infra › setup-workspace`:

1. Line 14 — architecture diagram: `no workspace? → infra › setup-workspace`
2. Line 57 — Step 1 table: `Route to Domain Registry → \`infra\` › \`setup-workspace\``
3. Line 152 — direct routing example: `| "Push my form to AEM" | \`infra\` | Single deploy action...`
4. Line 263 — decision summary: `→ Step 1 → setup-workspace (hard gate)`

- [ ] **Step 1: Read routing-table.md to confirm exact text**

  Read `skills/forms-orchestrator/assets/routing-table.md`.

- [ ] **Step 2: Update line 14 — architecture diagram**

  Before:
  ```
  │  Step 1: Workspace Gate                 │──→ no workspace? → infra › setup-workspace
  ```
  After:
  ```
  │  Step 1: Workspace Gate                 │──→ no workspace? → read assets/setup-workspace.md inline
  ```

- [ ] **Step 3: Update line 57 — Step 1 table**

  Before:
  ```
  | `FORMS_WORKSPACE` not set AND no `.env` found | Route to Domain Registry → `infra` › `setup-workspace`. Halt all other routing until setup completes. |
  ```
  After:
  ```
  | `FORMS_WORKSPACE` not set AND no `.env` found | Read `assets/setup-workspace.md` and follow the setup steps inline. Halt all other routing until setup completes. |
  ```

- [ ] **Step 4: Remove line 152 — stale infra row in direct routing table**

  The `infra` domain no longer exists. "Push my form to AEM" via git is now handled inline by the orchestrator following the deploy steps in `assets/routing-table.md` itself. Remove this row.

  Before (within the "When to Use Direct Domain Routing" table):
  ```
  | "Push my form to AEM" | `infra` | Single deploy action, not a build workflow |
  ```
  After: *(line deleted)*

- [ ] **Step 5: Update line 263 — decision summary**

  Before:
  ```
       ├─ No workspace?           → Step 1 → setup-workspace (hard gate)
  ```
  After:
  ```
       ├─ No workspace?           → Step 1 → read assets/setup-workspace.md inline (hard gate)
  ```

- [ ] **Step 6: Verify no remaining `infra` references in routing-table.md**

  ```bash
  grep -n "\`infra\`\|infra.*setup-workspace" skills/forms-orchestrator/assets/routing-table.md
  ```
  Expected: 0 hits

---

## Task 6: Update guidelines.md (2 references)

**Files:**
- Modify: `skills/forms-orchestrator/assets/guidelines.md`

Two lines reference `infra › setup-workspace`:

1. Line 47 — workspace gate table: `Route to Domain Registry → \`infra\` › \`setup-workspace\``
2. Line 49 — note: `except \`setup-workspace\` itself`

- [ ] **Step 1: Read the workspace gate section of guidelines.md**

  Read `skills/forms-orchestrator/assets/guidelines.md` lines 38–52.

- [ ] **Step 2: Update line 47 — workspace gate table**

  Before:
  ```
  | Workspace missing | Route to Domain Registry → `infra` › `setup-workspace` immediately. **Block all other routing until complete.** |
  ```
  After:
  ```
  | Workspace missing | Read `assets/setup-workspace.md` and follow the setup steps inline. **Block all other routing until complete.** |
  ```

- [ ] **Step 3: Update line 49 — exception note**

  Before:
  ```
  > No domain, no skill, no plan may execute without a resolved workspace — except `setup-workspace` itself.
  ```
  After:
  ```
  > No domain, no skill, no plan may execute without a resolved workspace.
  ```

- [ ] **Step 4: Verify no remaining `infra › setup-workspace` in guidelines.md**

  ```bash
  grep -n "infra.*setup-workspace\|setup-workspace.*infra" skills/forms-orchestrator/assets/guidelines.md
  ```
  Expected: 0 hits

---

## Task 7: Update domain-registry SKILL.md

**Files:**
- Modify: `skills/forms-orchestrator/references/domain-registry/SKILL.md`

Two updates:
1. Remove the `infra` row from the Registry table (line 33)
2. Update the skills count: "Full catalog of all 16 skills across 6 domains" → "Full catalog of all 8 skills across 5 domains"

- [ ] **Step 1: Read domain-registry SKILL.md**

  Read `skills/forms-orchestrator/references/domain-registry/SKILL.md`.

- [ ] **Step 2: Remove the infra row from the Registry table**

  Before (within the Registry table):
  ```
  | `infra` | [`references/infra/SKILL.md`](references/infra/SKILL.md) | Infrastructure — workspace setup, EDS code sync, git |
  ```
  After: *(line deleted)*

- [ ] **Step 3: Update domain count in the skills catalog link text**

  Before:
  ```
  Full catalog of all 16 skills across 6 domains, plus intent-based routing for direct domain routing: **[`assets/skills-catalog.md`](assets/skills-catalog.md)**
  ```
  After:
  ```
  Full catalog of all 8 skills across 5 domains, plus intent-based routing for direct domain routing: **[`assets/skills-catalog.md`](assets/skills-catalog.md)**
  ```

- [ ] **Step 4: Verify**

  ```bash
  grep -n "infra\|16 skills\|6 domains" skills/forms-orchestrator/references/domain-registry/SKILL.md
  ```
  Expected: 0 hits

---

## Task 8: Update skills-catalog.md

**Files:**
- Modify: `skills/forms-orchestrator/references/domain-registry/assets/skills-catalog.md`

Three updates:
1. Remove row 8 (`infra` | `setup-workspace`)
2. Update the header count: "All 9 skills" → "All 8 skills"
3. Remove the infra intent routing row from the Intent→Domain table

- [ ] **Step 1: Read skills-catalog.md**

  Read `skills/forms-orchestrator/references/domain-registry/assets/skills-catalog.md`.

- [ ] **Step 2: Remove the setup-workspace row**

  Before (row 8):
  ```
  | 8 | `infra` | `setup-workspace` | Initialize project, configure credentials | setup, workspace, credentials, initialize |
  ```
  After: *(line deleted)*

- [ ] **Step 3: Update header count**

  Before:
  ```
  All 9 skills
  ```
  (or wherever the count appears in the header/title)

  After:
  ```
  All 8 skills
  ```

- [ ] **Step 4: Remove infra intent routing row**

  Before (in the Intent→Domain routing table):
  ```
  | Setup, credentials, workspace initialization | `infra` | `setup-workspace` |
  ```
  After: *(line deleted)*

- [ ] **Step 5: Verify**

  ```bash
  grep -n "infra\|setup-workspace\|9 skills" skills/forms-orchestrator/references/domain-registry/assets/skills-catalog.md
  ```
  Expected: 0 hits

---

## Task 9: Update orchestrator README.md

**Files:**
- Modify: `skills/forms-orchestrator/README.md`

Six updates:
1. Line 67 routing table: `infra › setup-workspace (hard block)` → `read assets/setup-workspace.md inline (hard block)`
2. Line 86 domains table: remove `infra` row
3. Line 148 "Get Started" link: update from `skills/forms-infra/references/setup-workspace/SKILL.md` to `skills/forms-orchestrator/assets/setup-workspace.md`
4. Line 154 paragraph: remove `infra` from the 6-domain list → 5 domains
5. Lines 271–273 directory tree: remove `forms-infra/` entry
6. Line 323 contributing guidance: remove `infra` from domain list

- [ ] **Step 1: Read the affected sections**

  Read `skills/forms-orchestrator/README.md` lines 60–100 and 140–160 and 265–290.

- [ ] **Step 2: Update routing table (line 67)**

  Before:
  ```
  | 1 | **Workspace gate** | No workspace detected? | → `infra` › `setup-workspace` (hard block) |
  ```
  After:
  ```
  | 1 | **Workspace gate** | No workspace detected? | → read `assets/setup-workspace.md` inline (hard block) |
  ```

- [ ] **Step 3: Remove infra row from domains table (line 86)**

  Before (within the domains table):
  ```
  | `infra` | Workspace setup | `setup-workspace` |
  ```
  After: *(line deleted)*

- [ ] **Step 4: Update "Get Started" link (line 148)**

  Before:
  ```
  See [`skills/forms-infra/references/setup-workspace/SKILL.md`](../forms-infra/references/setup-workspace/SKILL.md) for the full workspace layout, credential reference, and configuration guide.
  ```
  After:
  ```
  See [`skills/forms-orchestrator/assets/setup-workspace.md`](assets/setup-workspace.md) for the full workspace layout, credential reference, and configuration guide.
  ```

- [ ] **Step 5: Update 6-domain paragraph (line 154)**

  Before:
  ```
  See the orchestrator for the complete routing table and available skills across all six domains: `analysis`, `content-author`, `rule-creator`, `integration`, `infra`, and `context-management`.
  ```
  After:
  ```
  See the orchestrator for the complete routing table and available skills across all five domains: `analysis`, `content-author`, `rule-creator`, `integration`, and `context-management`.
  ```

- [ ] **Step 6: Remove forms-infra entry from directory tree (lines 271–273)**

  Before:
  ```
      ├── forms-infra/                     # Infra domain
      │   └── references/
      │       └── setup-workspace/
  ```
  After: *(3 lines deleted)*

- [ ] **Step 7: Update contributing guidance (line 323)**

  Before:
  ```
  1. Decide which domain it belongs to (`analysis`, `content-author`, `rule-creator`, `integration`, `infra`, or `context-management`)
  ```
  After:
  ```
  1. Decide which domain it belongs to (`analysis`, `content-author`, `rule-creator`, `integration`, or `context-management`)
  ```

- [ ] **Step 8: Verify no remaining infra domain references**

  ```bash
  grep -n "forms-infra\|infra.*setup-workspace\|\`infra\`" skills/forms-orchestrator/README.md
  ```
  Expected: 0 hits

---

## Task 10: Verify orchestrator tutorial.md (no changes needed)

**Files:**
- Verify: `skills/forms-orchestrator/tutorial.md`

The "What Each Skill Did" table at line 110 references `setup-workspace` by name with no path link. This row remains accurate — the user still runs setup; the orchestrator now reads the instructions inline from `assets/setup-workspace.md` rather than routing to a registered skill, but from the user's perspective nothing changes. No edits required.

- [ ] **Step 1: Confirm there are no path references to forms-infra in tutorial.md**

  ```bash
  grep -n "forms-infra\|infra.*setup-workspace" skills/forms-orchestrator/tutorial.md
  ```
  Expected: 0 hits (the `setup-workspace` row in the skill table uses no path, so nothing to fix).

---

## Task 11: Update repo root README.md

**Files:**
- Modify: `README.md`

Two updates:
1. Line 35 domains table: remove `infra` row
2. Lines 55–56 directory tree: remove `forms-infra/` line

- [ ] **Step 1: Read README.md lines 28–60**

  Read `README.md` lines 28–60.

- [ ] **Step 2: Remove infra row from domains table**

  Before (within the domains table):
  ```
  | `infra` | `setup-workspace` |
  ```
  After: *(line deleted)*

- [ ] **Step 3: Remove forms-infra from directory tree**

  Before:
  ```
  │   ├── forms-infra/                    ← infra domain
  ```
  After: *(line deleted)*

- [ ] **Step 4: Verify**

  ```bash
  grep -n "forms-infra\|infra" README.md
  ```
  Expected: 0 hits

---

## Verification

Run all checks after completing all tasks:

```bash
# 1. No remaining forms-infra directory references in markdown
grep -rn "forms-infra\|infra.*setup-workspace\|setup-workspace.*infra\|\`infra\` " . \
  --include="*.md" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=".git" \
  --exclude-dir=docs --exclude-dir=evals
# Expected: 0 hits

# 2. plugin.json has 9 skills
grep -c '"\./' .claude-plugin/plugin.json
# Expected: 9

# 3. setup-workspace.md exists as orchestrator asset
ls skills/forms-orchestrator/assets/setup-workspace.md
# Expected: file listed

# 4. setup-workspace.md starts with the heading (no frontmatter)
head -1 skills/forms-orchestrator/assets/setup-workspace.md
# Expected: # Workspace Setup

# 5. forms-infra directory is gone
ls skills/forms-infra/ 2>&1
# Expected: ls error (no such file or directory)

# 6. Domain registry no longer lists infra
grep "infra" skills/forms-orchestrator/references/domain-registry/SKILL.md
# Expected: 0 hits

# 7. Skills catalog shows 8 skills
grep "8 skills\|All 8" skills/forms-orchestrator/references/domain-registry/assets/skills-catalog.md
# Expected: 1 hit
```
