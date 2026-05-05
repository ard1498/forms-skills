# Error Handling Guide for AEM Forms Skills

> **Task:** P6.2 — Define how tool errors are communicated across skills
> **Audience:** Skill authors and AI agents using the aem-forms plugin

---

## Overview

Each skill in the aem-forms plugin references CLI tools in `scripts/`. These tools can fail in various ways. This guide defines:

1. How each tool reports errors
2. How the AI agent should interpret and recover from errors
3. Standard patterns for error communication in SKILL.md files

---

## Error Reporting by Tool

### 1. Form Validator (`node scripts/eds_form_validator/validate.cjs`)

| Signal | Meaning |
|--------|---------|
| Exit code 0 | Validation ran (check JSON output for results) |
| Exit code 1 | File not found or JSON parse error |
| `--json` output `{ "valid": true }` | Form is valid |
| `--json` output `{ "valid": false, "errors": [...] }` | Form has validation errors |

**Agent behavior:**
- Always use `--json` flag for machine-readable output
- If `valid: false`, read the `errors` array — each entry has `field`, `message`, and `severity`
- Fix all `error`-severity issues before proceeding; `warning`-severity items are advisory
- If exit code 1: check the file path exists and contains valid JSON

**Common errors:**
| Error message | Cause | Fix |
|---------------|-------|-----|
| `Unknown fieldType: <type>` | Invalid field type in form.json | Check `references/field-types.md` for valid types |
| `Missing required property: name` | Field missing `name` key | Add `name` property matching the JSON key |
| `ENOENT: no such file` | Wrong file path | Verify path from workspace root |

---

### 2. Transform Form (`node scripts/rule_coder/bridge/cli/transform-form.js`)

| Signal | Meaning |
|--------|---------|
| Exit code 0 + JSON to stdout | Success — treeJson with component info |
| Exit code 1 + error to stderr | Form parse failure |

**Agent behavior:**
- Capture stdout (JSON) separately from stderr
- If exit code 1: the form.json is likely malformed — validate it first with the form validator
- The output JSON contains the component tree with qualified names — use these names (not guessed names) for rules

**Common errors:**
| Error message | Cause | Fix |
|---------------|-------|-----|
| `Cannot read properties of undefined` | Missing `sling:resourceType` on a field | Add the correct `sling:resourceType` |
| `Unexpected token` | form.json is not valid JSON | Fix JSON syntax |
| `Cannot find module 'lodash'` | node_modules not installed | Run `npm install` in `scripts/rule_coder/bridge/` |

---

### 3. Rule Validator (`python3 -m rule_coder.validator`)

| Signal | Meaning |
|--------|---------|
| Exit code 0 | Rule is valid |
| Exit code 1 | Rule is invalid — errors printed to stdout |
| Output line: `Valid: True` | Rule passes all grammar checks |
| Output line: `Valid: False` | Rule has grammar violations |
| Output lines: `ERROR: <msg>` | Specific grammar error |
| Output lines: `WARNING: <msg>` | Non-blocking issue |

**Agent behavior:**
- **MUST** validate before saving. Never save an invalid rule.
- If `Valid: False`, read the ERROR lines:
  - `Unknown nodeName: X` → Check `references/grammar-reference.md` for valid nodeNames
  - `Missing required field: X in Y` → The grammar node requires a specific child
  - `Invalid operator: X` → Use a valid operator from the grammar
- Fix errors and re-validate until `Valid: True`
- If form path is available, always use `--form <form.json>` to also validate component references

**Common errors:**
| Error message | Cause | Fix |
|---------------|-------|-----|
| `Unknown nodeName: <name>` | Using a grammar node that doesn't exist | Consult `grammar-reference.md` — only whitelisted nodeNames are valid |
| `Component not found: <name>` | Rule references a field not in the form | Run transform-form.js to get actual field names |
| `Missing required field` | Incomplete rule AST node | Check the grammar for required children of each node type |
| `ModuleNotFoundError` | PYTHONPATH not set correctly | Ensure `scripts/` is in PYTHONPATH |

---

### 4. Save Rule (`node scripts/rule_coder/bridge/cli/save-rule.js`)

| Signal | Meaning |
|--------|---------|
| Exit code 0 | Rule saved successfully |
| Exit code 1 | Save failed — error to stderr |

**Agent behavior:**
- **NEVER** call save-rule without validating first
- Use `--rule-store` mode when validating rules before applying via `patch-aem-page-content`
- If save fails, use `DEBUG=true` prefix to get a stack trace:
  ```
  DEBUG=true node scripts/rule_coder/bridge/cli/save-rule.js ...
  ```
- After a successful save, the rule store file is updated atomically

**Common errors:**
| Error message | Cause | Fix |
|---------------|-------|-----|
| `Component not found in form` | Rule references unknown component | Verify field names with transform-form.js |
| `Rule store file not found` | First rule for this form | The file will be created automatically |
| `ENOENT` | form.json path is wrong | Check the --form path |

---

### 5. Parse Functions (`node scripts/rule_coder/bridge/cli/parse-functions.js`)

| Signal | Meaning |
|--------|---------|
| Exit code 0 + `{ "success": true }` | Functions parsed successfully |
| Exit code 0 + `{ "success": false }` | Parse completed but found issues |
| Exit code 1 | File not found or critical error |

**Agent behavior:**
- Check `success` field in JSON output, not just exit code
- If `success: false`, the `customFunction` array may be empty — indicates JSDoc annotation issues
- Each function in `customFunction` has `name`, `params`, `returnType`
- If a function is missing from the output, its JSDoc is malformed

**Common errors:**
| Error message | Cause | Fix |
|---------------|-------|-----|
| `No functions found` | Missing JSDoc `@name` annotation | Add `@name` tag to JSDoc block |
| `ENOENT` | File path wrong | Verify the script file exists |

---

### 6. API Manager (`python3 scripts/api_manager/cli.py`)

| Signal | Meaning |
|--------|---------|
| Exit code 0 | Command succeeded |
| Exit code 1 | Error (message to stderr) |
| Exit code 2 | Usage error (wrong arguments) |

**Agent behavior:**
- Use `--json` flag for `list` and `show` subcommands for machine-readable output
- `list` with no specs returns empty array (not an error)
- `build` requires at least one YAML spec in `refs/apis/generated/spec/`
- `sync` requires AEM credentials (online mode only)

**Common errors:**
| Error message | Cause | Fix |
|---------------|-------|-----|
| `No API specs found` | Empty spec directory | Use `add` to create specs, or `sync` to fetch from AEM |
| `API not found: <name>` | Wrong API name in `show` | Use `list` first to see available APIs |
| `Connection refused` | AEM not reachable | Check AEM_HOST and AEM_TOKEN |

---

## Standard Error Recovery Pattern

All skills should follow this pattern when a tool command fails:

```
1. READ the error message (stdout + stderr)
2. IDENTIFY the error category:
   a. Input error (bad file path, malformed JSON) → Fix input, retry
   b. Grammar/schema error (invalid nodeName, wrong field type) → Consult reference docs, fix, retry
   c. Missing dependency (node_modules, PYTHONPATH) → Report to user with fix command
   d. AEM connection error → Inform user, switch to offline workflow
3. FIX and RETRY (max 2 attempts per error)
4. If still failing after 2 retries, REPORT to user with:
   - The exact command that was run
   - The full error output
   - What was attempted to fix it
   - Suggested next steps
```

---

## Exit Code Convention

All tools follow Unix conventions:
- **0** = success
- **1** = failure (recoverable — read error message)
- **2** = usage error (wrong arguments — read help)

**Important:** Exit code 0 from the form validator does NOT mean the form is valid — it means the validator ran successfully. Always check the JSON output for the actual validation result.

---

## Environment & Path Requirements

| Requirement | Needed for | How to set |
|-------------|-----------|------------|
| `PYTHONPATH` includes `scripts/` | Python tools (rule_coder, api_manager) | `PYTHONPATH="<plugin-root>/scripts"` prefix |
| `node_modules/` in `rule_coder/bridge/` | All Node.js bridge scripts | `npm install` in that directory |
| `AEM_HOST` + `AEM_TOKEN` env vars | `api-manager` | Set in shell or MCP config |
| Working directory = workspace root | All tools (relative paths) | `cd` to workspace before running |

---

## Skill-Specific Error Handling Notes

### analyze-requirements
No tool commands — this skill is pure reasoning. Errors are about output quality, not tool failures.

### forms-content-author
**Critical pattern:** Always run the validator after every form edit. The validator is the gate — no proceeding until it passes.

### forms-rule-creator (rules)
**Critical pattern:** validate → save (never reverse). If the validator says invalid, do NOT attempt to save. Fix first.

**Retry budget:** Grammar errors get 2 retry attempts. If the agent can't construct a valid rule after 2 tries, it should:
1. Show the user the rule it's trying to create
2. Show the validation error
3. Ask for guidance

### forms-rule-creator (custom functions)
**Critical pattern:** Run parse-functions after writing. If `success: false` or a function is missing from output, the JSDoc is wrong — fix annotations and re-run.