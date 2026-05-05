-- Enable pg_net for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: call edge function on new game
CREATE OR REPLACE FUNCTION public.notify_new_game()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://tgbskrfbyvbigpxcbyim.supabase.co/functions/v1/notify-whatsapp',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_game_inserted_notify ON public.games;
CREATE TRIGGER on_game_inserted_notify
AFTER INSERT ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_game();