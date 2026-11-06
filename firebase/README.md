# Existing Firebase project connection

The public website uses the owner's existing Realtime Database, not the previous catalog backend. No existing data has been copied, deleted, or rewritten.

## Required public configuration

Set `VITE_FIREBASE_DATABASE_URL` to the exact database URL from Firebase Console → Realtime Database. Set `VITE_FIREBASE_GAMES_PATH` if the catalog is not under `games`. Set `VITE_FIREBASE_WEB_API_KEY` to the Firebase web app's public API key for private admin authentication. Do not substitute a general-purpose private Google API key. The saved `GOOGLE_API_KEY` and analytics secret have not been exposed. Analytics is not required for this catalog.

Catalog mapping supports the existing website fields plus `name`, `imageUrl`, `trailerUrl`, `releaseDate`, `createdAt`, and `updatedAt`. Confirm the existing app schema before connecting. Game download URLs are not consumed by this website.

## Owner-only setting

`websiteSettings/appDownloadUrl` stores a Google Drive file URL. The owner can edit only this URL at `/d79-ctrl-x9k4m2`. Visitors do not sign in. Admin authentication uses Firebase Email/Password and requires an `admin: true` custom claim assigned by a trusted Firebase Admin environment, never by the browser or editable profile metadata.

`database.rules.json` is a minimal rules example, not deployed. Merge the `websiteSettings` rule into the existing app rules; do not replace the PC app's rules wholesale. Public read access is required for the catalog and app URL. Preserve existing private app branches and security restrictions. Until the exact database URL, compatible schema, Firebase admin account/custom claim, and deployed rules are supplied, live catalog reading and shared URL saving are unverified.
