# FORGE Blueprint Progression — Design

## Intent

Make FORGE skills worth levelling: useful real-life work should unlock new objects and ways to personalise the persistent room. Keep ATLAS productivity usable without FORGE, preserve old saves and work offline.

## Approaches considered

1. More furniture with no restrictions: quick content but no reason to earn skill XP.
2. New skill-gated recipes and optional room finishes, with progression calculated from the existing award ledger: **chosen**. Clear progress, no separate unlock records and no new service.
3. A full explorable town: longer and riskier than the current workshop's capabilities, with no complete quest/crafting loop yet.

## Rules

- The original six recipes stay level 1 and old crafted items always survive import. Add eight distinct placeable items with original SVG pixel art, skill and level requirements (2–3).
- Crafting gates are enforced in `gameCraft`, not only visually. Locked cards identify the required skill/level and current level; open cards show costs and missing materials. The workshop shows a next-unlock cue.
- A task worth 50+ XP yields 1 extra timber; 90+ yields another timber and iron. This only increases material returns, never reduces historical supply; habits and milestone grants stay unchanged, and award keys prevent repeat farming.
- Add four room finishes (Foundry free; Moss/HOME 2; Midnight/FOCUS 3; Brass/CRAFT 4). Changing style is optional, persisted as `game.roomStyle`, validated on import, reversible on storage failure. Existing backups default to Foundry.
- No paid items, subscriptions, external services, pets, extra currencies, equipment buffs or data migrations.

## Verification

Unit tests for locked crafting, unlocking at exact level thresholds, recipe costs, normalisation of old/new saves, reward-derived materials, style unlocking and rollback; full suite; browser preview test of visible lock, completion reward, unlock, craft/place/style and persistence. Release by reviewable GitHub PR plus Vercel preview, then production once verified.
