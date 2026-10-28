# TRAPLINE rules (Stage A1)

The engine in `src/engine/` implements exactly this; `src/engine/engine.test.ts` checks it. Levels are declarative (`src/levels/levels.ts`) with stable node IDs. All edges are undirected.

## Turn

Each turn: select zero or one valid command, preview the result, press **Advance**. No selected command means **Wait**.

## Commands

| Command | Effect | Cost |
| --- | --- | --- |
| **Bait** | Arm a predefined honeypot. Only one is armed at a time; arming another disarms the old one. An unreachable honeypot may be armed in preparation. | 1 charge + the turn |
| **Reroute** | Toggle a predefined junction between its two marked alternative edges (a switch, not free graph editing). | 1 charge + the turn |
| **Seal / Open** | Toggle a predefined shutter edge. Persists until toggled again. | 1 charge + the turn |
| **Wait** | Spend the turn. | no charge |

Invalid commands (not allowed in the level, no charges, trap already armed, trap under the intruder, intruder already trapped, level over) consume neither charge nor turn. Selecting and cancelling a preview is free. With zero charges Wait and Undo still work.

## Actors

**Intruder.** On the post-command graph: if an armed honeypot is reachable within **two open edges**, move one edge along a shortest path to it. Otherwise move one edge along a shortest path to the real vault. If the chosen goal has no route, wait. Recomputed every turn. Equal shortest paths are broken by the smallest neighbour node ID (string order). A trap beyond lure range, or cut off, does not distract it from the vault.

**Courier.** Move one edge along a shortest currently open path to its destination (same tie-break); wait if none. Once delivered it stays complete.

Actors may share a node and pass each other; there is no combat. An armed honeypot captures the intruder when it enters, and never captures the courier.

## Transition order

1. Validate and apply the queued command to a copy of the state.
2. Compute both actors' intentions from that same post-command state.
3. Move both actors simultaneously.
4. Resolve capture, delivery, and intruder entry into the vault.
5. Increment the turn.
6. Resolve: breach loss first, then victory, then turn-limit loss.

**Win** only when the intruder is captured AND the packet is delivered, by the turn limit (a win on the final allowed turn counts). Capture alone is not victory. No route is not an immediate loss, and closing everything cannot win. If the intruder enters the vault the level is lost even if the courier is delivered on the same turn.

Preview and Advance call the same function (`resolveTurn`); preview never mutates state. Undo restores the complete previous committed state (positions, flags, turn, charges, bait, switches, shutters). Animation is presentation only: it never decides rules or advances time. Advance is locked while the movement animation plays; Undo, Restart and level change cancel that lock.

## Levels

| # | Name | Budget | Turn limit | Commands | Reference solution |
| --- | --- | --- | --- | --- | --- |
| 1 | Follow the Bait | 1 | 2 | Bait | T1 Bait H: intruder J, courier J. T2 Wait: intruder captured at H, courier delivered at D. Waiting twice loses at V. |
| 2 | Open the Wrong Door | 2 | 3 | Bait, Reroute | T1 Reroute to J-K: intruder J, courier J. T2 Bait H: intruder K, courier at D (delivered). T3 Wait: captured at H. Bait-then-Reroute also works. |
| 3 | Keep the Service Running | 4 | 4 | Bait, Reroute, Seal/Open | T1 Seal J-V: both wait at J. T2 Reroute to J-K: both wait. T3 Bait H: intruder K, courier waits. T4 Open J-V: intruder captured at H, courier delivered at V. Bait and Reroute can swap after the Seal. |

Level 3 starts with intruder and courier both at J; the Seal on turn 1 is forced (every other first move loses on turn 1).

Node IDs: L1 S J V H C D. L2 S J V K H X C D (X is a dead-end relay; the junction exposes J-X or J-K, initially J-X). L3 J V K H X (fixed K-H, shutter J-V initially open, same junction, courier destination V).