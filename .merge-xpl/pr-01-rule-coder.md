# PR-01: `rule_coder` Tool Sync

## Status

- Status: `in_progress`
- Depends on: none
- Branch: `merge-xpl/rule-coder-sync`
- PR URL: `TBD`
- Merge commit: `TBD`

## Scope

- Sync `rule_coder` changes from the source PR into:
  - `skills/aem/forms/forms-orchestrator/scripts/rule_coder/*`
- Include:
  - bridge CLI updates
  - validator updates
  - any new `components` support

## Checklist

- [x] Capture exact source file diff for `tools/rule_coder/*`
- [x] Map source files to local `scripts/rule_coder/*`
- [x] Port code changes
- [x] Verify `rule-transform`, `rule-save`, `rule-validate`, and `parse-functions` entrypoints still work
- [x] Run relevant tests or smoke checks
- [ ] Raise PR
- [ ] Merge PR

## Notes

- Keep this PR focused on the tooling layer. Do not mix in `add-rules` or `create-function` skill-doc changes here.
- Local adaptation included: `FormContext.load_from_form_file()` now preserves the original form path so fragment-aware transformation works in this repo layout.
- Verification note: the stricter validator now rejects `show-hide-with-else.json` because THEN/ELSE `BLOCK_STATEMENT` actions must be `FUNCTION_CALL`. That matches the upstream code change, but the later `add-rules` PR must update the examples/docs to align.
