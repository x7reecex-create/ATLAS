ATLAS / FORGE — Crafting goals integrated (8 November 2026)
Implementation: 9f3c5c27043aebda311ba6340ea7ebefa32d4278 on existing PR #46, merging main abcc82720989d63c8de6bb856279f91417bdb66c into the existing goal branch without rewriting history.
Changed: choose one blueprint to track, see its remaining materials and actual skill/deed/discovery requirement across FORGE, then craft it and place the selected item in the workshop. Completing meaningful COMMAND tasks and daily habit check-ins supplies the existing material ledger; tracking adds no XP or rewards. Guidance acknowledges effort-scaled material yields without suggesting fabricated task counts. Preserves the three-room settlement, room finishes, quest board and reward-save rollback.
Compatibility: optional craftGoal preference defaults safely for older saves; obsolete IDs are discarded while earned history validation stays strict. Failed tracking/crafting saves restore the goal with inventory, room style and reward claims. No storage-key changes, reward-calculation changes, migrations, dependencies or auth changes. Public shell v43.
Verified: focused regression tests first exposed skill/deed goal readiness using the wrong argument, then passed after integration. node --test tests/*.test.mjs: 131 passed, none failed. tests/forge-goals-browser.mjs passed Chromium at 320x568, 393x852, 412x915, 852x393, 820x1180 and 1366x768: track/switch/clear, real task/habit awards, no duplicate reopened-task rewards, craft/place, storage failure/retry, reload, obsolete-goal recovery, keyboard activation, enlarged text, discovery unlocks and overflow/page errors. git diff --check passed. No physical iPhone/Safari test performed.
Delivery: update PR #46 only; not merged or deployed in this run. Production remains the verified reward-rollback release dpl_4jwhBWzgzApp5Ra38ehaBmhHnUgP. CI result is attached to the PR after push.
Next priority: make the tracked objective visible within the playable world without obscuring mobile exploration controls.

---

ATLAS / FORGE — Reward rollback released (8 November 2026)
Release source: main 242a4cad419769a5673e44d56ff5ca60dc7dd104, merged PR #52. Final PR CI run 42536082575 passed on 3c881c201f47458f65936c16737b47954ed5fa8e; merged tree exactly matched that tested head. No unrelated work merged.
Live deployment: dpl_4jwhBWzgzApp5Ra38ehaBmhHnUgP, READY, production alias https://atlas-personal-ios.vercel.app/ verified by deployment alias metadata and byte comparison of all eight public runtime files to reviewed source. Direct preview promotion returned HTTP 422; redeployment of the verified preview source to the existing project's production target succeeded. Deployment metadata identifies the merge commit; runtime files are identical to implementation 4a9eea2 (later commits changed tests/log only).
Post-release: unmodified tests/forge-rewards-browser.mjs passed against the production alias at 320/393/1366px: real tasks award coins, failed quota save preserves prior balance/claims, cancel is unchanged, keyboard retry spends once, reload retains correct history, no overflow/page errors. Preview offline reload and Rewards navigation also passed with zero console/page errors. All test data stayed in isolated browser contexts.
Rollback retained: dpl_2ZnLY3ayCT1ceZA4ebQr1EAR3uHM / 1d7556b828905b5547694bb544b25dcbb754faa5. No release blocker remains. Physical iPhone Safari/Android remains untested; next priority is other Journey failed-save rollback paths, then the pending crafting-goal integration. This follow-up changes only the engineering log.

---

ATLAS / FORGE — Reward redemption verification continuation (8 November 2026)
Reviewed source: 3566a5b006123eac5811ff803906c4c1acb78666 (fix 4a9eea285f8c0b57c49eea9f7458832b7c28c848), PR #52. Continued the unfinished cycle after the user confirmed the prior run had finished; refreshed both branch heads and acquired a local atomic run lock.
Before/after: production reproduced a phantom deduction from 35 to 15 coins after a failed redemption save; the fixed preview retains 35 coins and retry spends exactly once. Existing claims and the shared real-task award ledger survive reload. No schema/storage key/auth changes.
Verification: node --test tests/*.test.mjs passed 120 tests on 3566a5b. Reward persistence and world browser suites passed on the deployed preview at 320/393/1366px. General smoke and everyday suites passed at 320/393/412/852/820/1366px (local runner copies changed only Chrome executable and preview URL). Covered real tasks, quota failure, cancellation, keyboard retry, reload, exploration/crafting/placement, navigation, themes, enlarged text, overflow and page errors. Original reward browser assertion failed on rendered icon line breaks; commit 3566a5b uses textContent and its unmodified test passed. Independent code review found no blockers and passed 46 focused tests. These are Chromium emulation results, not physical Safari/Android testing.
Preview READY: https://atlas-personal-r9kjnubhc-g4p4nqntsx-1137.vercel.app/ (dpl_E337nQyMbNScD7GiQfgymC6HzxvG). All eight public runtime files byte-match reviewed head; deployment metadata records implementation commit 4a9eea2. Production remains dpl_2ZnLY3ayCT1ceZA4ebQr1EAR3uHM / main 1d7556b828905b5547694bb544b25dcbb754faa5 as rollback reference at verification time. Publication pending final CI and current-head checks; do not infer shipment from this entry.
Next: verify release alias after publication; then audit other Journey mutations for failed-save rollback before resuming crafting-goal PR #46 against current settlement/blueprint code. Referenced chat was unavailable because this session exposes no read_thread tool; GitHub and deployment evidence were used instead.

---

ATLAS / FORGE — Reward redemption persistence (8 November 2026)
Baseline: main 1d7556b828905b5547694bb544b25dcbb754faa5; production dpl_2ZnLY3ayCT1ceZA4ebQr1EAR3uHM (READY, matching source metadata). The latest main CI run 42509374754 passed. Open PRs were inspected; no active run or competing reward-redemption fix was found.
Problem reproduced: after confirming a reward, a failed save left a phantom claim in memory and reduced the coin balance. A later successful save could persist that unintended deduction.
Change: redeem rewards through the existing rollback transaction and include claims in its snapshot. Failed writes retain prior coins and claims; retry spends once. Offline shell v42. No data schema, account or service changes.
Verification so far: regression failed on the baseline for the expected phantom claim, then all 120 Node tests passed with the fix. Added CI browser coverage at 320, 393 and 1366px for real task awards, quota failure, a fresh rendered balance, cancellation, keyboard retry, reload and overflow. Local Chromium launch was blocked by the runtime (socket Operation not permitted); browser/preview/release evidence must be recorded before publication.
Next: complete CI and preview verification, then release if all gates pass. After this fix, review other Journey mutations for failed-save rollback and resume the pending crafting-goal PR without losing newer settlement/blueprint work.

---

ATLAS / FORGE — Blueprint Progression integration (8 November 2026)
Changes: eight independently skill-gated original pixel-art furniture blueprints, four room finishes (Foundry, Moss, Midnight, Brass), skill-level requirements in crafting cards, upcoming blueprint previews, and scaled timber/iron yields for demanding real tasks. The system is integrated with the existing 16-place Living Valley and new three-room settlement (Foundry, Greenhouse, Observatory), including five deed-gated furniture blueprints. The shared activity ledger drives progression without duplicate task entry.
Safety: old saves gain the Foundry finish and retain legacy room slots. Restored items must have earned the relevant skill, deed-count, exploration blueprint and room-slot unlocks. Selected finish, crafting, placement and discoveries remain rollback-safe on local storage failures. All assets are original inline artwork; there are no new services, dependencies, payments, migrations or auth changes. Offline shell cache v41.
Verification: 118 dependency-free source tests passed before integrating the new live quest board. The combined three-room preview passed real tasks → skill unlocks → Greenhouse unlock → room finish → furniture placement → reload checks. Publication and the final post-merge test run must be verified separately.

---

ATLAS / FORGE — Quest board and tighter game layout (8 November 2026)
Changes: a live quest board on the Living Valley screen lists up to three open COMMAND tasks by priority, showing their correct one-time skill rewards. Completing a quest updates the original task rather than a duplicate. The World and Workshop views use a compact XP header so the playable content is nearer the top of the screen.
Safety: all existing valley exploration, settlement rooms, trail tokens and crafted items remain intact. No new account, database or cloud configuration. Offline shell v39.
Verification: unit and real-browser checks for task completion and persistence, plus existing six-viewport checks. Promote only after CI and preview verification.

---

ATLAS / FORGE — Living Valley expansion (8 November 2026)
Changes: 16-place fog-of-war map; adjacent travel funded by one trail token per distinct completed task or daily habit check-in; one-time fixed location loot; three landmark-locked furniture blueprints (Quarry anvil, Ancient relic, Starwatch scope); inventory and workshop integration; accessible compact map for phone and desktop.
Safety: no network calls, purchases, Supabase changes or separate activity ledger. Exploration is local-first, normalized from a contiguous route and bounded by previously earned actions. Repeated taps cannot harvest loot. Failed persistence rolls back discoveries and materials. Older saves and crafted furniture remain valid; offline shell cache v38.
Verification: 106 source tests pass, including seven new world-unit tests. GitHub Actions now also runs a real Chromium task → map → crafting → reload journey on three viewports. Physical Safari and Android checks remain necessary.

ATLAS / FORGE — settlement expansion (8 November 2026)
Changes: expand the original single-room workshop into three unlockable spaces: Foundry (starter), Greenhouse (5 real deeds), and Observatory (15 real deeds). Add five original pixel-art furniture blueprints, unlock thresholds, crafting ingredient shortages, collection counts, room-switching controls, and three visible progress goals. Existing 1–9 room slots remain the Foundry; new rooms use namespaced slots in the existing crafted array, so no migration or additional permission is required.
Safety: the one-time real-action award ledger remains authoritative, milestone bonuses cannot unlock rooms, locked items cannot be crafted or placed via manipulated buttons, and all crafting/placement transactions still roll back if saving fails. No private records, integrations, account access, or Supabase configuration changed.
Verification: 101 dependency-free automated tests passed, including new room unlock and backup compatibility tests. Browser rendering, physical iOS/Samsung testing, and production deployment must be verified separately.

---

ATLAS — Rapid touch evolution (30 October 2026)
Changes: horizontal taskbody swipes (right = complete, left = plan tomorrow with deadline unchanged), accessible long-press/right-click/ellipsis task menu, one-step Undo for quick task actions, persistent manual ordering of up to three Focus tasks by drag or menu, portrait Calendar gesture for week on date strip and day on agenda, and desktop timetable drag between weekdays with Undo. Keyboard/mouse controls remain and mobile timetable editor remains the touch move alternative.
Safety: ignore system screen edges and predominantly vertical scroll gestures; preserve native vertical scrolling and reduced-motion settings. No destructive swipe, no invented cloud sync or background reminder service, no new network permissions, no schema migration. Backup captures focus ordering and timetable edits.
Verification: see CI checks attached to the merge commit; installed PWAs use v32 offline shell. Production should be promoted only after source and six-viewport browser tests pass.

ATLAS — release log (2026-10-29 Europe/London)
Baseline production: dpl_5DceFA2s4gRfg3sEJ2zqJnHqSiJG
Preview: dpl_Hv84VwaHnxPeZodBRs7ugLHJN6h3
Changes: coherent adaptive materials preserved across Midnight, Arctic, Forest and Ember; responsive desktop Home composition and two-column Library; full-width landscape Home; improved tablet proportions; seven bundled Lucide SVG icons (ISC licence, see THIRD_PARTY_NOTICES.md); Arctic muted text contrast improvement.
Preserved: localStorage keys, import/merge and backup schemas, Calendar CRUD, offline service-worker policies, ATLAS Link account access, integrations and Supabase configuration.
Tests: browser syntax passed; layout/navigation across 320x568, 393x852, 412x915, 852x393, 820x1180, 1180x820, 1366x768 and 1920x1080; all Calendar views without page overflow; 12 navigation views; synthetic task/note/event backup export, restore and idempotent merge; voice draft and mocked speech recognition; all four themes and persistence; offline PWA cache and local task save; Arctic WCAG AA secondary contrast.
No new runtime JavaScript packages or external network dependencies. Vercel deployment history holds the production release and rollback references.
Risk: physical iOS Safari/Samsung Internet and real microphone still need device verification; browser speech API may use the browser provider. No Git repository was confirmed; the deployed source is a Vercel API bundle.
Next priority: device-level testing, then investigate auth redirect allowlist safely without touching RM Small Jobs.

---
ATLAS — recovery callback safety iteration (2026-10-29 Europe/London)
Baseline production: dpl_H9AFLDZiTMN41D1Wmfun5qufkyV9
Tested preview: dpl_D57u1hodZL8eFZm7DktCvYcGt9eF
Scope: ATLAS Link recovery callback only, index.html.
Changes: recognise query-parameter or fragment recovery callbacks; remove access/refresh credentials and OTP-token query values from browser history before verification; reject untyped credential callbacks without consuming them; preserve the existing manual copied-link fallback.
Tests: JavaScript syntax; six simulated callback/error/normal URL cases, all passed; mock valid recovery session routed to password screen; no synthetic tokens retained in URL. No real emails, credentials, user records, Supabase settings, or tables were touched.
GitHub: connected repositories are x7reecex-create/rm-small-jobs and x7reecex-create/nexus; neither corresponds to ATLAS's Vercel-only deployed source. Do not write ATLAS to those repositories.
Risk / unverified: live Supabase redirect allowlist and shared Site URL unavailable from Vercel; email delivery and physical iOS Safari not tested; Supabase password reset remains unverified end-to-end.
Next priority: create an isolated ATLAS GitHub repository and establish source-controlled releases, then validate actual auth redirect allowlist with appropriate Supabase access.

---
ATLAS — quick-add weekday interpretation (2026-10-29 Europe/London)
Root cause: the natural-language calendar parser added seven extra days to every “next weekday”, so “next Monday” on Thursday 29 October incorrectly became 9 November rather than Monday 2 November.
Fix: interpret “next weekday” as that weekday in the following Monday–Sunday calendar week. Bare weekdays still mean the next upcoming occurrence, excluding today. No stored calendar data, auth, Supabase or RM Small Jobs changes.
Regression: execute the real inline parser against 12 synthetic date/weekday cases, including Sunday and Monday boundaries, plus the existing source tests. Offline cache bumped v21 → v22 so installed PWAs fetch the updated shell on the next service-worker update.
Release: PR and isolated preview required; do not promote to production without review and browser verification.
