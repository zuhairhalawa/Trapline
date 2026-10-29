# HANDOVER - Stage A2 (unreleased, local only)

Branch: `polish/a2-higgsfield-20261029-032643` (from reviewed A1 baseline `3169fa4c51d720cdc41e1f82d3bc97c9cf54422e`; A1 is untouched on `main`). Nothing is pushed, tagged or deployed; no remote exists.

## Current state
A1's three levels with a visual and readability pass plus two generated images. Rules/engine/levels/persistence are unchanged. Typecheck, 57 unit tests, production build and the browser suite (46 passed, 6 explained skips, 0 failed) pass on the final tree. Numbers, screenshots, contrast and the honest list of what was NOT verified are in docs/QA-A2.md. **The owner still needs to judge the look and feel before any campaign expansion.**

Read first next time: CLAUDE.md, docs/RULES.md, docs/QA-A1.md, docs/QA-A2.md, docs/ART_DIRECTION.md, docs/ASSET_PROVENANCE.md.

## What A2 did
- Higgsfield (Nano Banana Pro, 2 stills, 4 credits, both completed): a design reference sheet (not shipped) and a title illustration (shipped as `public/art/title-hero*.jpg`). Prompts, job IDs, hashes, modifications: docs/ASSET_PROVENANCE.md. Ledger/raw responses are kept outside the repo.
- Pieces redrawn in SVG from the sheet: hinged honeypot (idle/armed/sprung), lever junction with an always-visible JUNCTION label, steel-banded gates, bevelled blocks. Tower scenery removed.
- CURRENT vs QUEUED marks on the board (ghost gate, CLOSES/OPENS, WILL ARM); cleared by Wait/Undo/Restart/Advance.
- Mobile tray now in-flow sticky (reserves its height) with scroll padding; short-landscape layout; result card scrolls into view.
- Title screen: art (with vector fallback), Play/Continue hierarchy, real-board demo card.
- Contrast spot check (`node scripts/contrast.mjs`); control borders strengthened.

## Layout additions
`art/reference/` (generated references, not shipped) / `public/art/` (shipping art) / `docs/qa/a2/` (A2 captures) / `scripts/contrast.mjs` / `e2e/a2.spec.ts`. The e2e screenshot folder is set with `TRAPLINE_QA_DIR` (default `test-results/screenshots`, git-ignored); never point it at `docs/qa/a1`.

## Next steps (suggested)
1. Owner look-and-feel review of docs/qa/a2 and a live play (commands below). Decide whether the SVG scout should move closer to the generated robot.
2. Human playtest and real-device/Safari/Firefox testing (still not done); watch the motion cues in real time.
3. Decide licensing/publication of the generated art before any release.
4. Only then: more levels or deferred features. Any new level needs the junction/pill placement checked.
5. Deploy only when the owner asks.

## Known rough edges
Small board on phones; 360x640 and 844x390 need scrolling for the next-turn text; pill/label overlaps only checked at 1440 and 390 widths; hero art style vs SVG style gap. See docs/QA-A2.md.

## Gotchas
- Preview and Advance share `resolveTurn`; animation never gates rules.
- Windows PowerShell 5.1: write source with explicit UTF-8 (no BOM); `Get-Content` without `-Encoding UTF8` corrupts non-ASCII.
- `vite preview` started by hand outlives its parent shell on Windows; stop the node process by PID.
- Update docs/RULES.md and tests with any rule change.