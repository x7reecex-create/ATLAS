# ATLAS — Personal OS

Private source repository for the ATLAS iPhone-first PWA.

**Production:** https://atlas-personal-ios.vercel.app

## Architecture
Standalone `index.html` is the original vanilla HTML, CSS and JavaScript application. The offline shell is `sw.js`; `manifest.webmanifest` and icons are served from the root. No runtime npm dependencies are needed.

ATLAS records live primarily in the browser's local workspace. ATLAS Link uses a separate, manual opt-in Supabase connection; it is **not always-on two-way ChatGPT sync**. ATLAS and RM Small Jobs share Supabase infrastructure. Do not alter their shared Site URL, redirects, tables or credentials blindly.

## Development
Run `node --test tests/*.test.mjs` (Node 20+). These dependency-free tests check syntax and synthetic recovery-link handling; browser, real-device, import/restore and offline tests still need to run before changing production.

The currently working Vercel project is **not linked to GitHub**. Linking Git should be a separate, reviewed step after the source import is verified, with a Vercel preview and rollback reference.

## Source provenance
Original client assets match the production deployment `dpl_BU6fxgptCF6Mjm4tBZqx3wQcUv65` (29 October 2026), checked by Git blob SHA. The source contains no exported user records or private sessions. Publishable Supabase browser keys are public-facing and are not service-role secrets. Third-party Lucide attribution is in `THIRD_PARTY_NOTICES.md`.

Never commit personal backups, emails, passwords, reset links, access tokens, service-role keys or `.env` files.
