# Release 0.1.0 (playable prototype): facts and evidence

Older `docs/QA-*.md` reports are historical and unchanged. This file records the release preparation only.

## Local verification (2026-10-30, Node 24.16.0, npm 11.13.0, Windows)
Run on a scratch copy of the exact release file set with `npm ci` (locked install), because a stale local preview process locked the project's own `node_modules`.

| Check | Result |
| --- | --- |
| `npm ci` | OK; lockfile `resolved`/`integrity` entries identical to the reviewed commit (only the project version fields changed) |
| `npm run typecheck` | OK |
| `npm test` | 5 files, 67 tests passed |
| `npm run build` | OK (~280 kB JS) |
| `npm audit` | 0 vulnerabilities (point-in-time) |
| `npm run test:e2e` (Playwright's own server on 127.0.0.1:4173, `reuseExistingServer: false`) | 72 passed, 18 skipped, 0 failed (5.5 min) |

Skips are the existing explicit `test.skip` cases (viewport matrices duplicated under the mobile project, keyboard test on mobile, touch test on desktop); none were added or changed. One assertion string in `e2e/a2.spec.ts` was updated with the title copy ("Unreleased playable slice" -> "Playable prototype"); no other test change.

## Release changes versus reviewed commit 02a6244
Version 0.1.0 (package and lockfile metadata only; dependency resolutions unchanged), package description, title/About/meta copy, README rewrite, MIT LICENSE, ASSETS.md, CI/Pages workflow, this file. Engine, levels, persistence, game behaviour and retained screenshots/art are untouched.

## Security and rights review (summary)
Full ancestry (3 commits, 142 tracked files) was scanned locally with pattern searches over text history and image blobs (no dedicated scanner was installed; nothing was sent to third-party services). No credentials, private keys, signed URLs, account data, local paths or personal emails were found. This is a best-effort scan, not a guarantee. Asset terms: see ASSETS.md.

## Not verified
Human playtest, real devices, Safari/Firefox, screen readers, audio by ear. GitHub CI and live-site results are recorded in the GitHub Release notes, not here, so that the tagged commit is the one that was verified.

## Release fix found by CI
The first GitHub Actions run (Ubuntu, Linux fonts) failed 4 existing e2e cases at 360x640: the top bar was wider than the viewport (scrollWidth 373 vs 360) because the system font stack renders wider than on Windows. Fix (CSS only, `src/styles/layout.css`): at `max-width: 380px` the brand gets tighter spacing and may shrink. No assertion was changed. Local full suite after the fix: 72 passed, 18 skipped, 0 failed (Windows); the authoritative check is the Linux CI run on the final commit.
