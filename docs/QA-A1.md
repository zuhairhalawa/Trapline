# QA - Stage A1

Date of run: 2026-10-29. Machine: Windows, Node v24.16.0, npm 11.13.0. Browser: Playwright Chromium. This is the author's own automated verification, **not independent QA and not human playtesting**.

## Commands run and actual results (final code)

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0, no errors (strict TS) |
| `npm test` | 4 files, **57 tests passed** (engine 35, persistence 12, reducer 7, audio guards 3; Vitest 5.0.5) |
| `npm run build` | exit 0, production bundle built (~267 kB JS / ~12.5 kB CSS, uncompressed) |
| `npm run test:e2e` | **26 passed, 2 skipped, 0 failed** (28 = 14 specs x 2 projects). Skips are intentional: the keyboard test is desktop-only and the touch-tap test is mobile-only |

Projects: `desktop` = Chromium 1440x900; `mobile` = Chromium emulation, 390x844, touch + isMobile, DPR 2. **Emulated, not a real phone.** Real browsers other than Chromium were not run.

## What the checks cover

Engine (Vitest, hand-specified positions): all three reference solutions with intermediate states; L2 and L3 alternate orders; no-intervention breach; seal-and-wait timeout; capture without delivery is not a win; L3 forced first Seal; trap range (3 edges ignored, exactly 2 lures, shutter-cut lure); no-route waits; deterministic equal-path tie-break independent of edge order (intruder and courier); courier never captured; shared nodes / passing; simultaneous breach + delivery = loss; final-turn victory; invalid command / zero charge / re-arm / bait under intruder / level over; preview equals commit and does not mutate; deep-frozen states; determinism; bounded exhaustive solvability search (each level solvable, never by Wait alone).

Reducer (Vitest): free queue/cancel; exact undo (identical committed objects back to turn 0); undo after a loss; Advance lock and stale-animation protection; restart cancels lock/queue.

Browser (Playwright, both projects): all three levels through visible controls with positions read from the board (`data-at`); ghost arrow targets and plain-language reasons; undo/restart; victory/breach/timeout feedback; progress persists across reload and unlocks the next level; no record on a loss; corrupt storage; wrong-shaped storage; storage that throws; keyboard shortcuts, Enter/Space on board targets, visible focus, live-region text; rapid Advance (duplicate clicks + key repeats) = one turn, Undo cancels the lock; reduced motion (zero transition duration, no lock); no horizontal overflow on any level; all buttons/chips/board hit areas at least 44x44 CSS px; board width sanity; every test fails on any console error, page error, failed request, HTTP >= 400, or request to a non-local origin.

## Screenshots (real captures from the Playwright run, `docs/qa/a1/`)

I opened and inspected these images.

| File | Shows |
| --- | --- |
| `title-desktop.png`, `title-mobile.png` | Title/entry view with the hero board (a real engine state) |
| `preview-l1-desktop.png`, `preview-l1-mobile.png` | Level 1 with Bait queued: ghost arrows, QUEUED tag, reasons |
| `preview-l2-*.png`, `preview-l3-*.png` | Level 2 Reroute queued; Level 3 Seal queued (both pieces wait badges) |
| `victory-l1-desktop.png`, `victory-l1-mobile.png` | Trap sprung, packet delivered, result card |
| `breach-l1-*.png` | Intruder in the vault: BREACH tag, loss card |
| `timeout-l3-*.png` | Level 3 sealed gate, intruder trapped, packet undelivered (loss) |
| `*-mobile.png` | 390x844 emulated board with bottom action tray |

Concrete problems found by inspection/tests and fixed during this run: mojibake from a PowerShell re-save; board art clipped at the left edge (stroke extents missing from the viewBox); QUEUED tag covering the cage; trapped intruder illegible inside the cage; cramped 4-up command row; top bar overflowing at 390px (icon buttons now); fixed tray hiding the Next level button (result card moved up, command row hidden when over); board hit area 43.8px on phones (enlarged); node labels about 6px on phones (scaled up); mobile preview text hidden under tray (legend/eyebrow removed, preview before explanation).

## Known defects and rough edges

- The junction dial is small; its meaning relies on the JUNCTION label (desktop only) and the panel explanation. Mobile has no label on it.
- On phones the tray can still cover the lower part of the explanation text until the player scrolls; the preview reasons are above it.
- The open-cage lid looks like a loose brown blob at small sizes.
- Unreachable scenery "islands" are decorative and could be mistaken for unused nodes by some players (no tracks lead to them).
- Title view on phones leaves empty space below the controls.
- Locked levels cannot be tried without winning earlier ones (by design; clearing site data resets).
- Clicking a board target and pressing the tray button are the same action; there is no double-tap-to-advance shortcut.

## Not verified

- Human playtests: difficulty, clarity of the intro, whether previews feel good. Automated tests do not establish fun.
- Real phones/tablets, Safari, Firefox, high-DPI or unusual aspect ratios; landscape phone.
- Sound by ear (only that failures never throw). Browser autoplay policies beyond Chromium.
- Screen readers (NVDA/VoiceOver) and colour-vision simulation; contrast ratios were not measured.
- Performance on low-end devices; long-session memory.
- `npm audit` was not reviewed beyond install output (0 vulnerabilities reported at install).