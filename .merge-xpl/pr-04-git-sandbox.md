# PR-04: `git-sandbox` Tool Sync

## Status

- Status: `done`
- Depends on: none
- Branch: `merge-xpl/git-sandbox-sync`
- PR URL: `#5`
- Merge commit: `518e192`

## Scope

- Sync `git-sandbox` changes into:
  - `skills/aem/forms/forms-orchestrator/references/domain-registry/references/infra/references/git-sandbox/scripts/git_sandbox/*`

## Checklist

- [x] Capture exact source file diff for `tools/git-sandbox/*`
- [x] Map source files to local `git-sandbox/scripts/git_sandbox/*`
- [x] Port code changes (workspace.py: rebase method, push rebase param; cli.py: rebase/branch commands, --no-rebase flag)
- [x] Update SKILL.md with new commands and troubleshooting
- [ ] No tests in source — no test files to port
- [x] Raise PR
- [ ] Merge PR

## Notes

- Avoid folding unrelated infra-reference docs into this PR unless required for accuracy.
