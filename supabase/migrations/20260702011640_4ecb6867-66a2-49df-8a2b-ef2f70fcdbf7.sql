
-- 1. Roles infrastructure
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users view own roles" ON public.user_roles;
CREATE POLICY "users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

-- Seed initial admin (owner)
INSERT INTO public.user_roles (user_id, role)
VALUES ('21ef46fd-97ad-49cb-a31d-cf95c46451a1', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Lock down games table: keep public SELECT, restrict writes to admins
DROP POLICY IF EXISTS "Anyone can delete games" ON public.games;
DROP POLICY IF EXISTS "Anyone can insert games" ON public.games;
DROP POLICY IF EXISTS "Anyone can update games" ON public.games;

CREATE POLICY "Admins insert games" ON public.games
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update games" ON public.games
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete games" ON public.games
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. game_feedback: hide PII from anonymous visitors
DROP POLICY IF EXISTS "feedback public read" ON public.game_feedback;
CREATE POLICY "authenticated read feedback" ON public.game_feedback
  FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.game_feedback FROM anon;

-- 4. Storage: restrict writes and remove broad listing
DROP POLICY IF EXISTS "Anyone update game-media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone upload game-media" ON storage.objects;
DROP POLICY IF EXISTS "Public read game-media" ON storage.objects;

CREATE POLICY "Admins upload game-media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'game-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update game-media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'game-media' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'game-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete game-media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'game-media' AND public.has_role(auth.uid(), 'admin'));

-- No public SELECT policy: bucket is public so getPublicUrl still works via CDN,
-- but the API can no longer list all objects in the bucket.

-- 5. Fix search_path and lock down trigger functions

CREATE OR REPLACE FUNCTION public.notify_whatsapp_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
begin
  perform extensions.http_post(
    'https://hook.us2.make.com/c3wqlnfnayc2e8yvqoypa405nw25fvxz',
    json_build_object(
      'id', new.id,
      'title', new.title,
      'image_url', new.image_url
    )::text,
    'application/json'
  );
  return new;
exception when others then
  return new;
end;
$function$;

-- Revoke direct EXECUTE on internal trigger functions (triggers still fire; RLS-safe)
REVOKE ALL ON FUNCTION public.notify_whatsapp_webhook() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_game() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
