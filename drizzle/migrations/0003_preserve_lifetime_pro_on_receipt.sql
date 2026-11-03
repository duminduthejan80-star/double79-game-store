CREATE OR REPLACE FUNCTION public.preserve_lifetime_pro()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.expires_at = 'infinity'::timestamptz AND NEW.code IS DISTINCT FROM 'admin' THEN
    NEW.expires_at := OLD.expires_at;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER preserve_lifetime_pro_before_update BEFORE UPDATE ON public.pro_subscriptions FOR EACH ROW EXECUTE FUNCTION public.preserve_lifetime_pro();