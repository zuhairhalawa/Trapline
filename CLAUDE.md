# CLAUDE.md - TRAPLINE

Read this file, HANDOVER.md, docs/RULES.md, docs/QA-A1.md, docs/QA-A2.md, docs/QA-A2-1.md, docs/ART_DIRECTION.md and docs/ASSET_PROVENANCE.md before changing anything. In bare mode nothing is auto-loaded.

## What this is
Browser tactical puzzle (React + TypeScript strict + Vite, plain CSS, Vitest, Playwright, npm). Player lures one intruder into a honeypot while one courier delivers. Stage A1 = three levels; Stage A2 = visual/readability pass with two Higgsfield stills; Stage A2.1 = repair pass (state-based Level 1 coach, grid layout with a decision dock, blocky scout, capture timing). Unreleased. Owner: Zuhair Halawa (GitHub zuhairhalawa).

## Layout
- `src/engine/` pure deterministic engine (no React, no animation). `resolveTurn` is the ONLY transition function; preview and Advance both use it. States are frozen.
- `src/levels/levels.ts` declarative levels, stable node IDs (IDs drive tie-breaks; x/y are presentation only).
- `src/ui/` React: `gameReducer.ts` (pure session: undo history, selection, animation lock), `GameScreen` (layout: `.stage` grid = `.scroller` details/board + `.dock` with commands, the compact decision summary and Undo/Restart/Advance; the dock is its own grid row, never an overlay), `TitleScreen`, `About`, `App`.
- `src/presentation/` SVG board (`Board.tsx`; tap-target radius adapts to the measured scale so targets stay >= 48 CSS px; `arrived` gates capture/delivery/breach visuals until the pieces have travelled), pieces (`pieces.tsx`; the scout head has `data-part="scout-head"`), wording and Level 1 coaching (`text.ts`, `coachLine` is state + queued action only).
- `src/persistence/progress.ts` versioned, validated localStorage record. `src/audio/audio.ts` Web Audio cues (gesture-gated, failures swallowed).
- `src/styles/` base / layout / board CSS. `e2e/` Playwright (`a1.spec.ts`, `a2.spec.ts`, `a2-1.spec.ts`). `docs/qa/a1/` and `docs/qa/a2/` are frozen evidence (never overwrite); A2.1 captures go to `docs/qa/a2-1/`. `art/reference/` generated references (not shipped); `public/art/` shipping art; `scripts/contrast.mjs`.

## Rules you must not break
- Rules live in docs/RULES.md; change engine + tests + docs together. Never let animation decide or advance rules.
- Do not weaken tests to get green. Add a test for each defect fixed.
- No runtime network, CDN fonts, analytics, eval, innerHTML. Saved strings are data only.
- Never read, print or commit secrets/tokens/env dumps. The game must not use any API key.
- No push, tag, deploy, public repo or global git config changes without the owner asking.
- Generated art: record prompt, model, date, hashes and use in docs/ASSET_PROVENANCE.md before shipping; no licence claims; keep raw CLI responses, ledgers and signed URLs out of the repo; Higgsfield work needs an explicit budget/ledger.
- E2E screenshots go to `TRAPLINE_QA_DIR` (default git-ignored `test-results/screenshots`); set it to `docs/qa/a2-1` only for a deliberate capture run. Never point it at `docs/qa/a1` or `docs/qa/a2`.
- Defer: extra enemies, procedural generation, multiplayer, leaderboards, accounts, editor, translations, service worker, story. Do not present deferred things as working.

## Commands
`npm run dev` (127.0.0.1:5173/Trapline/), `npm run build`, `npm run preview` (4173), `npm run typecheck`, `npm test`, `npm run test:e2e` (builds + previews itself; browsers: `npx playwright install chromium`). Base path is `/Trapline/` (vite.config.ts, playwright.config.ts).

## Practical notes
- Write files as UTF-8 without BOM; do not round-trip source files through Windows PowerShell 5.1 `Get-Content` without `-Encoding UTF8` (it corrupted non-ASCII characters once).
- Tests use `data-testid` hooks on visible controls and `data-at` / `data-open` readouts on board elements.
- Mobile is Chromium emulation only; real-device testing is still open.
- E2E layout checks must not scroll before measuring: use geometry + `elementFromPoint`, and keep post-scroll reachability as a separate test. Playwright `click`/`tap` auto-scroll, so do not use them to bring something into view for a first-view assertion.