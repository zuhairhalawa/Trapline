# Art direction (Stage A1)

## Direction: miniature security diorama

A small premium indie puzzle object: a shallow isometric (~30 degree) diorama of server pieces on a warm graphite slab, like machined ceramic game pieces with crisp silhouettes. Quiet, tactile, readable at phone size.

## Palette

| Role | Hex |
| --- | --- |
| Background (deep ink) | `#101820` |
| Panels | `#16212b`, `#1e2c39`, lines `#2b3b4b` |
| Board slab (warm graphite) | `#3a332d` (sides `#2c2622`, `#221d19`), tiles `#4d443c`, tracks `#6c6054` |
| Servers / vault (ivory) | `#F4EDE2` (shade `#D8CEBE`, `#BDB2A1`) |
| Courier (mint) | `#68D7BC` |
| Intruder (coral) | `#EF7068` |
| Honeypot (honey amber) | `#EDB65A` |
| Gate steel (secondary) | `#8FA3AD` |

Colour is never the only signal: every actor/object also has a distinct silhouette and a short label.

## Shapes

- **Intruder:** small angular scout, faceted kite body, two spiked ears, narrow slanted visor. Visor tilts and glints amber when it is lured; flattens when it has nowhere to go; shows an X when trapped.
- **Courier:** rounded diamond with an ivory packet glyph and a hover ring; shows a check once delivered.
- **Vault:** tall ivory block with a padlock plate on its face.
- **Honeypot:** open amber cage (bars + hinged lid). Dim dashed ring when idle, bright ring and bait morsel when armed, lid closes when it catches the intruder.
- **Gates (shutters):** two posts with stacked steel slats. Closed = four slats across the track + coral light + SEALED tag. Open = one retracted slat + mint light.
- **Junction:** a small dial with an amber lever pointing at the live branch. The unused branch is a thin dotted track.
- **Relay / side relay / source:** short ivory server blocks. **Drop:** mint dock ring with a flag. **Entry:** ivory arch. **Dead end:** striped stub block.
- Scenery towers sit on small detached islands and have no tracks, so they cannot be mistaken for nodes.

Paths and junction state are drawn under the art as raised tracks; the sealed/inactive ones become dotted and thin. Two pieces on one node are offset (-17 / +17) so both stay visible.

## Animation principles

- Short (about 0.6 s) movement with a small hop; trap closure lid after the move (0.3 s delay).
- Animation is decoration: rules resolve instantly in the engine, and Advance is merely locked while it plays.
- `prefers-reduced-motion` removes all transitions and animations, and the Advance lock.
- No bloom, no neon rain, no busy circuit textures.

## Typography

System stacks only (no runtime font requests): headings `Avenir Next Condensed / Segoe UI Variable Display / Segoe UI`, body `Avenir Next / Segoe UI Variable Text / Segoe UI / system-ui`. Wide-tracked uppercase for the wordmark and small labels. If a font is bundled later it must ship locally with its license.

## Provenance and licenses of shipped assets

All shipped artwork is original SVG written in this repository (`src/presentation/pieces.tsx`, `Board.tsx`, `public/favicon.svg`) and CSS. Audio is synthesised at runtime with Web Audio (`src/audio/audio.ts`); no audio files. No third-party images, fonts or sounds are included. `art/reference/` did not exist in this run, so no reference images were consulted. No generated (Higgsfield) artwork is shipped.

## Future asset slots (not implemented)

- Title / key-art backdrop (16:9) behind the title screen, diorama right, space left for the wordmark. Must be labelled concept art, never a gameplay screenshot.
- Social/preview card image.
- Optional per-level backdrop tint plates.
- Anything generated must be recorded here with tool, date, prompt, and license terms before shipping.

## Higgsfield image prompt (for a separate, user-run session)

Not run in A1. No paid generation was called, no account was used.

```
Create original visual-development artwork for Trapline, a premium browser tactical puzzle game about luring a digital intruder into a honeypot while legitimate data deliveries continue. Show a compact miniature server-network diorama from one consistent high isometric camera, approximately 30 degrees. Use a warm graphite platform, clear raised connection paths, ivory server towers, one protected vault, one amber mechanical trap, one small coral-red angular scout with a narrow expressive visor, and mint delivery tokens. The pieces resemble beautifully machined ceramic game pieces, with crisp silhouettes, gentle bevels and soft contact shadows. Sophisticated and playful independent-game art direction, editorial clarity, restrained detail. Deep ink/navy background, warm ivory structures, mint traffic, coral intruder and honey-amber trap. Soft studio lighting; readable at small size. Landscape 16:9; diorama slightly right, quiet space left for a separately added title. No text, lettering, logos, UI panels, charts, hooded people, weapons, city skyline, Matrix rain, heavy bloom or excessive neon. Original concept art, not a gameplay screenshot.
```