# HANDOVER - Stage A1 (unreleased playable slice)

## Current state
Complete, locally committed, three-level slice. Engine, levels, UI, SVG isometric board, persistence, audio, unit tests and Playwright tests all pass (see docs/QA-A1.md for the exact numbers and what was NOT verified). Nothing is pushed, tagged or deployed; no remote exists.

Read first next time: CLAUDE.md, docs/RULES.md, docs/QA-A1.md.

## Layout
`src/engine` (pure rules) / `src/levels` (data) / `src/ui` (React + pure reducer) / `src/presentation` (SVG board) / `src/persistence` / `src/audio` / `src/styles` / `e2e` / `docs`.

## Next steps (suggested)
1. Human playtest (5 minutes per person; see README and the final report): is the intro clear, are previews understood, is each level solvable without hints, does Level 3's forced Seal feel fair?
2. Independent QA on real devices and browsers (Safari/iOS, Firefox, Android), screen reader pass, contrast check.
3. Fix the known defects in docs/QA-A1.md (junction dial affordance on phones, lid shape, tray covering text).
4. Decide on a licence, then art: run the Higgsfield prompt in docs/ART_DIRECTION.md in a separate user-run session; record provenance before shipping any asset.
5. Only after playtest feedback: more levels, then deferred features (extra enemies etc.). Do not add them speculatively.
6. Deploy to GitHub Pages (`/Trapline/` base already configured) only when the owner asks.

## Gotchas
- Preview and Advance share `resolveTurn`; keep it that way. Animation must never gate rules.
- Update docs/RULES.md and tests with any rule change.
- Windows PowerShell 5.1 `Get-Content` without `-Encoding UTF8` corrupts non-ASCII source.