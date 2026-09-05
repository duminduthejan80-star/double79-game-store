ALTER TABLE public.games ADD COLUMN IF NOT EXISTS steam_appid integer;
CREATE UNIQUE INDEX IF NOT EXISTS games_steam_appid_key ON public.games (steam_appid) WHERE steam_appid IS NOT NULL;