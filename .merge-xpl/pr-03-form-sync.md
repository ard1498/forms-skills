# PR-03: `form-sync` Tool Sync

## Status

- Status: `done`
- Depends on: none
- Branch: `merge-xpl/form-sync-sync`
- PR URL: `#4`
- Merge commit: `8a0ed38`

## Scope

- Sync `form-sync` changes into:
  - `skills/aem/forms/forms-orchestrator/references/domain-registry/references/infra/references/sync-forms/scripts/form_sync/*`
  - related wrapper script if needed

## Checklist

- [ ] Capture exact source file diff for `tools/form-sync/*`
- [ ] Map source files to local `sync-forms/scripts/form_sync/*`
- [ ] Port code changes
- [ ] Verify CLI behavior for list / pull / push flows
- [ ] Run relevant tests or smoke checks
- [ ] Raise PR
- [ ] Merge PR

## Notes

- Keep scope restricted to sync-forms infrastructure.
