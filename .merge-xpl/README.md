# Merge Tracker

This directory tracks the PRs needed to sync selected skill and tool changes into `forms-skills`.

## Workflow

1. Create the branch listed in the tracker file.
2. Port only the scoped changes for that PR.
3. Open the PR and fill in the PR fields.
4. Wait for review and CI.
5. Merge only after all listed dependencies are merged.
6. Update both the per-PR file and [`tracker.md`](/Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/.merge-xpl/tracker.md).

## Status Values

- `planned`
- `in_progress`
- `raised`
- `in_review`
- `changes_requested`
- `approved`
- `merged`
- `blocked`

## Files

- [`tracker.md`](/Users/anirudhaggar/Documents/aem/codes/adobe-rnd/forms-skills/.merge-xpl/tracker.md): master list of all PRs and current state
- `pr-*.md`: individual PR checklists and notes
