CREATE TABLE public.pro_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_path text NOT NULL,
  image_hash text,
  ref_no text,
  amount numeric,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  ai_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX pro_receipts_hash_uniq ON public.pro_receipts (image_hash) WHERE image_hash IS NOT NULL AND status = 'accepted';
CREATE UNIQUE INDEX pro_receipts_ref_uniq ON public.pro_receipts (ref_no) WHERE ref_no IS NOT NULL AND status = 'accepted';

GRANT SELECT, INSERT ON public.pro_receipts TO authenticated;
GRANT ALL ON public.pro_receipts TO service_role;

ALTER TABLE public.pro_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own receipts" ON public.pro_receipts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own receipts" ON public.pro_receipts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER pro_receipts_updated_at BEFORE UPDATE ON public.pro_receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all pro subscriptions" ON public.pro_subscriptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));