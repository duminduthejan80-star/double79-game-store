CREATE TABLE public.download_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  free_speed_mbps numeric NOT NULL DEFAULT 0 CHECK (free_speed_mbps >= 0 AND free_speed_mbps <= 10000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.download_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.download_settings TO authenticated;
GRANT ALL ON public.download_settings TO service_role;
ALTER TABLE public.download_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone reads download speed" ON public.download_settings FOR SELECT USING (true);
CREATE POLICY "Admins insert download speed" ON public.download_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update download speed" ON public.download_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.manage_pro_by_email(_email text, _action text, _expires_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_id uuid; expiry timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501'; END IF;
  IF _action NOT IN ('dated', 'lifetime', 'revoke') THEN RAISE EXCEPTION 'Invalid action'; END IF;
  SELECT id INTO target_id FROM auth.users WHERE lower(email) = lower(trim(_email));
  IF target_id IS NULL THEN RAISE EXCEPTION 'No registered account with this email'; END IF;
  IF _action = 'revoke' THEN
    DELETE FROM public.pro_subscriptions WHERE user_id = target_id;
  ELSE
    expiry := CASE WHEN _action = 'lifetime' THEN 'infinity'::timestamptz ELSE _expires_at END;
    IF expiry IS NULL OR expiry <= now() THEN RAISE EXCEPTION 'Choose a future expiry date'; END IF;
    INSERT INTO public.pro_subscriptions(user_id, activated_at, expires_at, code)
    VALUES (target_id, now(), expiry, 'admin')
    ON CONFLICT(user_id) DO UPDATE SET expires_at = EXCLUDED.expires_at, code = 'admin', updated_at = now();
  END IF;
  RETURN jsonb_build_object('ok', true, 'user_id', target_id, 'expires_at', expiry);
END $$;
REVOKE ALL ON FUNCTION public.manage_pro_by_email(text,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_pro_by_email(text,text,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.desktop_download_policy(_game_id uuid, _tier text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE link text; speed numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in' USING ERRCODE = '42501'; END IF;
  IF _tier NOT IN ('free','pro') THEN RAISE EXCEPTION 'Invalid download tier'; END IF;
  IF _tier = 'pro' AND NOT EXISTS(SELECT 1 FROM public.pro_subscriptions WHERE user_id = auth.uid() AND expires_at > now()) THEN
    RAISE EXCEPTION 'Pro is not active' USING ERRCODE = '42501';
  END IF;
  SELECT CASE WHEN _tier = 'pro' THEN coalesce(nullif(download_url_pro,''), download_url) ELSE download_url END INTO link FROM public.games WHERE id = _game_id;
  IF link IS NULL OR trim(link) = '' THEN RAISE EXCEPTION 'No download link available'; END IF;
  SELECT free_speed_mbps INTO speed FROM public.download_settings WHERE id = true;
  RETURN jsonb_build_object('url',link,'speed_limit_mbps',CASE WHEN _tier = 'pro' THEN 0 ELSE coalesce(speed,0) END);
END $$;
REVOKE ALL ON FUNCTION public.desktop_download_policy(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.desktop_download_policy(uuid,text) TO authenticated;