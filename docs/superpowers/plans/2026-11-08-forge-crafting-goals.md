# FORGE crafting goals implementation plan

**Goal:** Connect a chosen piece of furniture to the real actions that can earn its materials.
**Architecture:** Derive progress from existing stock; persist one recipe ID and use existing transaction rollback.
**Tech stack:** Vanilla JavaScript/CSS, Node tests, Playwright.
**Spec:** `docs/superpowers/specs/2026-11-08-forge-crafting-goals-design.md`

## Constraints and review focus

Preserve awards and task records; no extra rewards. Test malformed/old imports, unequal resource requirements, material spending on other items, paused actions, inventory cap and failed saves. Derive counts without double-counting materials supplied by the same action.

## Work

- [ ] Add failing behaviour tests in `tests/forge.test.mjs` for persistence, progress, rollback, switching, clearing and completed goals.
- [ ] Implement normalisation, goal actions and derived progress in `index.html`; run all Node tests.
- [ ] Add goal card and recipe tracking controls with material counts, task/habit navigation and direct crafting.
- [ ] Exercise choosing a goal, task/habit completion, crafting, placement and reload in a browser at phone/tablet/desktop sizes, including enlarged text and failed storage. Include this flow in CI.
- [ ] Bump public shell cache; review changes; run full source/browser checks; push a focused PR and verify the deployment if release access permits.

## Execution record

- Fresh isolated clone on `codex/forge-crafting-goals`, based on `3a08267`; baseline: 99 Node tests pass.
- Proceeding directly under user instructions to choose sensible defaults and execute improvements. No additional design approval needed.
