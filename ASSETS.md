# Assets: provenance, terms and limits

This file summarises the assets. Full prompts, job IDs and hashes are in [docs/ASSET_PROVENANCE.md](docs/ASSET_PROVENANCE.md) (a historical Stage A2 record, whose "no clearance assessed" status line is superseded by this file).

## Covered by the MIT license ([LICENSE](LICENSE))
Original source code, CSS, tests, scripts and the hand-written SVG game art (board pieces, favicon in `public/favicon.svg`). Audio is synthesised at runtime; no audio files exist. No third-party fonts, images or sounds are shipped. npm dependencies keep their own licenses.

## NOT covered by the MIT license: AI-generated images
| File | Use |
| --- | --- |
| `public/art/title-hero.jpg`, `public/art/title-hero-mobile.jpg` | Title-screen concept art (shipped in the demo). Resized/cropped derivatives of generated image 2. |
| `art/reference/trapline-design-sheet.jpg`, `art/reference/trapline-title-illustration.jpg` | Design reference copies (not shipped in the demo build). |
| Screenshots under `docs/qa/` that show the title art | QA evidence. |

These are **AI-generated** (Higgsfield CLI, model "Nano Banana Pro", generated 2026-10-29 by the owner). They are not hand-drawn and not gameplay screenshots; the title screen labels the art as concept art. No retouching beyond resize/crop/JPEG re-encode.

**Applicable terms checked on 2026-10-30:** Higgsfield Terms of Use Agreement (page dated "Last updated: October 23, 2026") and its help-center article on output ownership. As read: section 4.4 says Higgsfield does not claim ownership of inputs or outputs and does not restrict commercial use of outputs; rights in exported outputs survive account deletion. The same terms say Higgsfield makes no warranty of originality or uniqueness, that the user is responsible for rights clearance and for AI-content disclosures, that outputs must not be represented as human-generated, and that outputs may not be used to train or fine-tune AI models. Provider policies of third-party models (this model is a third-party one) also apply; those provider policies were not separately reviewed.

**Limits:** this is a good-faith reading of the published terms, not legal advice or a guarantee of copyright, exclusivity or non-infringement. Higgsfield may embed provenance markings in outputs. No exclusive rights are claimed. The images are provided only as part of this project (viewing, running the demo, and whatever GitHub's terms allow such as forking); the owner grants no further reuse license for them, and in particular they must not be used to train AI models. If a rights issue is raised, the title art can be removed; the game has a tested vector fallback.

## Third-party notices
No third-party code is vendored. Dependencies are installed from the npm registry via `package-lock.json` and carry their own licenses.
