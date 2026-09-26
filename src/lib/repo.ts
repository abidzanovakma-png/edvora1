// Слой данных личного кабинета.
//
// Работает в двух режимах и выбирает режим сам:
//
//  • "tables"   — в базе есть таблицы tasks / favorite_programs / applications
//                 и новые колонки profiles (миграция 20260925130000 применена).
//                 Это основной, «правильный» режим.
//
//  • "fallback" — миграция ещё не применена (нет кредитов в Lovable).
//                 Данные временно хранятся в уже существующей таблице
//                 favorite_universities, у которой есть RLS: каждый видит
//                 только свои строки. Каждая запись — отдельная строка,
//                 колонка university = "@@edvora-store@@" + JSON.
//
// Как только миграцию применят, при следующем входе пользователя все его
// временные записи автоматически переносятся в настоящие таблицы, а временные
// строки удаляются. Пользователь ничего не теряет.

import { supabase } from "@/integrations/supabase/client";
import type { ApplicationRow, ApplicationStatus, Gender, ProgramRef, TaskRow } from "@/lib/userData";

export type Mode = "tables" | "fallback";

export const STORE_PREFIX = "@@edvora-store@@";

/** Строки временного хранилища не должны показываться как избранные университеты. */
export function isStoreRow(university: string) {
  return university.startsWith(STORE_PREFIX);
}

// ---------- Типы ----------

export type ProfileData = {
  full_name: string | null;
  target_countries: string[];
  gender: Gender;
  city: string | null;
  gpa: string | null;
  ielts: string | null;
  toefl: string | null;
  sat: string | null;
  language_exam: string | null;
  extra_exams: string | null;
  budget_usd: string | null;
  intended_level: string | null;
  intended_major: string | null;
  about: string | null;
  skipped_tests: string[];
  documents: string[];
};

const EXTRA_TEXT_FIELDS = [
  "city",
  "gpa",
  "ielts",
  "toefl",
  "sat",
  "language_exam",
  "extra_exams",
  "budget_usd",
  "intended_level",
  "intended_major",
  "about",
] as const;

export type TaskInput = {
  title: string;
  notes: string | null;
  due_at: string | null;
  remind_at: string | null;
  program_key: string | null;
};

type StoreItem =
  | ({ type: "task" } & TaskRow)
  | ({ type: "fav" } & ProgramRef & { created_at: string })
  | ({ type: "app" } & Omit<ApplicationRow, "id">)
  | ({ type: "profile" } & Partial<ProfileData>);

type StoreRow = { rowId: string; item: StoreItem };

// ---------- Общие помощники ----------

function isMissingSchema(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "PGRST204" ||
    error.code === "42P01" ||
    error.code === "42703" ||
    /could not find the table|could not find the .* column|does not exist|schema cache/i.test(error.message ?? "")
  );
}

async function userId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function sortTasks(tasks: TaskRow[]) {
  return [...tasks].sort((a, b) => {
    if (!a.due_at && !b.due_at) return a.created_at.localeCompare(b.created_at);
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return a.due_at.localeCompare(b.due_at);
  });
}

// ---------- Определение режима (+ автоматический перенос) ----------

// Режим запоминается для каждого пользователя отдельно: перенос данных
// должен выполниться для каждого, кто заходит после применения миграции.
const modeByUser = new Map<string, Promise<Mode>>();

export async function getMode(): Promise<Mode> {
  const uid = await userId();
  if (!uid) return "fallback";
  let promise = modeByUser.get(uid);
  if (!promise) {
    promise = (async (): Promise<Mode> => {
      const { error } = await supabase.from("tasks").select("id").limit(1);
      if (error && isMissingSchema(error)) return "fallback";
      if (error) {
        // Сеть или что-то временное — не запоминаем результат, попробуем ещё раз позже.
        modeByUser.delete(uid);
        return "fallback";
      }
      await migrateStoreToTables(uid).catch(() => undefined);
      return "tables";
    })();
    modeByUser.set(uid, promise);
  }
  return promise;
}

// ---------- Временное хранилище (fallback) ----------

// Индекс в базе ограничивает размер строки (~2.7 КБ), поэтому длинные тексты урезаем.
const MAX_ROW_BYTES = 2400;

function encode(item: StoreItem) {
  let value = STORE_PREFIX + JSON.stringify(item);
  const encoder = new TextEncoder();
  if (encoder.encode(value).length > MAX_ROW_BYTES) {
    const trimmed = { ...item } as Record<string, unknown>;
    for (const key of ["notes", "about"]) {
      if (typeof trimmed[key] === "string") trimmed[key] = (trimmed[key] as string).slice(0, 400);
    }
    value = STORE_PREFIX + JSON.stringify(trimmed);
  }
  return value;
}

async function loadStore(uid: string): Promise<StoreRow[]> {
  const { data, error } = await supabase
    .from("favorite_universities")
    .select("id, university")
    .eq("user_id", uid)
    .like("university", `${STORE_PREFIX}%`);
  if (error || !data) return [];
  const rows: StoreRow[] = [];
  for (const row of data) {
    try {
      rows.push({ rowId: row.id, item: JSON.parse(row.university.slice(STORE_PREFIX.length)) as StoreItem });
    } catch {
      // повреждённая строка — пропускаем
    }
  }
  return rows;
}

async function storeInsert(uid: string, item: StoreItem) {
  const { error } = await supabase.from("favorite_universities").insert({ user_id: uid, university: encode(item) });
  return !error;
}

async function storeUpdate(rowId: string, item: StoreItem) {
  const { error } = await supabase.from("favorite_universities").update({ university: encode(item) }).eq("id", rowId);
  return !error;
}

async function storeDelete(rowIds: string[]) {
  if (rowIds.length === 0) return true;
  const { error } = await supabase.from("favorite_universities").delete().in("id", rowIds);
  return !error;
}

// ---------- Перенос из временного хранилища в таблицы ----------

async function migrateStoreToTables(uid: string) {
  const rows = await loadStore(uid);
  if (rows.length === 0) return;

  const done: string[] = [];
  for (const { rowId, item } of rows) {
    let ok = false;
    if (item.type === "task") {
      const { type: _type, ...task } = item;
      const { error } = await supabase.from("tasks").upsert({ ...task, user_id: uid }, { onConflict: "id", ignoreDuplicates: true });
      ok = !error;
    } else if (item.type === "fav") {
      const { error } = await supabase
        .from("favorite_programs")
        .upsert({ user_id: uid, program_key: item.program_key, university: item.university, program: item.program, created_at: item.created_at }, { onConflict: "user_id,program_key", ignoreDuplicates: true });
      ok = !error;
    } else if (item.type === "app") {
      const { error } = await supabase
        .from("applications")
        .upsert({ user_id: uid, program_key: item.program_key, university: item.university, program: item.program, status: item.status, submitted_at: item.submitted_at }, { onConflict: "user_id,program_key", ignoreDuplicates: true });
      ok = !error;
    } else if (item.type === "profile") {
      const { type: _type, ...profile } = item;
      const { error } = await supabase.from("profiles").update(profile).eq("id", uid);
      ok = !error;
    }
    if (ok) done.push(rowId);
  }
  await storeDelete(done);
}

// ---------- Задачи ----------

const TASK_COLUMNS = "id, title, notes, due_at, remind_at, program_key, done, completed_at, created_at";

export async function listTasks(): Promise<TaskRow[]> {
  const uid = await userId();
  if (!uid) return [];
  if ((await getMode()) === "tables") {
    const { data } = await supabase.from("tasks").select(TASK_COLUMNS).eq("user_id", uid);
    return sortTasks((data ?? []) as TaskRow[]);
  }
  const rows = await loadStore(uid);
  return sortTasks(rows.flatMap(({ item }) => (item.type === "task" ? [stripType(item)] : [])));
}

function stripType<T extends { type: string }>(item: T): Omit<T, "type"> {
  const { type: _type, ...rest } = item;
  return rest;
}

/** Создаёт задачу (без id) или обновляет существующую (с id). */
export async function saveTask(input: TaskInput, id?: string | null): Promise<boolean> {
  const uid = await userId();
  if (!uid) return false;
  if ((await getMode()) === "tables") {
    const { error } = id
      ? await supabase.from("tasks").update(input).eq("id", id).eq("user_id", uid)
      : await supabase.from("tasks").insert({ ...input, user_id: uid });
    return !error;
  }
  const rows = await loadStore(uid);
  if (id) {
    const row = rows.find(({ item }) => item.type === "task" && item.id === id);
    if (!row || row.item.type !== "task") return false;
    return storeUpdate(row.rowId, { ...row.item, ...input });
  }
  const task: TaskRow = { id: newId(), ...input, done: false, completed_at: null, created_at: new Date().toISOString() };
  return storeInsert(uid, { type: "task", ...task });
}

export async function setTaskDone(task: TaskRow, done: boolean): Promise<boolean> {
  const uid = await userId();
  if (!uid) return false;
  const completed_at = done ? new Date().toISOString() : null;
  if ((await getMode()) === "tables") {
    const { error } = await supabase.from("tasks").update({ done, completed_at }).eq("id", task.id).eq("user_id", uid);
    return !error;
  }
  const rows = await loadStore(uid);
  const row = rows.find(({ item }) => item.type === "task" && item.id === task.id);
  if (!row || row.item.type !== "task") return false;
  return storeUpdate(row.rowId, { ...row.item, done, completed_at });
}

export async function deleteTask(id: string): Promise<boolean> {
  const uid = await userId();
  if (!uid) return false;
  if ((await getMode()) === "tables") {
    const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", uid);
    return !error;
  }
  const rows = await loadStore(uid);
  return storeDelete(rows.filter(({ item }) => item.type === "task" && item.id === id).map(({ rowId }) => rowId));
}

// ---------- Избранные программы ----------

export async function listFavoritePrograms(): Promise<ProgramRef[]> {
  const uid = await userId();
  if (!uid) return [];
  if ((await getMode()) === "tables") {
    const { data } = await supabase
      .from("favorite_programs")
      .select("program_key, university, program")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    return data ?? [];
  }
  const rows = await loadStore(uid);
  return rows
    .flatMap(({ item }) => (item.type === "fav" ? [item] : []))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(({ program_key, university, program }) => ({ program_key, university, program }));
}

export async function addFavoriteProgram(ref: ProgramRef): Promise<boolean> {
  const uid = await userId();
  if (!uid) return false;
  if ((await getMode()) === "tables") {
    const { error } = await supabase.from("favorite_programs").insert({ user_id: uid, ...ref });
    return !error;
  }
  const rows = await loadStore(uid);
  if (rows.some(({ item }) => item.type === "fav" && item.program_key === ref.program_key)) return true;
  return storeInsert(uid, { type: "fav", ...ref, created_at: new Date().toISOString() });
}

export async function removeFavoriteProgram(key: string): Promise<boolean> {
  const uid = await userId();
  if (!uid) return false;
  if ((await getMode()) === "tables") {
    const { error } = await supabase.from("favorite_programs").delete().eq("user_id", uid).eq("program_key", key);
    return !error;
  }
  const rows = await loadStore(uid);
  return storeDelete(rows.filter(({ item }) => item.type === "fav" && item.program_key === key).map(({ rowId }) => rowId));
}

// ---------- Заявки ----------

const APP_COLUMNS = "id, program_key, university, program, status, submitted_at, updated_at";

export async function listApplications(): Promise<ApplicationRow[]> {
  const uid = await userId();
  if (!uid) return [];
  if ((await getMode()) === "tables") {
    const { data } = await supabase.from("applications").select(APP_COLUMNS).eq("user_id", uid).order("updated_at", { ascending: false });
    return (data ?? []) as ApplicationRow[];
  }
  const rows = await loadStore(uid);
  return rows
    .flatMap(({ rowId, item }) => (item.type === "app" ? [{ ...stripType(item), id: rowId } as ApplicationRow] : []))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function saveApplication(ref: ProgramRef, status: ApplicationStatus, submitted_at: string | null): Promise<ApplicationRow | null> {
  const uid = await userId();
  if (!uid) return null;
  if ((await getMode()) === "tables") {
    const { data, error } = await supabase
      .from("applications")
      .upsert({ user_id: uid, ...ref, status, submitted_at }, { onConflict: "user_id,program_key" })
      .select(APP_COLUMNS)
      .single();
    return error || !data ? null : (data as ApplicationRow);
  }
  const rows = await loadStore(uid);
  const updated_at = new Date().toISOString();
  const item: StoreItem = { type: "app", ...ref, status, submitted_at, updated_at };
  const existing = rows.find(({ item: current }) => current.type === "app" && current.program_key === ref.program_key);
  const ok = existing ? await storeUpdate(existing.rowId, item) : await storeInsert(uid, item);
  if (!ok) return null;
  return { id: existing?.rowId ?? newId(), ...ref, status, submitted_at, updated_at };
}

export async function deleteApplication(key: string): Promise<boolean> {
  const uid = await userId();
  if (!uid) return false;
  if ((await getMode()) === "tables") {
    const { error } = await supabase.from("applications").delete().eq("user_id", uid).eq("program_key", key);
    return !error;
  }
  const rows = await loadStore(uid);
  return storeDelete(rows.filter(({ item }) => item.type === "app" && item.program_key === key).map(({ rowId }) => rowId));
}

// ---------- Профиль ----------

function normalizeProfile(record: Record<string, unknown>): Partial<ProfileData> {
  const result: Partial<ProfileData> = {};
  const text = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : null);
  const list = (key: string) => (Array.isArray(record[key]) ? (record[key] as string[]) : undefined);
  if ("full_name" in record) result.full_name = text("full_name");
  const countries = list("target_countries");
  if (countries) result.target_countries = countries;
  if ("gender" in record) result.gender = record["gender"] === "male" || record["gender"] === "female" ? record["gender"] : null;
  for (const key of EXTRA_TEXT_FIELDS) if (key in record) result[key] = text(key);
  const skipped = list("skipped_tests");
  if (skipped) result.skipped_tests = skipped;
  const documents = list("documents");
  if (documents) result.documents = documents;
  return result;
}

/** Профиль целиком: базовые поля из profiles + расширенные (из таблицы или временного хранилища). */
export async function loadProfile(): Promise<Partial<ProfileData> | null> {
  const uid = await userId();
  if (!uid) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
  const base = data ? normalizeProfile(data as Record<string, unknown>) : null;
  if ((await getMode()) === "tables") return base;
  const rows = await loadStore(uid);
  const stored = rows.find(({ item }) => item.type === "profile");
  if (!stored) return base;
  const { type: _type, ...extras } = stored.item as { type: "profile" } & Partial<ProfileData>;
  return { ...(base ?? {}), ...normalizeProfile(extras as Record<string, unknown>) };
}

export async function saveProfile(profile: Partial<ProfileData>): Promise<boolean> {
  const uid = await userId();
  if (!uid) return false;
  if ((await getMode()) === "tables") {
    const { error } = await supabase.from("profiles").upsert({ id: uid, ...profile }, { onConflict: "id" });
    return !error;
  }
  // Базовые поля — в profiles (эти колонки есть всегда), остальное — во временное хранилище.
  const { full_name, target_countries, ...extras } = profile;
  const base: { id: string; full_name?: string | null; target_countries?: string[] } = { id: uid };
  if (full_name !== undefined) base.full_name = full_name;
  if (target_countries !== undefined) base.target_countries = target_countries;
  const { error } = await supabase.from("profiles").upsert(base, { onConflict: "id" });
  if (error) return false;
  if (Object.keys(extras).length === 0) return true;
  const rows = await loadStore(uid);
  const existing = rows.find(({ item }) => item.type === "profile");
  const merged: StoreItem = existing
    ? { ...(existing.item as { type: "profile" } & Partial<ProfileData>), ...extras, type: "profile" }
    : { type: "profile", ...extras };
  return existing ? storeUpdate(existing.rowId, merged) : storeInsert(uid, merged);
}

// ---------- Избранные университеты ----------

export async function listFavoriteUniversities(): Promise<string[]> {
  const uid = await userId();
  if (!uid) return [];
  const { data } = await supabase.from("favorite_universities").select("university").eq("user_id", uid);
  return (data ?? []).map((row) => row.university).filter((name) => !isStoreRow(name));
}
