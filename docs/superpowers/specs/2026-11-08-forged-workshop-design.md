# ATLAS / FORGE — First Workshop Loop

## Intent

ATLAS already awards one-time XP and coins for completed tasks and habits, but those awards cannot yet change a persistent in-game world. Deliver a playable, reversible, offline-first crafting and room-decoration loop. This is the first vertical slice of the approved FORGED vision, not a replacement of the productivity app.

## Approach

Keep the existing static PWA architecture and `data.game` storage. Derive materials deterministically from the *existing unique award ledger* instead of maintaining a second grant ledger that can drift or double-pay. Store a bounded list of crafted furniture, with an optional unique room slot per item. Display a room grid, workshop recipes, available materials and unplaced inventory in Journey's fifth tab. Users choose an item and an empty room tile to place it, or tap an occupied tile to return it to inventory. Use original CSS and inline SVG pixel-style drawings, without new dependencies.

## Alternatives considered

- Separate remote game database: richer eventual multiplayer but inappropriate privacy, cost and migration risk for this solo first pass.
- Entirely separate game app: loses the central value of shared tasks and creates duplicate entry.
- **Chosen:** a small module of functions within the existing PWA and data schema: immediately testable, offline and compatible with current backups.

## Constraints

- No existing task, habit, currency or reward should be reset or deleted.
- Existing old backups with no `crafted` field remain valid; new backups round-trip without dropping items.
- Duplicate awards never generate extra materials, and crafting consumes finite supplies; invalid, unaffordable or duplicate room placement must fail cleanly.
- All user action is explicit, no network calls, purchases or schema changes.
- The game stays optional, mobile-first, and its first furniture pieces are actually craftable and placeable.
