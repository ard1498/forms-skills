# PR-05: `create-function` Skill Sync

## Status

- Status: `in-progress`
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

- [x] Capture exact source diff for `.claude/skills/custom-functions/*`
- [x] Map source content to local `create-function` skill structure
- [x] Port SKILL.md changes (field path derivation, fragment vs form access, api-client pattern, 3-level composition chain, after-writing steps, validator docs)
- [x] Port validator tooling (validator.js, cli.js, index.js, generate-qualified-names.js, package.json)
- [x] Port definitions catalog (scope-functions.json, types.json, definitions/README.md)
- [x] Adapt paths for local repo structure (generate-qualified-names.js ORCHESTRATOR_ROOT, SKILL.md command examples)
- [x] Fix api-manager SKILL.md: update bodyStructure docs for multi-root support (gap from PR-02)
- [x] Raise PR
- [ ] Merge PR

## Notes

- Keep executable `rule_coder` engine changes in PR-01 unless a tiny dependency must be duplicated.
