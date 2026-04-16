# PR-06: `add-rules` Skill Sync

## Status

- Status: `in-progress`
- Depends on: PR-01
- Branch: `merge-xpl/add-rules-sync`
- PR URL: `TBD`
- Merge commit: `TBD`

## Scope

- Sync source `form-rules` skill content into:
  - `skills/aem/forms/forms-orchestrator/references/domain-registry/references/logic/references/add-rules/SKILL.md`
  - related references/examples/templates

## Checklist

- [x] Capture exact source diff for `.claude/skills/form-rules/*`
- [x] Map source references/templates/examples to local `add-rules` structure
- [x] Port SKILL.md rewrite (workflow-focused, FUNCTION_CALL-only THEN logic)
- [x] Create `references/apis.md` (globals.functions API table)
- [x] Create `references/patterns.md` (critical rules, cross-fragment patterns)
- [x] Create `references/troubleshooting.md` (save failures, debugging)
- [x] Create `templates/rule-no-condition.json`
- [x] Create `templates/rule-with-comparison.json`
- [x] Create `templates/rule-with-boolean.json`
- [x] Adapt all tool paths to local `${CLAUDE_PLUGIN_ROOT}` convention
- [x] Add `Glob, Grep` to allowed-tools
- [ ] Raise PR
- [ ] Merge PR

## Notes

- Major restructuring: old version had sub-skill routing table and simple-vs-function decision flow; new version always uses FUNCTION_CALL for THEN logic, introduces rule plan spec step, template-based rule generation
- Existing `references/examples/`, `references/grammar-reference.md`, `references/rule-types.md` kept as-is (still valid references)
- Tool paths adapted from `node tools/rule_coder/bridge/cli/...` to `"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/..."`
