
-- Recreate view as security_invoker to satisfy linter
DROP VIEW IF EXISTS public.game_feedback_public;
CREATE VIEW public.game_feedback_public
WITH (security_invoker = true) AS
SELECT id, game_id, user_name, rating, comment, created_at
FROM public.game_feedback;

GRANT SELECT ON public.game_feedback_public TO anon, authenticated;

-- Replace owner-only SELECT policy with a broad read policy, and use column-level GRANTs to hide PII
DROP POLICY IF EXISTS "users read own feedback" ON public.game_feedback;

CREATE POLICY "public read non-pii feedback"
  ON public.game_feedback FOR SELECT
  TO anon, authenticated
  USING (true);

-- Column-level privileges: only expose non-PII columns via the Data API
REVOKE SELECT ON public.game_feedback FROM anon, authenticated;
GRANT SELECT (id, game_id, user_name, rating, comment, created_at)
  ON public.game_feedback TO anon, authenticated;
