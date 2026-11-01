CREATE OR REPLACE FUNCTION public.protect_phone_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
DECLARE digits text;
BEGIN
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    IF NEW.phone IS NULL OR NEW.phone !~ '^\+?[0-9 ()-]+$' THEN
      RAISE EXCEPTION 'Enter a valid 10-digit Sri Lankan mobile number';
    END IF;
    digits := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
    IF digits ~ '^07[0-9]{8}$' THEN
      digits := '94' || substring(digits from 2);
    END IF;
    IF digits !~ '^947[0-9]{8}$' THEN
      RAISE EXCEPTION 'Enter a valid 10-digit Sri Lankan mobile number starting with 07';
    END IF;
    NEW.phone := '+' || digits;
    NEW.phone_verified := false;
    NEW.phone_verified_at := NULL;
  ELSIF auth.uid() IS NOT NULL THEN
    NEW.phone_verified := OLD.phone_verified;
    NEW.phone_verified_at := OLD.phone_verified_at;
  END IF;
  RETURN NEW;
END;
$function$;
COMMENT ON COLUMN public.profiles.phone_verified IS 'Ownership verification only; no longer required for phone setup. Saving a number does not verify ownership.';