
-- 1) Restrict game_feedback SELECT to owners + admins; expose public review data via a view
DROP POLICY IF EXISTS "authenticated read feedback" ON public.game_feedback;
DROP POLICY IF EXISTS "feedback public read" ON public.game_feedback;

CREATE POLICY "users read own feedback"
  ON public.game_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

REVOKE SELECT ON public.game_feedback FROM anon;

CREATE OR REPLACE VIEW public.game_feedback_public
WITH (security_invoker = true) AS
SELECT id, game_id, user_name, rating, comment, created_at
FROM public.game_feedback;

GRANT SELECT ON public.game_feedback_public TO anon, authenticated;

-- Allow the view to be readable regardless of base-table RLS by wrapping via SECURITY DEFINER function-style policy:
-- Since security_invoker=true will enforce base-table RLS, add a permissive policy that allows SELECT of non-PII columns via the view.
-- Simplest: use security_invoker=false (definer) so the view bypasses RLS but only exposes non-PII columns.
DROP VIEW public.game_feedback_public;
CREATE VIEW public.game_feedback_public
WITH (security_invoker = false) AS
SELECT id, game_id, user_name, rating, comment, created_at
FROM public.game_feedback;

GRANT SELECT ON public.game_feedback_public TO anon, authenticated;

-- 2) Allow users to update/delete their own game_downloads rows
CREATE POLICY "users update own downloads"
  ON public.game_downloads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own downloads"
  ON public.game_downloads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3) Revoke EXECUTE on SECURITY DEFINER trigger functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_whatsapp_webhook() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_game() FROM PUBLIC, anon, authenticated;
