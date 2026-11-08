# FORGED Skills and Effort Rewards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Award appropriate, persistent real-life effort XP to independently progressing RPG skills.

**Architecture:** The task editor supplies optional `forgeSkill` plus existing duration and priority. `gameTaskReward` computes a bounded reward; `gameAward` stores an immutable snapshot. `gameSkillTotals` derives levels from the existing one-time award ledger, using a closed-form XP threshold.

**Tech Stack:** Existing static HTML, inline JavaScript/CSS, localStorage, Node built-in test runner, Vercel static hosting.

**Spec:** `docs/superpowers/specs/2026-11-08-forged-skills-design.md`

## Global Constraints

- Existing ATLAS tasks remain the single source of truth; no new authentication, Supabase migration or paid services.
- The task's estimated minutes are clamped to 5–720 and XP to 4–100; coins to 1–25.
- Preserve old `data.game` backups and do not rewrite historical award amounts.
- Mobile controls must remain reachable, keyboard and screen-reader accessible.

## Review Focus

- Legacy game awards without a skill must retain XP and count under the documented fallback.
- Invalid award `skill` values must not survive normalization or import.
- Editing a completed task must not change the awarded amount/skill.
- Failed localStorage save must not leave an unsaved completed task or phantom XP.
- Long-term level arithmetic must handle level 1000+ without a fixed cutoff.

---

### Task 1: Reward engine and independent skills

**Files:** `index.html`, `tests/forge-skills.test.mjs`

**Interfaces:** `gameTaskReward(task) -> {xp,coins,skill}`, `gameAward(kind,key,reward) -> boolean`, `gameSkillTotals() -> skill map`, `gameLevel(xp,base?,step?) -> level state`.

- [x] Write exact effort-scaling, skill-aggregation, historical-normalization and level-1000 tests.
- [x] Run `node --test tests/forge-skills.test.mjs`; verify missing functions fail.
- [x] Implement reward calculations, defensive normalization and derived level/skills state.
- [x] Verify the new tests pass.

### Task 2: Task UI, persistence and save rollback

**Files:** `index.html`, `sw.js`, `tests/forge-skills.test.mjs`, `tests/journey.test.mjs`

**Interfaces:** Task `forgeSkill` property, task editor dropdown, Journey Skills tab, reward display, `toggleTask(ref,done)`.

- [x] Write and run missing Skills tab/variable reward tests and failure-retry regression.
- [x] Implement task skill choice, six-tab mobile layout, skill cards and one-time award snapshots.
- [x] Roll back task state and newly added awards on failed storage commit.
- [x] Update stale static integration assertions and bump PWA cache.
- [ ] Run full Node suite and live browser QA of the Journey Skills tab.

### Task 3: Safe release

**Files:** GitHub feature branch and Vercel preview/production; no production database changes.

- [ ] Review branch diff and execute independent review of relevant edge cases.
- [ ] Publish code on a reviewable GitHub PR, verify preview READY and browser UX.
- [ ] Merge only after checks; deploy production, verify deployment READY and live URL.
