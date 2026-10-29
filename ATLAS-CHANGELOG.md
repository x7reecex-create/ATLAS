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
