# TRAPLINE

> **Unreleased playable slice (Stage A2.1).** Not published, not deployed, no release made. Three levels, built for human playtesting and independent QA. Licensing and public-release approval of the artwork are still open gates (see below).

A small tactical puzzle: lure a digital intruder into a honeypot (a trap) while a legitimate data packet still reaches its destination. Plan one command per turn, preview what both pieces will do, press Advance, watch it play out. You do not need any security knowledge. It is fictional entertainment on a miniature board.

**Objective:** Trap the intruder. Deliver the packet.

## Quickstart

Requires Node 20+ (developed on Node 24) and npm.

```powershell
npm install
npm run dev        # http://127.0.0.1:5173/Trapline/
```

Production build served locally:

```powershell
npm run build
npm run preview    # http://127.0.0.1:4173/Trapline/
```

The base path `/Trapline/` is configured in `vite.config.ts` for a future GitHub Pages deployment. Nothing is deployed from this repo.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on 127.0.0.1:5173 |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve `dist/` on 127.0.0.1:4173 |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Vitest, single run: engine, persistence, reducer, audio guards, coaching/summary text |
| `npm run test:e2e` | Playwright. Builds, serves with `vite preview`, runs desktop 1440x900 and emulated mobile 390x844 (Chromium), plus a first-view matrix at 1440x900, 390x844, 360x640 and 844x390. Set `TRAPLINE_QA_DIR` to choose where screenshots go (default: git-ignored `test-results/screenshots`). First time: `npx playwright install chromium` |

## How to play

1. Pick at most one command (or none = **Wait**). Picking and cancelling is free and only changes the preview.
2. Dashed arrows and ghost pieces show where the intruder (coral, blocky scout robot) and courier (mint, rounded diamond) go next. A short summary above the Advance button always shows what is queued and what happens next (including a predicted breach); longer explanations are in the details area, which scrolls by itself.
3. Press **Advance** to spend the turn. **Undo** restores the full previous state. **Restart** resets the level.

Commands: **Bait** (arm the honeypot), **Reroute** (flip the marked junction), **Seal/Open** (toggle a gate), **Wait** (free). Full rules: [docs/RULES.md](docs/RULES.md).

Controls: mouse/touch on buttons or on board targets (trap, junction dial, gate). Keyboard: `B` `R` `S` `W` pick, `A` advance, `U` undo, `Shift+R` restart; board targets are focusable and respond to Enter/Space. Level 1 doubles as the interactive introduction.

Progress: levels unlock in order as you win. Completed levels and the sound setting are stored in browser `localStorage` (key `trapline.progress.v1`). Corrupt or unavailable storage falls back to defaults and never blocks play.

## Scope of this slice

Working: 3 authored levels, one intruder, one courier, deterministic engine, queued previews, undo/restart, victory/loss feedback, level selector, local progression, optional synthesized sound, original SVG/CSS isometric art.

Deliberately **not** included: extra enemies, procedural generation, multiplayer, leaderboards, accounts, level editor, translations, service worker/offline mode, story. No analytics, ads, network calls or remote fonts.

## Limitations (honest list)

- Not yet playtested by humans; difficulty and fun are unverified. Automated tests check rules and UI mechanics only.
- Mobile checks used Chromium device emulation, not a real phone. No Safari/Firefox runs.
- Audio was only verified not to throw; it has not been listened to by a person on real hardware.
- Fonts are system stacks (Segoe UI / Avenir Next / system-ui); look varies by OS.
- Art: the board pieces (including the scout) are original SVG drawn in code. The title-screen picture (`public/art/title-hero*.jpg`) is generated concept art (Higgsfield / Nano Banana Pro); its provenance is in [docs/ASSET_PROVENANCE.md](docs/ASSET_PROVENANCE.md). **No licence, ownership or publication clearance has been assessed or claimed for it.** Licensing and public-release approval are remaining gates before any release.
- Screen-reader behaviour was designed for (live region, labels) but not tested with a real screen reader.

## Docs

[RULES](docs/RULES.md) · [QA-A1](docs/QA-A1.md) · [QA-A2](docs/QA-A2.md) · [QA-A2-1](docs/QA-A2-1.md) · [ART_DIRECTION](docs/ART_DIRECTION.md) · [ASSET_PROVENANCE](docs/ASSET_PROVENANCE.md) · [HANDOVER](HANDOVER.md) · [CLAUDE.md](CLAUDE.md)

## License

No license has been chosen yet (all rights reserved by default). The code and the SVG board art are original to the project. Two generated images (a design reference sheet that is not shipped, and the title illustration that is) are subject to the generation service's terms and have not been cleared for release; see docs/ASSET_PROVENANCE.md.