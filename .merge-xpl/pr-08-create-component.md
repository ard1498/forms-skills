# PR-08: `create-component` Skill Sync

## Status

- Status: `ready-for-review`
- Depends on: none
- Branch: `merge-xpl/create-component-sync`
- PR URL: `TBD`
- Merge commit: `TBD`

## Scope

- Sync source `create-custom-component` skill content into:
  - `skills/aem/forms/forms-orchestrator/references/domain-registry/references/build/references/create-component/`
  - local `cct` integration preserved, subscribe wiring and validation added

## Checklist

- [x] Capture exact source diff for `.claude/skills/create-custom-component/*`
- [x] Map source content to local `create-component` structure
- [x] Port `custom-form-components.md` → `references/custom-form-components.md` (new)
- [x] Port `subscribe-api.md` → `references/subscribe-api.md` (new)
- [x] Port `validate-registration.js` → `scripts/validate-registration.js` (new)
- [x] Merge source field types (button, multiline-input, panel, image, heading, constraint mapping) into `references/field-html-structure.md`
- [x] Expand `SKILL.md` with subscribe wiring, build step, browser MCP validation, common mistakes, example workflow
- [x] Reconcile local `cct` usage — kept `cct create` commands, not `npm run create:custom-component`
- [ ] Raise PR
- [ ] Merge PR

## Files Changed

| File | Action |
|------|--------|
| `references/custom-form-components.md` | New — architecture guide (MVC, folder structure, JSON schema, registration) |
| `references/subscribe-api.md` | New — subscribe API reference, callback patterns, child subscriptions |
| `scripts/validate-registration.js` | New — browser MCP diagnostic for component validation |
| `references/field-html-structure.md` | Modified — added button, multiline-input, panel, plain-text, image, heading, constraint mapping table, error message display |
| `SKILL.md` | Modified — added dependencies section, subscribe wiring in decorate step, build step, browser MCP validation step, expanded troubleshooting, example workflow |

## Notes

- Source uses `npm run create:custom-component` — local keeps `cct create`
- Source README.md (installation guide) skipped — not applicable to skills repo
- Source `journey/component-registry.md` step skipped — no equivalent in local structure
