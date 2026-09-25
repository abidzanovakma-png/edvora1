// Общие функции для данных личного кабинета: избранные программы,
// заявки и их статусы, задачи. Всё хранится в базе (Lovable Cloud),
// каждая таблица защищена RLS — пользователь видит только свои строки.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import programsData from "@/data/programs.json";

export type CatalogProgram = (typeof programsData)[number];

export type ApplicationStatus = "in_progress" | "submitted";
export type Gender = "male" | "female" | null;

export type ProgramRef = { program_key: string; university: string; program: string };
export type ApplicationRow = ProgramRef & { id: string; status: ApplicationStatus; submitted_at: string | null; updated_at: string };
export type TaskRow = {
  id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  remind_at: string | null;
  program_key: string | null;
  done: boolean;
  completed_at: string | null;
  created_at: string;
};

/** Уникальный ключ программы: университет + название программы. */
export function programKey(program: { university: string; program: string }) {
  return `${program.university}::${program.program}`;
}

export function programRef(program: { university: string; program: string }): ProgramRef {
  return { program_key: programKey(program), university: program.university, program: program.program };
}

export function findProgram(key: string | null | undefined): CatalogProgram | undefined {
  if (!key) return undefined;
  return programsData.find((item) => programKey(item) === key);
}

export function findUniversity(name: string): CatalogProgram | undefined {
  return programsData.find((item) => item.university === name);
}

/** «Подался» / «Подалась» / «Подал(а)» в зависимости от пола в профиле. */
export function submittedLabel(gender: Gender) {
  if (gender === "male") return "Подался";
  if (gender === "female") return "Подалась";
  return "Подал(а)";
}

export function statusLabel(status: ApplicationStatus, gender: Gender) {
  return status === "submitted" ? submittedLabel(gender) : "В прогрессе";
}

/**
 * true, если таблицы ещё нет в базе (миграция не применена).
 * Тогда показываем понятное сообщение вместо сломанной страницы.
 */
export function isMissingTableError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.code === "42703" ||
    /could not find the table|does not exist|schema cache/i.test(error.message ?? "")
  );
}

export async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ---------- Даты ----------

/** ISO → значение для <input type="datetime-local"> в местном времени. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Значение <input type="datetime-local"> → ISO (или null, если пусто). */
export function fromLocalInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export type TaskUrgency = "done" | "overdue" | "soon" | "later" | "none";

const SOON_MS = 3 * 24 * 60 * 60 * 1000; // «скоро» = в ближайшие 3 дня

export function taskUrgency(task: Pick<TaskRow, "done" | "due_at">, now = Date.now()): TaskUrgency {
  if (task.done) return "done";
  if (!task.due_at) return "none";
  const due = new Date(task.due_at).getTime();
  if (due < now) return "overdue";
  if (due - now <= SOON_MS) return "soon";
  return "later";
}

/** Задачи, о которых пора напомнить: просроченные, горящие и те, у кого наступило время напоминания. */
export function tasksNeedingReminder(tasks: TaskRow[], now = Date.now()) {
  return tasks.filter((task) => {
    if (task.done) return false;
    const urgency = taskUrgency(task, now);
    const remindDue = task.remind_at ? new Date(task.remind_at).getTime() <= now : false;
    return urgency === "overdue" || urgency === "soon" || remindDue;
  });
}

// ---------- Хук: избранные программы и заявки ----------

/**
 * Загружает избранные программы и заявки текущего пользователя
 * и даёт функции для их изменения. Используется и в каталоге, и в кабинете.
 */
export function useProgramLists() {
  const [favoritePrograms, setFavoritePrograms] = useState<ProgramRef[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [missingTables, setMissingTables] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const userId = await currentUserId();
    if (!userId) return;
    const [favorites, apps] = await Promise.all([
      supabase.from("favorite_programs").select("program_key, university, program").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("applications").select("id, program_key, university, program, status, submitted_at, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }),
    ]);
    setMissingTables(isMissingTableError(favorites.error) || isMissingTableError(apps.error));
    setFavoritePrograms(favorites.data ?? []);
    setApplications((apps.data ?? []) as ApplicationRow[]);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const isFavoriteProgram = useCallback(
    (key: string) => favoritePrograms.some((item) => item.program_key === key),
    [favoritePrograms],
  );

  const toggleFavoriteProgram = useCallback(
    async (program: { university: string; program: string }) => {
      const ref = programRef(program);
      const was = favoritePrograms.some((item) => item.program_key === ref.program_key);
      setFavoritePrograms((current) => (was ? current.filter((item) => item.program_key !== ref.program_key) : [ref, ...current]));
      const userId = await currentUserId();
      if (!userId) return false;
      const result = was
        ? await supabase.from("favorite_programs").delete().eq("user_id", userId).eq("program_key", ref.program_key)
        : await supabase.from("favorite_programs").insert({ user_id: userId, ...ref });
      if (result.error) {
        setFavoritePrograms((current) => (was ? [ref, ...current] : current.filter((item) => item.program_key !== ref.program_key)));
        return false;
      }
      return true;
    },
    [favoritePrograms],
  );

  const applicationFor = useCallback(
    (key: string) => applications.find((item) => item.program_key === key),
    [applications],
  );

  /** status = null — убрать программу из заявок. */
  const setApplicationStatus = useCallback(
    async (program: { university: string; program: string }, status: ApplicationStatus | null) => {
      const ref = programRef(program);
      const userId = await currentUserId();
      if (!userId) return false;
      const previous = applications;
      if (status === null) {
        setApplications((current) => current.filter((item) => item.program_key !== ref.program_key));
        const { error } = await supabase.from("applications").delete().eq("user_id", userId).eq("program_key", ref.program_key);
        if (error) {
          setApplications(previous);
          return false;
        }
        return true;
      }
      const existing = applications.find((item) => item.program_key === ref.program_key);
      const submitted_at = status === "submitted" ? existing?.submitted_at ?? new Date().toISOString() : null;
      const { data, error } = await supabase
        .from("applications")
        .upsert({ user_id: userId, ...ref, status, submitted_at }, { onConflict: "user_id,program_key" })
        .select("id, program_key, university, program, status, submitted_at, updated_at")
        .single();
      if (error || !data) return false;
      setApplications((current) => [data as ApplicationRow, ...current.filter((item) => item.program_key !== ref.program_key)]);
      return true;
    },
    [applications],
  );

  return {
    loaded,
    missingTables,
    favoritePrograms,
    applications,
    reload,
    isFavoriteProgram,
    toggleFavoriteProgram,
    applicationFor,
    setApplicationStatus,
  };
}

/** Пол пользователя из профиля (для «Подался/Подалась»). */
export function useGender() {
  const [gender, setGender] = useState<Gender>(null);
  useEffect(() => {
    let active = true;
    void (async () => {
      const userId = await currentUserId();
      if (!userId) return;
      const { data } = await supabase.from("profiles").select("gender").eq("id", userId).maybeSingle();
      if (active && data && (data.gender === "male" || data.gender === "female")) setGender(data.gender);
    })();
    return () => {
      active = false;
    };
  }, []);
  return [gender, setGender] as const;
}
