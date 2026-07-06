
-- 1) Allow any authenticated user to manage games (admin panel is password-gated on the client)
DROP POLICY IF EXISTS "Admins insert games" ON public.games;
DROP POLICY IF EXISTS "Admins update games" ON public.games;
DROP POLICY IF EXISTS "Admins delete games" ON public.games;

CREATE POLICY "Authenticated can insert games" ON public.games
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update games" ON public.games
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete games" ON public.games
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 2) Hide game_feedback PII: expose non-PII columns via a view, restrict base SELECT to owner
DROP POLICY IF EXISTS "public read non-pii feedback" ON public.game_feedback;

CREATE POLICY "owners read own feedback" ON public.game_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.game_feedback_public
WITH (security_invoker = on) AS
SELECT id, game_id, user_name, rating, comment, created_at
FROM public.game_feedback;

GRANT SELECT ON public.game_feedback_public TO anon, authenticated;
