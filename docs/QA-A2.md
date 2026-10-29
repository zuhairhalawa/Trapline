# QA - Stage A2

Date of run: 2026-10-29. Machine: Windows, Node v24.16.0, npm 11.13.0, Playwright Chromium. This is the author's own automated verification and visual inspection, **not independent QA and not human playtesting**. "Mobile" below is Chromium device emulation, **not a real phone**. Nothing here claims fun, perfection or WCAG certification.

Baseline: reviewed A1 commit `3169fa4c51d720cdc41e1f82d3bc97c9cf54422e` (still the tip of `main`). A2 is on its own branch.

## Baseline reproduced before production changes

| Check | Result |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm test` | 4 files, **57 passed** |
| `npm run test:e2e` (production build + preview) | **26 passed, 2 skipped** (the two intentional project-specific skips), 0 failed |

Harness-only difference for the baseline run: `e2e/helpers.ts` `QA_DIR` now reads `TRAPLINE_QA_DIR` (default `test-results/screenshots`, git-ignored) instead of the hard-coded `docs/qa/a1`. No assertion or production source was changed. Baseline screenshots went to the private run-records folder. The SHA-256 of all 14 retained A1 PNGs was recorded before the baseline and compared after the baseline and after the final run: **no differences**; A1 images were never overwritten. Honest note: my first baseline attempt failed because my own harness edit used `process` without a type declaration (`tsc` error inside `npm run build`); I fixed it with a local `declare const process` and re-ran. The numbers above come from the clean re-run.

## Final run on the final tree

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0 (strict TS) |
| `npm test` | 4 files, **57 passed** (unchanged; engine, persistence, reducer, audio guards) |
| `npm run build` | exit 0; about 276 kB JS / 16 kB CSS uncompressed; `dist/` holds only the two shipping hero JPEGs besides the bundle |
| `TRAPLINE_QA_DIR=docs/qa/a2 npm run test:e2e` | **46 passed, 6 skipped, 0 failed** (52 = 26 specs x 2 projects) |

Skips (all explained in code): 2 from A1 (keyboard test is desktop-only, touch-tap test is mobile-only) and 4 from the new viewport matrix, which sets its own viewport per `describe` block and so runs once under the `desktop` project (the `mobile` project copy is skipped to avoid duplicating it). No test was removed, weakened or silently skipped.

Engine, levels' topology, node IDs, budgets, turn limits, persistence format and reference solutions were not touched; the three reference solutions are still driven through the visible controls by the unchanged A1 specs.

## What changed (defects from QA-A1 and the A2 brief)

| # | Fix | Where | Test |
| --- | --- | --- | --- |
| A | Junction: real lever piece (plate, two branch arrows, T-lever), always-visible `JUNCTION` label on phones too (A1 hid it when `f !== 1`), live branch glowed amber, auto-placed in open space so its 84px+ hit circle overlaps no neighbour | `pieces.tsx` `JunctionPiece`, `Board.tsx` | `junction: ...` (label visible and >= 9px glyph box, no node-label collision, every target >= 44x44, topmost at its own centre via `elementFromPoint`, no two hit circles overlap) on L2 + L3, both projects |
| B | Trap: attached hinge, steel plate, latch; separate idle / armed / sprung drawings; scout stays visible when sprung | `pieces.tsx`, `Board.tsx` | `trap: idle, armed and sprung ...` (distinct lid geometry, LED/morsel only when armed, `.lid-back/.lid-front` only when sprung, scout head topmost via `elementFromPoint`) |
| C | Tower islands removed (level `scenery: []`, board no longer draws them); bounds recomputed from nodes and the pill stack above the vault, so nothing clips | `levels.ts`, `Board.tsx` | existing overflow/size specs + inspected captures |
| D | Tray: in-flow `position: sticky` (reserves its real height) instead of `fixed` + 188px padding; opaque background; `scroll-padding-bottom` so scroll-into-view clears it; result card scrolls into view on win/loss; short-landscape layout | `layout.css`, `GameScreen.tsx` | `tray never covers content or controls` at 1440x900, 390x844, 360x640, 844x390 in normal, loss and win states: content bottom <= tray top, tray inside the viewport, every control and `Next level` topmost at its centre (also after scrolling) |
| E | CURRENT vs QUEUED: ghost gate + `NOW OPEN/SEALED` + `WILL SEAL/OPEN`, `CLOSES`/`OPENS` route tags + dashed route stripes, ghost lever, `WILL ARM` + dashed trap ring; committed `data-open` unchanged while queued; Wait/Undo/Restart/Advance clear marks | `Board.tsx` | three `queued vs current` specs |
| F | Entry screen: composition, Play/Continue hierarchy, hero art (responsive `<picture>`, mobile crop), real-board demo card captioned as real, no negative margins, no long landing page, sound/About kept, "Unreleased playable slice" kept | `TitleScreen.tsx`, `layout.css` | `title: art loads from the /Trapline/ base path ...` (naturalWidth > 0, correct file per project, HTTP 200 `image/jpeg`, Play above the fold and topmost, demo board present) |
| G | Microinteractions (selection ring pop, lever swing, gate drop, lid slam, pill fade, route dashes) with reduced-motion off-switch; control borders strengthened (3.6:1) | `board.css`, `base.css` | `reduced motion: route marks, lever and gate drop do not animate` (computed `animation-name: none`, transition `0s`) |

Hero failure: `hero image failure ...` aborts both hero files with `page.route`. It asserts the art block is removed, the title and real-board demo remain, no overflow, and Level 1 is still won through the controls. The expected failed requests/console errors are asserted to be *only* the aborted `/art/title-hero*` ones and are then cleared; the normal-run guard (any console/page error, failed request, HTTP >= 400, non-local request) stays active for every other test.

## Contrast (measured from the CSS/SVG hex values with `scripts/contrast.mjs`)

Computed from design colours, not from rendered pixels. Translucent label backgrounds were blended against the slab colour. This is a spot check of key pairs, **not a complete WCAG audit**.

```
pair | ratio | target | result
Body text: ivory on page ink | 15.39:1 | 4.5:1 | meets
Panel text: ivory on panel | 14.04:1 | 4.5:1 | meets
Secondary text: dim ivory on panel | 7.76:1 | 4.5:1 | meets
Secondary text: dim ivory on ink (links, tagline) | 8.51:1 | 4.5:1 | meets
Eyebrow / section heads: amber on ink | 9.75:1 | 4.5:1 | meets
Eyebrow on panel: amber on panel | 8.89:1 | 4.5:1 | meets
Intruder lines / loss title: coral on ink | 6.12:1 | 4.5:1 | meets
Courier lines / win title: mint on ink | 10.26:1 | 4.5:1 | meets
Primary button: ink on ivory | 15.39:1 | 4.5:1 | meets
Command button name: ivory on button | 12.25:1 | 4.5:1 | meets
Command button sub: dim ivory on button | 6.77:1 | 4.5:1 | meets
Selected command: ivory on selected | 12.76:1 | 4.5:1 | meets
Coach box: pale amber on coach bg | 12.46:1 | 4.5:1 | meets
Board pill: amber on ink | 9.75:1 | 4.5:1 | meets
Board pill: coral on ink | 6.12:1 | 4.5:1 | meets
Board pill: mint on ink | 10.26:1 | 4.5:1 | meets
Node label: ivory on ink@78% over slab | 14.43:1 | 4.5:1 | meets
Junction label: ivory on ink@88% over slab | 14.90:1 | 4.5:1 | meets
Art tag: dim ivory @85% on page | 5.41:1 | 4.5:1 | meets
Focus ring: mint vs ink (non-text, 3:1) | 10.26:1 | 3:1 | meets
Selected ring: amber vs slab (non-text, 3:1) | 6.76:1 | 3:1 | meets
Control border (old): line vs ink | 1.56:1 | 3:1 | BELOW
Control border (A2): line-strong vs ink | 3.64:1 | 3:1 | meets
Control border (A2): line-strong vs panel | 3.32:1 | 3:1 | meets
```

The only pair below target was the A1 control border (1.56:1 against ink). Buttons, chips and command cells now use `#5f7384` (3.64:1 on ink, 3.32:1 on the panel). The `--line` hairline is still used for decorative panel/stat boxes.

## Screenshots (new production-build captures, `docs/qa/a2/`; A1 untouched in `docs/qa/a1/`)

I opened the A2 images next to the A1 ones and checked clipping, legibility, empty space, current-versus-queued marks and reachable buttons. `*-desktop` = 1440x900 desktop project; `*-mobile` = 390x844 emulation; `layout-WxH-*` come from the viewport matrix (run under the desktop project; sizes <900 px wide use mobile emulation with touch).

| File(s) | Shows |
| --- | --- |
| `title-desktop.png`, `title-mobile.png` | New title: art, Play/Continue hierarchy, real-board demo card |
| `preview-l1-*.png` | Level 1 Bait queued: ghost arrows, `WILL ARM`, dashed trap ring |
| `preview-l2-*.png` | Level 2 Reroute queued: `CLOSES`/`OPENS`, junction ring, lever ghost |
| `preview-l3-*.png` | Level 3 Seal queued: ghost gate, `NOW OPEN`, `WILL SEAL`, both pieces waiting |
| `capture-l1-*.png`, `victory-l1-*.png` | Sprung trap with the scout visible (X visor), DELIVERED, result card with `Next level` |
| `breach-l1-*.png`, `timeout-l3-*.png` | Loss states |
| `layout-1440x900-*`, `layout-390x844-*`, `layout-360x640-*`, `layout-844x390-*` | L3 Reroute queued, L1 loss, L1 win at each size (short phone and landscape included) |

## Remaining defects and rough edges (not hidden)

- **Phones: the board is still small.** The 0.62 horizontal compression is unchanged; pieces are readable and targets are >= 44 px but a Level 3 board on a 390 px screen occupies about a third of the screen.
- **360x640 and 844x390 need scrolling to read the next-turn text**; the pinned tray covers the lower part of the panel until you scroll (it never hides anything permanently, by test). In landscape the command sublabels are truncated ("to Side rel...").
- On the title desktop demo card the board labels are small (about 5-6 px) because the card is only 520 px wide; it shows the real board but is not meant to be read.
- Pills (`CLOSES`, `OPENS`, `NOW OPEN`, `WILL SEAL`) were nudged by inspection on L2/L3 at 1440 and 390 widths only; other widths may overlap a node label. The junction placement is a heuristic over level geometry; new levels would need the same check.
- The SVG scout does not match the generated boxy robot; only some cues were borrowed. This is a deliberate non-goal for owner review.
- The sprung trap shows the scout rising from a closed lid; whether that reads as "caught" is a taste question that needs human eyes.
- Motion was **not watched**: slam/drop/swing/dash cues were checked only for existence, class wiring and reduced-motion off-switches, plus static captures.
- Hero art style (photoreal clay render) is more polished than the flat-shaded SVG board; the gap is visible and is for the owner to judge.
- Locked levels still need earlier wins (by design).

## Not verified

- Human playtests, fun, difficulty, whether the new previews are understood.
- Real phones/tablets, Safari/WebKit, Firefox, high-DPI beyond DPR 2, unusual aspect ratios. Playwright WebKit would not be real Safari either; it was not run.
- Sound by ear; screen readers; colour-vision simulation; complete WCAG audit.
- Performance on low-end devices.
- Publication/licensing status of the generated art (not assessed).

## Higgsfield spend (details in docs/ASSET_PROVENANCE.md)

2 jobs submitted (limit 4), 2 credits quoted for each (limit 4 per job), 4 credits reserved (limit 12), both `completed`. The account transaction list shows two -2 spends at the job times; no before/after balance snapshot was taken (the account status command prints the account email, so it was not run), so no balance change is attributed beyond those two transactions.