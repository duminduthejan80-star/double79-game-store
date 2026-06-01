# WhatsApp Verification, Streak, Follow-up & Reviews

## 1. Secrets
Store as backend secrets (never in frontend):
- `WAAPI_INSTANCE_ID` = `94826`
- `WAAPI_TOKEN` = `E2lL0QXcJBtVTEEuc92Aq3Xt76msXlIlX07rAPNt02fd3f3b`

## 2. Database changes (one migration)

Add to `profiles`:
- `phone_e164` text, `phone_verified` boolean default false, `verified_at` timestamptz

New tables:
- **`phone_otps`** — `user_id`, `phone_e164`, `code_hash` (sha256, never plaintext), `expires_at` (now()+5min), `attempts` int, `consumed_at`. RLS: user can read/insert own.
- **`login_streaks`** — `user_id` PK, `last_visit_date` date, `current_streak` int, `total_visits` int, `last_milestone_shown` int (multiple of 7 already celebrated).
- **`scheduled_messages`** — `user_id`, `phone_e164`, `game_id`, `game_title`, `send_at` (download time + 24h), `sent_at` nullable, `status` ('pending'|'sent'|'failed'), `error` text.
- **`game_reviews`** — `game_id`, `user_id`, `username`, `rating` int (1-5), `created_at`. RLS: public SELECT, only webhook (service role) inserts.

All with proper GRANTs + RLS + `service_role` for edge functions.

## 3. Edge functions
- **`send-otp`** — auth required. Generates 6-digit code, stores sha256 hash with 5-min expiry, POSTs to `https://api.waapi.app/v1/instances/94826/client/action/send-message` with the token. Rate-limited (60s between sends per user).
- **`verify-otp`** — auth required. Hashes input, compares, checks expiry & attempts (max 5). On success: marks `profiles.phone_verified = true`, sets `phone_e164`, marks OTP consumed.
- **`schedule-followup`** — auth required. Called when user clicks Download on a game with verified phone. Inserts row into `scheduled_messages` with `send_at = now() + 24h`.
- **`run-followups`** — public cron-invoked (no JWT). Picks `pending` rows where `send_at <= now()`, sends Sinhala WhatsApp message via WaAPI, marks `sent`. Scheduled via `pg_cron` every 5 min.
- **`whatsapp-webhook`** — public (no JWT). Receives WaAPI inbound webhook. Parses sender phone + numeric message (1-5). Finds the most recent `sent` follow-up for that phone, then looks up user profile + display_name, inserts into `game_reviews`. You paste the deployed URL into the WaAPI dashboard.

## 4. Frontend
- **`PhoneVerificationGate`** — wraps protected routes. If `profiles.phone_verified === false`, shows full-screen modal:
  - Step 1: phone number input (E.164) → calls `send-otp`.
  - Step 2: 6-digit OTP input → calls `verify-otp`. Resend countdown 60s.
  - On success: refetches profile and unlocks app.
- **`useLoginStreak`** hook — on app mount (after auth), upserts today's visit, computes streak, and if `current_streak % 7 === 0` and not yet shown, opens a styled celebration dialog ("Congratulations! You have visited our website for X days!").
- **Game download** — in `GameDetail`, after the existing `startDownload` call, also invoke `schedule-followup` (only if `phone_verified`).
- **Reviews section** — new component `GameReviews` at the bottom of `GameDetail`. Lists rows from `game_reviews` for that game with username, ⭐ stars, and timestamp. Realtime subscription so new reviews appear instantly.

## 5. Cron
After the migration, enable `pg_cron` + `pg_net` and schedule `run-followups` every 5 minutes (uses `supabase--insert`, not migration, since URL/anon key are project-specific).

## 6. Webhook setup (manual step for you)
After deploy, I'll give you the URL:
`https://tgbskrfbyvbigpxcbyim.supabase.co/functions/v1/whatsapp-webhook`
Paste this into WaAPI dashboard → instance 94826 → Webhooks → "Message received" event.

## Technical notes
- OTP stored as `encode(digest(code,'sha256'),'hex')` via `pgcrypto` — plaintext never persisted.
- Max 5 verify attempts per OTP row; expired/consumed rows ignored.
- Cron job runs every 5 minutes — actual delivery window is therefore 24h ± 5min, which is acceptable.
- Webhook matches by `phone_e164` of latest `sent` follow-up in last 72h to avoid stale matches.
- `display_name` from `profiles` used as the public username on reviews.

Ready to start. After you approve, I'll prompt you to enter the two WaAPI secrets, then run the migration and ship the code.