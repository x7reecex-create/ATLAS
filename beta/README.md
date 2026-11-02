# ATLAS Family & Friends Beta

This folder is a **standalone, local-only beta** and must be deployed on a **separate origin** from the personal ATLAS app. Do not deploy it under the personal app's domain or use its Supabase/ATLAS Link settings.

## What's included
- Friendly first-use welcome with a display name (not an account).
- Dashboard, tasks with due dates, weekly plans, notes and daily habit check-ins.
- Local backup, validated restore, double-confirmed erase, and damaged-storage export.
- Mobile navigation, responsive layout, accessible labels and reduced-motion support.

## Privacy boundary
This page uses only `localStorage` under the key `atlas-family-beta:workspace:v1`. It has **no** API keys, third-party scripts, cookies, analytics, external requests or shared database. The browser content security policy forbids network connections. No personal ATLAS workspace data is included in the source.

**Important:** Users are separated by browser profile/device, not by authenticated accounts. The beta **does not sync** between devices, and anyone with access to the same browser profile can see its entries. Clear site data = loss of data without an exported backup. Do not market this as cloud-isolated accounts. A genuine multi-device public beta will require a separate auth/back-end and verified RLS tests.

## Verification
Run `node --test tests/family-beta.test.mjs` and inspect the app in mobile Safari and Android/desktop before inviting testers.

## Release safety
Keep the personal production URL unchanged. Deploy this directory as its own Vercel project and preview. Do not link to the RM Small Jobs Supabase project or modify its shared Auth URL settings. Share the preview only once initial manual checks pass.