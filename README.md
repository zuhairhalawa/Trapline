# TRAPLINE

> **Unreleased playable slice (Stage A1).** Not published, not deployed. Three levels, built for human playtesting and independent QA.

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
| `npm test` | Vitest, single run: engine, persistence, reducer, audio guards |
| `npm run test:e2e` | Playwright. Builds, serves with `vite preview`, runs desktop 1440x900 and emulated mobile 390x844 (Chromium). First time: `npx playwright install chromium` |

## How to play

1. Pick at most one command (or none = **Wait**). Picking and cancelling is free and only changes the preview.
2. Dashed arrows and ghost pieces show where the intruder (coral, angular scout) and courier (mint, rounded diamond) go next. The text beside the board says why.
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
- Art is original vector artwork; no generated concept art is shipped yet (see [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md)).
- Screen-reader behaviour was designed for (live region, labels) but not tested with a real screen reader.

## Docs

[RULES](docs/RULES.md) · [QA-A1](docs/QA-A1.md) · [ART_DIRECTION](docs/ART_DIRECTION.md) · [HANDOVER](HANDOVER.md) · [CLAUDE.md](CLAUDE.md)

## License

No license has been chosen yet (all rights reserved by default). All code and artwork in this repo are original to the project.