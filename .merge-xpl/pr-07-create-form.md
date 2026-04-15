# PR-07: `create-form` Skill Sync

## Status

- Status: `planned`
- Depends on: none
- Branch: `merge-xpl/create-form-sync`
- PR URL: `TBD`
- Merge commit: `TBD`

## Scope

- Sync source `form-content` changes into:
  - `skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-form/SKILL.md`
  - related validator/reference assets

## Checklist

- [ ] Capture exact source diff for `.claude/skills/form-content/*`
- [ ] Map validator and rule docs into local `create-form` structure
- [ ] Port doc/reference updates
- [ ] Decide local strategy for validator asset placement
- [ ] Verify `form-validate` pathing and references
- [ ] Raise PR
- [ ] Merge PR

## Notes

- Do not mirror source deletions from `tools/eds-form-validator` without checking the local architecture.
