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
