# PR-07: `create-form` Skill Sync

## Status

- Status: `in-progress`
- Depends on: none
- Branch: `merge-xpl/create-form-sync`
- PR URL: `TBD`
- Merge commit: `TBD`

## Scope

- Sync source `form-content` changes into:
  - `skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-form/SKILL.md`
  - related validator/reference assets

## Checklist

- [x] Capture exact source diff for `.claude/skills/form-content/*`
- [x] Map validator and rule docs into local `create-form` structure
- [x] Port SKILL.md rewrite (streamlined workflows, removed fragment-first routing)
- [x] Create `references/validation-rules.md` (moved from eds-form-validator)
- [x] Adapt validator command references to local `form-validate` wrapper
- [x] Verify `form-validate` pathing and references
- [ ] Raise PR
- [ ] Merge PR

## Notes

- Major restructuring: old version had fragment-first decision tree and separate workflows; new version has 4 streamlined workflows (Create, Add, Modify, Delete)
- Fragment workflow removed from SKILL.md (source change) — fragments still work, just not a separate workflow
- `validation-rules.md` (796 lines) was a 100% rename from `tools/eds-form-validator/VALIDATION_RULES.md` — fetched from source repo API
- Source's `field-types-reference.md` maps to existing local `references/field-types.md` (kept as-is, more detailed)
- Validator tool paths adapted: `node .claude/skills/form-content/scripts/validate.js` → `form-validate`
- Existing `scripts/eds_form_validator/` directory and `eval/` fixtures kept as-is
