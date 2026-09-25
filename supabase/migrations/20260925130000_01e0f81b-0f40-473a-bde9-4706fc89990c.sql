-- =====================================================================
-- Личный кабинет Edvora
--   1. Расширенный профиль студента (в таблице profiles)
--   2. Страны интереса сохраняются уже при регистрации
--   3. Задачи с дедлайнами и напоминаниями (tasks)
--   4. Избранные программы (favorite_programs) — отдельно от
--      избранных университетов (favorite_universities уже есть)
--   5. Статусы заявок: «В прогрессе» / «Подал(ась)» (applications)
-- На всех таблицах включён Row-Level Security: каждый пользователь
-- видит и меняет только свои строки.
-- =====================================================================

-- ---------- 1. Профиль студента ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS gpa text,
  ADD COLUMN IF NOT EXISTS ielts text,
  ADD COLUMN IF NOT EXISTS toefl text,
  ADD COLUMN IF NOT EXISTS sat text,
  ADD COLUMN IF NOT EXISTS language_exam text,
  ADD COLUMN IF NOT EXISTS extra_exams text,
  ADD COLUMN IF NOT EXISTS budget_usd text,
  ADD COLUMN IF NOT EXISTS intended_level text,
  ADD COLUMN IF NOT EXISTS intended_major text,
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS skipped_tests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS documents text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gender_check CHECK (gender IS NULL OR gender IN ('male', 'female'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_text_lengths_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_text_lengths_check CHECK (
    coalesce(length(full_name), 0) <= 200
    AND coalesce(length(city), 0) <= 200
    AND coalesce(length(gpa), 0) <= 50
    AND coalesce(length(ielts), 0) <= 50
    AND coalesce(length(toefl), 0) <= 50
    AND coalesce(length(sat), 0) <= 50
    AND coalesce(length(language_exam), 0) <= 100
    AND coalesce(length(extra_exams), 0) <= 200
    AND coalesce(length(budget_usd), 0) <= 50
    AND coalesce(length(intended_level), 0) <= 100
    AND coalesce(length(intended_major), 0) <= 200
    AND coalesce(length(about), 0) <= 2000
  );

-- ---------- 2. Регистрация: сохраняем имя И страны интереса ----------
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  countries text[] := '{}';
BEGIN
  IF jsonb_typeof(NEW.raw_user_meta_data -> 'target_countries') = 'array' THEN
    countries := ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data -> 'target_countries'));
  END IF;

  INSERT INTO public.profiles (id, full_name, target_countries)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    countries
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- ---------- 3. Задачи, дедлайны, напоминания ----------
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  notes text CHECK (notes IS NULL OR length(notes) <= 2000),
  due_at timestamptz,
  remind_at timestamptz,
  program_key text CHECK (program_key IS NULL OR length(program_key) <= 500),
  done boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_user_due_idx ON public.tasks (user_id, due_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add own tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 4. Избранные программы ----------
CREATE TABLE IF NOT EXISTS public.favorite_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_key text NOT NULL CHECK (length(program_key) <= 500),
  university text NOT NULL CHECK (length(university) <= 300),
  program text NOT NULL CHECK (length(program) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_programs TO authenticated;
GRANT ALL ON public.favorite_programs TO service_role;
ALTER TABLE public.favorite_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own favorite programs" ON public.favorite_programs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add own favorite programs" ON public.favorite_programs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own favorite programs" ON public.favorite_programs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorite programs" ON public.favorite_programs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------- 5. Заявки и их статусы ----------
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_key text NOT NULL CHECK (length(program_key) <= 500),
  university text NOT NULL CHECK (length(university) <= 300),
  program text NOT NULL CHECK (length(program) <= 500),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted')),
  notes text CHECK (notes IS NULL OR length(notes) <= 2000),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own applications" ON public.applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add own applications" ON public.applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON public.applications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own applications" ON public.applications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
