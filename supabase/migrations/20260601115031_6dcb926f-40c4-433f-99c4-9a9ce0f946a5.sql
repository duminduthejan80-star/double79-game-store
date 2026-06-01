-- Enable pgcrypto for OTP hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Extend profiles with phone verification
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- 2. phone_otps
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone_e164 text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_phone_otps_user ON public.phone_otps(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.phone_otps TO authenticated;
GRANT ALL ON public.phone_otps TO service_role;
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own otps" ON public.phone_otps FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own otps" ON public.phone_otps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own otps" ON public.phone_otps FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. login_streaks
CREATE TABLE IF NOT EXISTS public.login_streaks (
  user_id uuid PRIMARY KEY,
  last_visit_date date NOT NULL DEFAULT CURRENT_DATE,
  current_streak int NOT NULL DEFAULT 1,
  total_visits int NOT NULL DEFAULT 1,
  last_milestone_shown int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.login_streaks TO authenticated;
GRANT ALL ON public.login_streaks TO service_role;
ALTER TABLE public.login_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own streak" ON public.login_streaks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own streak" ON public.login_streaks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own streak" ON public.login_streaks FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 4. scheduled_messages
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone_e164 text NOT NULL,
  game_id uuid,
  game_title text NOT NULL,
  send_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_due ON public.scheduled_messages(status, send_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_phone ON public.scheduled_messages(phone_e164, sent_at DESC);

GRANT SELECT, INSERT ON public.scheduled_messages TO authenticated;
GRANT ALL ON public.scheduled_messages TO service_role;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own scheduled" ON public.scheduled_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own scheduled" ON public.scheduled_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. game_reviews (public read, service-role write only via webhook)
CREATE TABLE IF NOT EXISTS public.game_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  user_id uuid NOT NULL,
  username text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_game_reviews_game ON public.game_reviews(game_id, created_at DESC);

GRANT SELECT ON public.game_reviews TO anon, authenticated;
GRANT ALL ON public.game_reviews TO service_role;
ALTER TABLE public.game_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews public read" ON public.game_reviews FOR SELECT TO anon, authenticated USING (true);

-- realtime for reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_reviews;