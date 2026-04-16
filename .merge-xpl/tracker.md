# PR Tracker

Repository: `forms-skills`

Source reference:
- Source PR diff: `https://github.com/anirudhaggar_adobe/hdfc-migration-xpl/pull/4/changes`
- Source sync commit inspected locally: `7da79c929d840260105d67b245281178ef64b127`

## Tracker Table

| ID | PR Scope | Status | Depends On | Branch | PR Link | Merged |
|----|----------|--------|------------|--------|---------|--------|
| PR-01 | `rule_coder` tool sync | done | — | `merge-xpl/rule-coder-sync` | #2 | yes |
| PR-02 | `api-manager` tool sync | done | — | `merge-xpl/api-manager-sync` | #3 | yes |
| PR-03 | `form-sync` tool sync | done | — | `merge-xpl/form-sync-sync` | #4 | yes |
| PR-04 | `git-sandbox` tool sync | done | — | `merge-xpl/git-sandbox-sync` | #5 | yes |
| PR-05 | `create-function` skill sync | in-progress | PR-01, PR-02 | `merge-xpl/create-function-sync` | TBD | no |
| PR-06 | `add-rules` skill sync | planned | PR-01 | `merge-xpl/add-rules-sync` | TBD | no |
| PR-07 | `create-form` skill sync | planned | — | `merge-xpl/create-form-sync` | TBD | no |
| PR-08 | `create-component` skill sync | planned | — | `merge-xpl/create-component-sync` | TBD | no |
| PR-09 | analysis skill sync (`jud-to-screen` / `screen-builder`) | planned | — | `merge-xpl/analysis-skill-sync` | TBD | no |
| PR-10 | catalog / routing cleanup | planned | PR-05, PR-06, PR-07, PR-08, PR-09 | `merge-xpl/catalog-routing-sync` | TBD | no |

## Merge Order

1. PR-01 `rule_coder`
2. PR-02 `api-manager`
3. PR-03 `form-sync`
4. PR-04 `git-sandbox`
5. PR-05 `create-function`
6. PR-06 `add-rules`
7. PR-07 `create-form`
8. PR-08 `create-component`
9. PR-09 analysis skill sync
10. PR-10 catalog / routing cleanup

## Notes

- Do not modify `.gitignore` or restore `forms-skills-issues.md` as part of this merge stream unless separately requested.
- Do not port `.claude/CLAUDE.md` or source-repo journey assets.
- Do not carry over `tools/cct` deletion blindly; this repo still contains local `cct` usage under `create-component`.
- Treat validator moves from `tools/eds-form-validator` as local adaptation work, not direct source deletions.
