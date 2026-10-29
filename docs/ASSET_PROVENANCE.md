# Asset provenance (Stage A2)

Status: unreleased local build. **No licence, ownership or publication clearance has been assessed or claimed for any asset below.** Generated images are subject to the generation service's terms; publication/licensing approval is a later checkpoint for the owner.

## Summary

| Kind | Items | Where |
| --- | --- | --- |
| **Generated artwork** (Higgsfield, Nano Banana Pro) | 2 images, plus 4 derivative files | `art/reference/`, `public/art/` |
| **Original vector art** (SVG in code) | all board pieces: honeypot, junction, gate, scout, courier, vault, server blocks, tiles, favicon | `src/presentation/pieces.tsx`, `Board.tsx`, `public/favicon.svg` |
| **Original code / CSS** | everything under `src/`, `e2e/`, `scripts/` | repository |
| **Audio** | synthesised at runtime with Web Audio, no files | `src/audio/audio.ts` |
| **Third-party assets** | none shipped (no images, fonts or sounds). npm packages (React, Vite, etc.) are build/runtime code under their own licences. | `package.json` |

## Generated images

Both jobs: tool Higgsfield CLI 1.1.26, model display name **Nano Banana Pro** (job type `nano_banana_pro`), `--aspect_ratio 16:9 --resolution 2k`, one output (`batch_size` 1 confirmed in the job record), still image only. Generated 2026-10-29 local time (job timestamps 2026-10-28 23:29 and 23:30 UTC). Quoted cost 2 credits each (4 total, within the 4-job / 4-per-job / 12-total allowance); the account transaction list shows two matching 2-credit spends. Both jobs finished `completed`; no job was repeated or discarded.

### Image 1: design reference sheet

- Job ID: `2c90748b-2820-49c8-b33c-7aa5095d1d05`
- Output: PNG 2752x1536. Raw file kept outside the repository (SHA-256 `3BE5F1185C6FBB65F251821E0827601076490F9F1CCFF237D2EDDE6438A89A73`).
- Reference images: none.
- Prompt (exactly as submitted):

> Original visual development sheet for Trapline, a tactical cybersecurity puzzle game. On a clean dark ink studio background, arrange six clearly separated miniature objects in two neat rows, all viewed from the same shallow isometric three-quarter angle. A small coral angular intruder scout with a narrow black expressive visor; a distinct friendly mint rounded-diamond courier carrying a tiny sealed packet; an ivory protected data vault with a readable dark lock; an amber mechanical honeypot in OPEN state; the SAME amber honeypot in CLOSED state; a clear two-way junction lever. The trap has a substantial base, visible hinges and an attached lid: it must never resemble a birdcage with a floating blob above it. Premium matte ceramic, machined edges, subtle metal mechanisms, soft studio light from upper left, clean silhouettes that remain recognizable when simplified to small SVG pieces. The open and closed trap must be recognizably the same object. Playful intelligence, understated personality, no faces of real people. Distinct silhouettes and symbols, not color alone. Original coherent design language. No words, labels, typography, logos, interface panels or watermarks. Landscape composition, generous separation between objects, no overlapping objects. This is a design reference sheet, not a gameplay screenshot.

- Local derivative: `art/reference/trapline-design-sheet.jpg` (resized to 1920x1072, JPEG quality 85, no retouching).
- Use: **design reference only. Not shipped, not in `public/`, not in `dist/`.** Its forms were used as visual cues for the hand-written SVG pieces (see `docs/ART_DIRECTION.md`). It was also uploaded once as the visual reference for Image 2 (allowed: a generated image from this pass).
- Observation: the generated scout is a blocky coral robot with a dark visor and metal joints, noticeably different from the in-game faceted-kite SVG scout. The SVG scout only borrowed bevel, steel feet/bolt and visor cues. The trap, junction lever, courier envelope and vault plate cues were adopted more closely.

### Image 2: title illustration

- Job ID: `ceb8bad6-ac9d-4aca-b1e1-5115a0889ee8`
- Output: PNG 2752x1536. Raw file kept outside the repository (SHA-256 `12BAAD9D992F32E8F1ED4850C22CE72D3F10667A659F4C0C5C453225DD6332B0`).
- Reference image: `art/reference/trapline-design-sheet.jpg` (Image 1, passed via `--image-references`).
- Prompt (as submitted). It is the supplied prompt with two additions for the reference: a parenthetical describing the trap ("a low amber box on a steel base plate with a side hinge and a raised lid") and "of the reference image" after "upper-left studio light":

> Original title illustration for Trapline, a small premium cybersecurity strategy puzzle. A compact miniature network diorama from a consistent shallow isometric camera, on a deep ink/navy studio background. Ivory server blocks and one protected data vault rest on a warm graphite platform with clear routes. A mischievous coral angular scout with a narrow dark visor is being lured toward a visibly hinged amber mechanical honeypot (a low amber box on a steel base plate with a side hinge and a raised lid), while a distinct mint courier carries a packet safely along another route. Match the sculptural matte ceramic pieces, restrained metallic details and soft upper-left studio light of the reference image. Build the composition around the relationship between scout, trap and courier, not a crowded city. Strong silhouette, crisp shapes, gentle depth, subtle contact shadows, no heavy glow. Landscape 16:9, main diorama centered toward the right with quiet dark space on the left. Keep important pieces well within the frame for responsive cropping. No words, lettering, logos, UI, fake buttons, weapons or human figures. Original concept illustration, not a representation of an exact solvable level.

- Inspection: the scout, trap and courier relationship is clear; no text, logos, weapons or people; quiet dark space on the left. The trap overhangs the platform edge slightly and the platform has a few more server blocks than the prompt required. Accepted as concept art, not as a level depiction.
- Derivatives:
  - `art/reference/trapline-title-illustration.jpg` (1920x1072, q85) reference copy, not shipped.
  - `public/art/title-hero.jpg` (1600x893, JPEG q78, whole image) desktop title art.
  - `public/art/title-hero-mobile.jpg` (800x536, JPEG q78, crop x780-2720 / y120-1420 of the original) phone title art.
- Modifications: resize/crop/JPEG re-encode with .NET System.Drawing. No colour or content edits, no AI upscaling or background removal.
- Use: decorative title-screen art, `aria-hidden`, labelled "Concept art, not gameplay" on screen. Failure to load hides it and the title/game stay fully usable (tested).

## File hashes (SHA-256)

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `public/art/title-hero.jpg` | 64267 | `C3E2CCD7FECF11414EA46B595609273FA765D554443F3D7BB90563CAD385D770` |
| `public/art/title-hero-mobile.jpg` | 33443 | `9F1FA8A60D55C8193D849B97A02861F582822608956B5004B11B8443B7A3B16B` |
| `art/reference/trapline-design-sheet.jpg` | 167880 | `F3A1537B8047B4D97145BA546840389C6DBCD26D05958E7C1C839DEC963D15F1` |
| `art/reference/trapline-title-illustration.jpg` | 105330 | `F281E3E75D77859566404BA4ECC80A86238F7CB291A50725FD082FEA849E9F36` |

Size targets: desktop hero <= 700 KB (64 KB), mobile <= 250 KB (33 KB). Both are well inside the limits; quality could be raised later if wanted.

## What is not recorded here

Raw CLI responses, signed download URLs, the spend ledger, account details and the workspace are kept in a private run-records folder outside the repository by design. Do not add them to the repo.