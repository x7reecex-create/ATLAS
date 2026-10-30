# ATLAS Everyday — verification and release notes

## Delivered

- New daily overview with real due-task, calendar-event and completion counts.
- First-use actions for task, event and note; neutral new-user greeting.
- Undated captured tasks fill unused Home slots. Due tasks remain first; future-only focused tasks are excluded unless explicitly planned today or already overdue.
- Inline and modal quick capture both preserve input and roll back unsaved tasks when persistence fails.
- Library filter, no-results/reset, visible parent navigation and persistent Library tab selection on secondary screens.
- Labelled Add control; ordinary plus glyphs avoid missing-character boxes on systems without full-width glyph coverage.

## Verification

78 Node tests pass. New failure tests were observed failing before fixing capture rollback, modal retry, future focus and neutral name behaviour.

GitHub Actions runs both browser suites at 320×568, 393×852, 412×915, 852×393, 820×1180 and 1366×768. Existing coverage checks 12 screens, reduced motion, overflow and JavaScript errors. New coverage checks empty/filled home, task capture and reload, failed storage/retry in both capture paths, Library filtering and escape, parent navigation, all five themes and extra-large text.

Synthetic empty and populated mobile/desktop screenshots are emitted in CI logs for visual review. No real records, sessions or account details enter these fixtures. The latest successful run and verified Vercel preview are recorded in PR #41; the preview runtime files are compared byte-for-byte against the committed source.

## Independent review

A separate reviewer found no critical defects. Both important findings (modal retry and future focus) and the name-editor neutrality finding were fixed with failing-then-passing tests. Visual review is separate from source review.

## Implementation decisions

- Continue the existing vanilla app instead of introducing a framework or dependencies.
- Retain existing personalised names, palettes, authentication, schema and user records.
- Broaden safe capture to both entry points after review, because people expect consistent saving.
- Home excludes future-only focus, but overdue work and explicit plans for today remain visible.
- Use GitHub's authenticated connector after confirming the public repository and exact origin; local git had no write credential.
- Keep PR #40 separate. Prepare a complete preview under the user's autonomy instruction; require explicit approval before production publishing.

## Limits

Browser testing uses desktop Chrome with mobile/touch viewports, not physical iPhone Safari or Samsung Internet. The local browser environment could not start, so the browser suites ran in GitHub Actions. Public web search returned errors; W3C target-size guidance was retrieved directly. ATLAS Link and shared Supabase infrastructure were not changed or live-tested. Pets manages companions inside ChatGPT and is not an ATLAS integration.

Production remains at the pre-existing main-branch deployment until publishing is approved. Preview URLs have their own empty browser storage; this does not erase data at the production address.
