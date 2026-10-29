# Art direction (Stage A2)

## Direction: miniature security diorama

A small premium indie puzzle object: a shallow isometric (~30 degree) diorama of server pieces on a warm graphite slab, like machined ceramic and steel game pieces with crisp silhouettes, soft bevels and restrained contact shadows. Quiet, tactile, readable at phone size. The board stays SVG/DOM so every piece, route, label and hit area is live; generated art is reference and title decoration only.

## Palette

| Role | Hex |
| --- | --- |
| Background (deep ink) | `#101820` |
| Panels | `#16212b`, `#1e2c39`, hairlines `#2b3b4b`, control borders `#5f7384` (A2: 3.6:1 vs ink) |
| Board slab (warm graphite) | `#3a332d` (sides `#2c2622`, `#221d19`), tiles `#4d443c`, tracks `#6c6054` |
| Servers / vault (ivory) | `#F4EDE2` (shade `#D8CEBE`, `#BDB2A1`) |
| Courier (mint) | `#68D7BC` |
| Intruder (coral) | `#EF7068` |
| Honeypot (honey amber) | `#EDB65A` (idle dull `#B59A63`) |
| Machined steel (A2) | `#9FB1BA` / `#74868F` / `#5D6E77`, slate `#46545C` |

Colour is never the only signal: every actor/object has a distinct silhouette and a text label.

## What the generated reference contributed (Stage A2)

`art/reference/trapline-design-sheet.jpg` (see docs/ASSET_PROVENANCE.md) was read for forms and materials, then the SVG was redrawn by hand. Nothing was auto-extracted or pasted.

| Cue in the reference | Used in the SVG |
| --- | --- |
| Soft light bevel on top-front edges, darker front corner | `IsoBox` bevel on every block |
| Trap = low amber box on a steel plate, side hinge, gear mechanism, latch, red LED | `TrapBack`/`TrapFront` |
| Open lid raised on a hinge; closed lid flat with rivets | lid geometry per state (30 / 66 degrees / shut) |
| T-lever in a frosted housing on a steel plate | `JunctionPiece` |
| Courier carries a sealed envelope, bolted side cap | courier glyph + steel cap |
| Dark lock plate on the ivory vault | `Vault` face plate |
| Steel feet and bolts on the scout | scout feet/bolts (the generated scout's boxy robot body was NOT copied) |

## Pieces

- **Intruder:** small angular scout, faceted kite body, two ears, narrow slanted visor with light bevel and steel feet. Visor tilts and glints amber when lured, flattens when blocked, X when trapped.
- **Courier:** rounded diamond with an ivory envelope packet and steel cap; check when delivered.
- **Vault:** tall ivory block with a dark lock plate on its face.
- **Honeypot (one object, three states):** steel base plate, amber box body, hinge barrel on the back edge, side latch.
  - *Idle:* dull amber, lid ajar (30 degrees), dashed ring, no light.
  - *Armed:* bright amber, lid raised (66 degrees) showing slate underside, red LED, bait morsel, solid pulsing ring.
  - *Sprung:* lid shut, steel clamp collar, "sprung" label, TRAPPED pill. The scout rises out of the lid with an X visor so it stays visible; the lid's front half and the box front cover its feet.
- **Gates:** two ivory posts with steel bands. Sealed = four slats + coral lamp; open = one retracted slat + mint lamp. The tag (`OPEN`/`SEALED`) is drawn above the nodes.
- **Junction:** steel plate with two direction arrows (solid amber = live branch, dashed = other) and a T-lever tilted toward the live branch, always with a `JUNCTION` label (phones included). Its position is chosen automatically in open space around the hub (clear of tracks, nodes and other tap targets).
- **Relay / side relay / source / dead end / drop / entry:** unchanged shapes.
- **Scenery:** the A1 tower islands are removed. Nothing decorative sits on the board; every platform is a real node.

## Current vs queued language (A2)

The committed state is always drawn. A queued command adds dashed amber/colored marks anchored to what it changes; Wait, Undo, Restart and Advance clear them.

- Seal/Open: ghost gate (the state it will have) over the real gate, `NOW OPEN|SEALED` tag, `WILL SEAL|OPEN` pill, route stripe on the edge.
- Reroute: amber glow on the live branch; on queue the live branch gets coral dashes + `CLOSES`, the alternate gets amber dashes + `OPENS`, the lever ghost swings to the other arrow.
- Bait: dashed amber ring and `WILL ARM` pill under the trap.
- Ghost arrows and `TRAP CLOSES` / `DELIVERS` / `BREACH` pills keep showing the projected result of the same `resolveTurn` preview; nothing here changes rules.

## Animation principles

- Short (about 0.6 s) movement with a small hop. Cues: selection ring pop, lever swing (0.3 s), gate slat drop on closing, lid slam on capture, pill fade-in, marching dashes on queued routes.
- Animation is decoration: rules resolve instantly in the engine and Advance is merely locked while it plays.
- `prefers-reduced-motion` removes all animations/transitions and the Advance lock (checked by test for the new cues).
- No bloom, no neon rain, no busy circuit textures.

## Title screen

Left: eyebrow "Unreleased playable slice", wordmark, tagline, Play/Continue (primary), level chips (secondary), a framed **real** game board (Level 1, engine-driven) captioned as such, then Sound/About links. Right (above on phones): the generated hero art, feathered into the page and tagged "Concept art, not gameplay". Phones use a 800 px crop. If the art fails to load it is removed and nothing else changes.

## Typography

System stacks only (no runtime font requests): headings `Avenir Next Condensed / Segoe UI Variable Display / Segoe UI`, body `Avenir Next / Segoe UI Variable Text / Segoe UI / system-ui`. Wide-tracked uppercase for the wordmark and small labels. If a font is bundled later it must ship locally with its licence.

## Provenance

See docs/ASSET_PROVENANCE.md for the generated images (prompts, model, job IDs, hashes, modifications) and the split between generated, original vector, code and third-party. No licensing clearance is claimed.

## Still open (not implemented)

- Social/preview card image; per-level backdrop tint plates.
- Redrawing the SVG scout closer to the generated boxy-visor robot (a deliberate non-goal this pass; decide after the owner reviews the look).
- Any further generated art needs its own provenance entry first.