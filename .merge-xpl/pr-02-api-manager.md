# PR-02: `api-manager` Tool Sync

## Status

- Status: `done`
- Depends on: none
- Branch: `merge-xpl/api-manager-sync`
- PR URL: `#3`
- Merge commit: `75e6acb`

## Scope

- Sync `api-manager` changes into:
  - `skills/aem/forms/forms-orchestrator/scripts/api_manager/*`

## Checklist

- [ ] Capture exact source file diff for `tools/api-manager/*`
- [ ] Map source files to local `scripts/api_manager/*`
- [ ] Port code changes
- [ ] Port or adapt tests where relevant
- [ ] Verify `api-manager` CLI smoke paths
- [ ] Raise PR
- [ ] Merge PR

## Notes

- Keep test additions with this PR if they exercise only `api_manager`.
