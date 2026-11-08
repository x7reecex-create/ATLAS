# FORGED Workshop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect task/habit rewards to persistent crafting and an editable pixel-art room.

**Architecture:** Deterministic resources from immutable one-time game awards, bounded crafted-item ledger, nine room slots, all in the existing local-first `data.game`. Add a Journey Workshop tab with original art.

**Tech Stack:** Vanilla HTML/CSS/JS PWA; Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-11-08-forged-workshop-design.md`

## Global Constraints

- Preserve old Journey history and backup import without lossy normalisation.
- No remote storage, authentication or financial changes.
- A task can pay at most once through its existing unique game award.

## Review Focus

- Old data without `crafted` → empty room and retained XP.
- Malformed or duplicate craft IDs/slots → rejected on import, never silently dropped.
- Spending resources beyond earned balance → no craft or state mutation.
- Placement in an occupied room slot → does not overwrite furniture.
- Disabled game mode → cannot craft or place, existing items stay saved.

### Task 1: Crafting rules and safe persistence

**Files:** `index.html`, `tests/forge.test.mjs`.

**Interfaces:** `gameMaterials()`, `gameCraft(recipeId)`, `gamePlace(itemId,slot)`, `gameUnplace(itemId)` and `gameNormalize(raw)`.

- [ ] Write failing unit tests covering all Review Focus scenarios and one earned→crafted→placed loop.
- [ ] Run `node --test tests/forge.test.mjs` and confirm failure on the missing feature.
- [ ] Implement deterministic drops, affordable recipes, bounded craft list, normalisation, placement.
- [ ] Re-run the specific tests and then `node --test tests/*.test.mjs` until green.
- [ ] Commit tested core.

### Task 2: Playable Journey workshop

**Files:** `index.html`, `tests/forge.test.mjs`, optional browser smoke.

**Interfaces:** `gameScreen()` and `gameAction(element)` consume Task 1 rules.

- [ ] Write failing UI structure/behaviour tests for the Workshop tab, usable recipe controls, placement status, room tiles and inventory selection.
- [ ] Verify tests fail because the UI does not yet exist.
- [ ] Implement responsive original furniture sprites, workshop/room UI and event actions.
- [ ] Run full Node suite; inspect the UI via browser if available.
- [ ] Commit and deploy tested branch to preview, then production only with green checks and exact-target verification.
