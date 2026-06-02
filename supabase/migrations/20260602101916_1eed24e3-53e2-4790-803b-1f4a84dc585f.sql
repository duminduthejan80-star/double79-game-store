DO $$ BEGIN
  PERFORM cron.unschedule('run-followups-every-5-min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP TABLE IF EXISTS public.phone_otps CASCADE;
DROP TABLE IF EXISTS public.scheduled_messages CASCADE;
DROP TABLE IF EXISTS public.game_reviews CASCADE;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS phone_e164,
  DROP COLUMN IF EXISTS phone_verified,
  DROP COLUMN IF EXISTS verified_at;

CREATE TABLE public.game_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  user_name text,
  game_id uuid NOT NULL,
  game_title text NOT NULL,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  email_sent_at timestamptz,
  email_status text NOT NULL DEFAULT 'pending'
);
CREATE INDEX idx_game_downloads_pending ON public.game_downloads (email_status, downloaded_at);
CREATE INDEX idx_game_downloads_user ON public.game_downloads (user_id);

GRANT SELECT, INSERT ON public.game_downloads TO authenticated;
GRANT ALL ON public.game_downloads TO service_role;

ALTER TABLE public.game_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own downloads" ON public.game_downloads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own downloads" ON public.game_downloads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.game_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  user_email text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_game_feedback_game ON public.game_feedback (game_id, created_at);

GRANT SELECT ON public.game_feedback TO anon;
GRANT SELECT, INSERT ON public.game_feedback TO authenticated;
GRANT ALL ON public.game_feedback TO service_role;

ALTER TABLE public.game_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback public read" ON public.game_feedback
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "users post own feedback" ON public.game_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_feedback;