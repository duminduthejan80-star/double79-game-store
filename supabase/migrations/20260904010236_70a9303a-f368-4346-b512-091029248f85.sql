
-- Cancel own Pro subscription
CREATE OR REPLACE FUNCTION public.deactivate_pro()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  DELETE FROM public.pro_subscriptions WHERE user_id = uid;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.deactivate_pro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deactivate_pro() TO authenticated;

-- Public directory of members (no email / phone exposed)
CREATE OR REPLACE FUNCTION public.public_profiles()
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  joined_at timestamptz,
  is_pro boolean,
  library_count bigint,
  download_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         COALESCE(NULLIF(p.display_name, ''), 'Player') AS display_name,
         p.avatar_url,
         p.created_at AS joined_at,
         EXISTS (SELECT 1 FROM public.pro_subscriptions s WHERE s.user_id = p.id AND s.expires_at > now()) AS is_pro,
         (SELECT count(*) FROM public.user_library l WHERE l.user_id = p.id) AS library_count,
         (SELECT count(DISTINCT d.game_id) FROM public.game_downloads d WHERE d.user_id = p.id) AS download_count
  FROM public.profiles p
  ORDER BY p.created_at DESC
  LIMIT 500;
$$;

REVOKE ALL ON FUNCTION public.public_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_profiles() TO anon, authenticated;

-- Games of a chosen member
CREATE OR REPLACE FUNCTION public.public_profile_games(_user_id uuid)
RETURNS TABLE (
  game_id uuid,
  title text,
  image_url text,
  kind text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.title, g.image_url, 'library'::text
  FROM public.user_library l JOIN public.games g ON g.id = l.game_id
  WHERE l.user_id = _user_id
  UNION
  SELECT g.id, g.title, g.image_url, 'download'::text
  FROM (SELECT DISTINCT game_id FROM public.game_downloads WHERE user_id = _user_id) d
  JOIN public.games g ON g.id = d.game_id;
$$;

REVOKE ALL ON FUNCTION public.public_profile_games(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_profile_games(uuid) TO anon, authenticated;
