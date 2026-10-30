# ATLAS everyday experience

Make the existing app understandable to a first-time human user and visibly more considered. Keep the vanilla app, all saved records, four primary destinations, existing themes and offline behaviour.

## Approach

Improve the current home and navigation together. A decoration-only pass would leave the disappearing-capture problem; a framework rewrite would add risk without improving the immediate experience. This focused approach is the implementer's choice under the user's instruction to improve the real app autonomously.

## Behaviour

- Home becomes a distinctive daily overview with a clear date, greeting, real task/event counts, quick task entry and at most three next tasks. Urgent work comes first; unscheduled tasks fill empty slots, never future-scheduled tasks.
- An empty workspace offers three real first actions (task, event, note), without fake sample records, a forced tour or assuming the person's name is Sir. Existing names and appearances remain intact.
- Capture reports successful saving only after persistence succeeds. Storage failure keeps the typed title and rolls back the unsaved task so retry cannot duplicate it.
- Library has a local filter over destination names/descriptions, an explicit no-results message and reset. Typing retains focus. All destinations stay available when the filter is cleared.
- Secondary pages have a visible way back to Library and keep Library selected in the navigation. The floating add action has a readable label.
- New controls are at least 44px tall; themes, larger text, reduced motion, keyboard use and phone landscape remain supported. Decorative elements cannot intercept input.

## Boundaries

No authentication, database, integration, private data, account configuration, dependencies or payments change. Pets manages ChatGPT companions and is not an ATLAS integration. Draft PR #40 remains separate and unmerged. Production publishing needs the user's explicit approval; prepare and verify the full preview first.

## Acceptance

Regression tests cover task ordering, fresh-user greeting, storage failure/retry, Library filtering, secondary navigation and persistence. Existing 71 source tests and six-viewport browser coverage must remain green. Screenshots from synthetic empty/populated workspaces provide a visual review. Physical Safari/Samsung testing is a separate limitation.
