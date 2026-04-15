# PR-05: `create-function` Skill Sync

## Status

- Status: `planned`
- Depends on: PR-01, PR-02
- Branch: `merge-xpl/create-function-sync`
- PR URL: `TBD`
- Merge commit: `TBD`

## Scope

- Sync source `custom-functions` skill content into:
  - `skills/aem/forms/forms-orchestrator/references/domain-registry/references/logic/references/create-function/SKILL.md`
  - adjacent references used by the skill
  - supporting function metadata under `scripts/rule_coder/functions/*` only if needed

## Checklist

- [ ] Capture exact source diff for `.claude/skills/custom-functions/*`
- [ ] Map source content to local `create-function` skill structure
- [ ] Port doc/reference changes
- [ ] Port metadata/supporting assets only if required
- [ ] Validate that commands and paths match this repo
- [ ] Raise PR
- [ ] Merge PR

## Notes

- Keep executable `rule_coder` engine changes in PR-01 unless a tiny dependency must be duplicated.
