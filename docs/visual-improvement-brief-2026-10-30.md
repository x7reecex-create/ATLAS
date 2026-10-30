# ATLAS visual improvement brief — 30 October 2026

Status: design review only; production unchanged.

## Direction
Quiet, premium, practical and accessible. Retain ATLAS identity and private offline-first behaviour.

## Design references
Apple Human Interface Guidelines: hierarchy, safe areas, legible typography.
Material Design 3: responsive Android/tablet/desktop layout and touch controls.
Todoist: concise tasks and meaningful empty states.
Linear: restrained colour, spacing, focus and keyboard support.
These are design patterns, not assets to copy.

## Observed in live ATLAS
- Tasks screen displays literal `Focus · ${focus.length}/3` instead of a count.
- Empty task sections take too much vertical space.
- Library places primary workspaces and minor utilities at equal visual prominence.
- Landscape calendar has distracting strong red hour bands.

## Implementation priorities
1. Fix focus heading interpolation and test it.
2. Group Library by workspace, reflection, utilities and account without changing routes.
3. Soften calendar hour backgrounds, preserve selected day and event contrast.
4. Compact empty task groups without hiding due tasks.
5. Standardise spacing, icons, focus states and button feedback.
6. Test 320px Android, 393px iPhone, 412px Samsung, landscape, tablet and desktop, with large text and reduced motion.

## Guardrails
Do not add external fonts, analytics, risky dependencies or change auth/storage schema. Do not merge or deploy before CI and real browser verification.
