# PR-09: Analysis Skill Sync (`jud-to-screen`)

## Status

- Status: `ready-for-review`
- Depends on: none
- Branch: `merge-xpl/analysis-skill-sync`
- PR URL: `TBD`
- Merge commit: `TBD`

## Scope

- Port source `jud-to-screen` skill into the analysis domain
- Add `docx-to-text.py` extraction script
- Update analysis domain router

## Checklist

- [x] Extract source `jud-to-screen/SKILL.md` content from diff
- [x] Extract source `tools/docx-to-text.py` from diff
- [x] Create `jud-to-screen/SKILL.md` adapted for local structure
- [x] Port `docx-to-text.py` to `jud-to-screen/scripts/`
- [x] Update analysis domain router (routing table, diagram, skills table, locations)
- [x] Adapt tool paths (source `tools/docx-to-text.py` → skill-local `scripts/docx-to-text.py`)
- [x] Make `component-registry.md` reference optional (project-level file, may not exist)
- [ ] Raise PR
- [ ] Merge PR

## Files Changed

| File | Action |
|------|--------|
| `analysis/references/jud-to-screen/SKILL.md` | New — JUD+screenshots to Screen.md skill (516→~480 lines adapted) |
| `analysis/references/jud-to-screen/scripts/docx-to-text.py` | New — .docx text extraction (53 lines, stdlib only) |
| `analysis/SKILL.md` | Modified — added jud-to-screen to routing table, diagram, skills table, triggers |

## Notes

- `screen-builder` skill deferred — not included in this PR per user decision
- `journey/component-registry.md` made optional — skill falls back to standard OOTB field types if not present
- `journey/globals-variable-registry.md` is a workspace artifact the skill creates/maintains, not shipped in the skills repo
- `docx-to-text.py` uses only stdlib (zipfile, re) — no additional pip dependencies needed
