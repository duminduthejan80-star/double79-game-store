ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

-- Users must not be able to mark their own phone as verified from the browser.
CREATE OR REPLACE FUNCTION public.protect_phone_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.phone := OLD.phone;
    NEW.phone_verified := OLD.phone_verified;
    NEW.phone_verified_at := OLD.phone_verified_at;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_protect_phone ON public.profiles;
CREATE TRIGGER profiles_protect_phone BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_phone_fields();

CREATE TABLE public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.phone_otps TO service_role;
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
CREATE INDEX phone_otps_user_idx ON public.phone_otps (user_id, created_at DESC);

ALTER TABLE public.game_downloads
  ADD COLUMN IF NOT EXISTS whatsapp_followup_status text,
  ADD COLUMN IF NOT EXISTS whatsapp_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_followup_error text;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;