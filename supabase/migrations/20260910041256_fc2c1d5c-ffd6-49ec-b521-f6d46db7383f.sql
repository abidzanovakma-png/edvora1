CREATE TABLE public.favorite_universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, university)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_universities TO authenticated;
GRANT ALL ON public.favorite_universities TO service_role;
ALTER TABLE public.favorite_universities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own favorite universities" ON public.favorite_universities FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add own favorite universities" ON public.favorite_universities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own favorite universities" ON public.favorite_universities FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorite universities" ON public.favorite_universities FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.touch_favorite_university_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.touch_favorite_university_updated_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER touch_favorite_universities_updated_at
BEFORE UPDATE ON public.favorite_universities
FOR EACH ROW EXECUTE FUNCTION public.touch_favorite_university_updated_at();