CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('chat', 'explain')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_user_time_idx ON public.ai_usage (user_id, kind, created_at);
GRANT SELECT, INSERT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ai usage" ON public.ai_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add own ai usage" ON public.ai_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);