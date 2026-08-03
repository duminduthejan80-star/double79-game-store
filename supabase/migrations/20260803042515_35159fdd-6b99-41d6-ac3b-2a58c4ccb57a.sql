CREATE OR REPLACE FUNCTION public.game_download_counts()
RETURNS TABLE (game_id uuid, downloads bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id AS game_id,
         (
           SELECT count(DISTINCT x.user_id) FROM (
             SELECT user_id FROM public.game_downloads d WHERE d.game_id = g.id
             UNION
             SELECT user_id FROM public.download_events e WHERE e.game_id = g.id
           ) x
         ) AS downloads
  FROM public.games g;
$$;

GRANT EXECUTE ON FUNCTION public.game_download_counts() TO anon, authenticated, service_role;