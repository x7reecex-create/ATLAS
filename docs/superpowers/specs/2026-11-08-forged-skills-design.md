# FORGED Skills and Effort Rewards — Design

## Intent

Make ATLAS Journey meaningful for long-term personal development. Different real-world tasks should train separate skills and longer, higher-effort tasks should reward more XP than tiny jobs. A game action must never change the underlying task workflow or create a second source of truth.

## Scope of this release

- Introduce eight independent skill tracks: Focus, Craftsmanship, Knowledge, Fitness, Home, Creativity, Financial Stewardship and Discipline.
- Let a task optionally nominate one RPG skill in its existing editor; an unset skill defaults to a mapping from the task's existing calendar category.
- Compute a one-time task reward using estimated duration and priority, bounded to 4–100 XP and 1–25 coins. Existing generic 30-minute normal-priority tasks remain worth 20 XP/5 coins.
- Save the earned amount and skill in the existing `data.game.awards` ledger, immune to task edits, reopening or repeated completion.
- Derive skill totals from awards; never maintain independent mutable XP counters.
- Display skills with levels, XP bars and activity counts in Journey. Mathematical level calculations have no level-999 cutoff.
- Preserve historical awards by attributing untagged tasks to Focus and untagged habits to Discipline. Milestone XP advances overall level but not a specific skill.
- Fix task-save failure so an unsaved completion and its newly granted awards are rolled back together.

## Approaches

1. **Award-ledger derivation (chosen):** Store the chosen skill and earned XP on each one-time award, derive skills as needed. No migration, no extra data tables; backup-compatible.
2. **Mutable skill counters:** Smaller render calculations, but risk of duplicate counting or divergence on import and rollback.
3. **Separate RPG task copies:** More quest metadata, but duplicates user data and breaks COMMAND/FORGE single source of truth.

## Limits and follow-up

This release does not claim proof of actual task duration: estimates remain editable, with bounded rewards and one-time grants. Breaking a large job into fake tasks is not yet completely detectable. The existing 10,000-award local-history limit remains a practical cap on lifetime records despite removing the artificial level-number cap. Deeper anti-abuse, quest chains, milestones and cloud sync are separate work.

Design must work in iPhone Safari/PWA, preserve private local storage and backups, add no paid services and avoid punitive mechanics.
