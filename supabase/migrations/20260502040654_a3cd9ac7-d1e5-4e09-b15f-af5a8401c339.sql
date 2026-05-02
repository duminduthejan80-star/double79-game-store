-- Per-user library table
CREATE TABLE public.user_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id)
);

ALTER TABLE public.user_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own library"
  ON public.user_library FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users add to own library"
  ON public.user_library FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove from own library"
  ON public.user_library FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_library_user ON public.user_library(user_id);