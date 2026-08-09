CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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

DROP POLICY IF EXISTS "Authenticated can insert games" ON public.games;
DROP POLICY IF EXISTS "Authenticated can update games" ON public.games;
DROP POLICY IF EXISTS "Authenticated can delete games" ON public.games;

CREATE POLICY "Admins can insert games" ON public.games
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update games" ON public.games
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete games" ON public.games
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));