# FORGE Blueprint Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make independent skill progression unlock craftable furniture and room finishes, with more meaningful material rewards.

**Architecture:** Extend the existing one-file `index.html` game constants, ledger-derived inventory and transaction helpers; preserve normalisation of older saves. Expand workshop UI and pixel-art parts without dependencies; bump `sw.js` cache.

**Tech Stack:** Static HTML/CSS/JavaScript, node:test, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-08-forge-unlocks-design.md`

## Global Constraints

- Do not change or decrease original six recipe costs or remove valid crafted items.
- No extra services, authentication changes, risky migrations, or penalties.
- Keep iPhone Safari touch targets and button labels accessible; handle offline/localStorage save failures.

## Review Focus

- Old backups without `roomStyle` default to Foundry, valid new backups preserve room style.
- Arbitrary `roomStyle` and forged recipe IDs do not enter persisted state.
- Failed save rolls back style change and allows retry.
- Crafting attempts cannot bypass the skill gate or spend materials while locked.
- Extra materials for high-XP tasks don't change legacy 20-XP awards or grant twice.

### Task 1: Reward-derived progression and skill-gated blueprints

**Files:** Modify `index.html`, `tests/forge.test.mjs`.

**Interfaces:** `gameSupply(awards,crafted)`, `gameRecipeUnlocked(recipe,skills)`, `gameCraft(recipeId)`, `gameSkillTotals()`.

- [ ] Add failing tests for 20/70/100 XP supply, inaccessible locked recipes, exact level unlock and old crafted inventory import.
- [ ] Run `node --test tests/forge.test.mjs` and verify the new assertions fail for missing functionality.
- [ ] Implement additional 8 recipe definitions, skill gates and additive high-effort materials without altering existing recipes.
- [ ] Run `node --test tests/forge.test.mjs` and confirm all pass.
- [ ] Commit source and tests.

### Task 2: Distinct pixel furniture, unlock display and room finishes

**Files:** Modify `index.html`, `sw.js`, `tests/forge.test.mjs`.

**Interfaces:** `gameRoomStyleAllowed(style,skills)`, `gameTransact()`, `gameAction()`; `game.roomStyle` optional field.

- [ ] Add failing tests for room finishes, invalid/old save normalisation, persistence rollback, and locked labels.
- [ ] Run `node --test tests/forge.test.mjs` and see expected failures.
- [ ] Add original sprite parts, stage-style class/CSS, saveable room finishes, accessible recipe and finish buttons, next unlock cue, and offline cache bump.
- [ ] Run `node --test tests/*.test.mjs` and `git diff --check`; all pass.
- [ ] Commit source and tests.

### Task 3: Review, preview and publish

**Files:** No application changes unless a blocking defect is found.

- [ ] Review the branch independently and fix important findings with RED→GREEN tests.
- [ ] Run complete node:test suite, syntax and responsive browser smoke.
- [ ] Open PR and deploy Vercel preview; verify the reward→unlock→craft→place→style loop and persistence.
- [ ] Merge only after successful checks; deploy exact tested assets to production, verify READY and live URL, retain rollback candidate.
