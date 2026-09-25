import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlarmClock,
  ArrowLeft,
  Bookmark,
  CalendarClock,
  CircleCheck,
  Circle,
  ClipboardList,
  GraduationCap,
  Heart,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Send,
  Trash,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import programsData from "@/data/programs.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NativeSelect, StatusSelect } from "@/components/StatusSelect";
import {
  currentUserId,
  findProgram,
  findUniversity,
  formatDateTime,
  fromLocalInput,
  isMissingTableError,
  programKey,
  submittedLabel,
  taskUrgency,
  toLocalInput,
  useProgramLists,
  type ApplicationStatus,
  type Gender,
  type TaskRow,
  type TaskUrgency,
} from "@/lib/userData";

const TABS = ["profile", "tasks", "favorites", "applications"] as const;
type CabinetTab = (typeof TABS)[number];

export const Route = createFileRoute("/_authenticated/cabinet")({
  validateSearch: (search: Record<string, unknown>): { tab?: CabinetTab } => ({
    tab: TABS.includes(search.tab as CabinetTab) ? (search.tab as CabinetTab) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Личный кабинет — Edvora" },
      { name: "description", content: "Профиль студента, задачи и дедлайны, избранное и статусы заявок в Edvora." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CabinetPage,
});

const countries = ["Китай", "Южная Корея", "Япония"] as const;
const levels = ["Бакалавриат", "Магистратура", "Аспирантура"] as const;
const documentOptions = [
  ["motivation", "Мотивационное письмо"],
  ["recommendations", "Рекомендательные письма"],
  ["portfolio", "Портфолио"],
] as const;

// Поля профиля студента. skippable — можно отметить «нет теста».
const scoreFields = [
  { key: "gpa", label: "GPA (по шкале 4.0)", placeholder: "3.6", skippable: true },
  { key: "ielts", label: "IELTS Academic", placeholder: "6.5", skippable: true },
  { key: "toefl", label: "TOEFL iBT", placeholder: "92", skippable: true },
  { key: "sat", label: "SAT / ACT", placeholder: "1350", skippable: true },
  { key: "language_exam", label: "Языковой экзамен (HSK/TOPIK/EJU)", placeholder: "HSK 4", skippable: true },
  { key: "extra_exams", label: "Доп. экзамены (IB, A-Level, ЕГЭ)", placeholder: "IB 36", skippable: false },
  { key: "budget_usd", label: "Бюджет, USD / год", placeholder: "8000", skippable: false },
] as const;
type ScoreKey = (typeof scoreFields)[number]["key"];

type ProfileForm = {
  full_name: string;
  gender: Gender;
  city: string;
  target_countries: string[];
  intended_level: string;
  intended_major: string;
  about: string;
  documents: string[];
  skipped_tests: string[];
} & Record<ScoreKey, string>;

const emptyProfile: ProfileForm = {
  full_name: "",
  gender: null,
  city: "",
  target_countries: [...countries],
  intended_level: "",
  intended_major: "",
  about: "",
  documents: [],
  skipped_tests: [],
  gpa: "",
  ielts: "",
  toefl: "",
  sat: "",
  language_exam: "",
  extra_exams: "",
  budget_usd: "",
};

const allMajors = [...new Set(programsData.flatMap((program) => program.majors))].sort((a, b) => a.localeCompare(b, "ru"));

function CabinetPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const lists = useProgramLists();

  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [favoriteUniversities, setFavoriteUniversities] = useState<string[]>([]);
  const [missingTables, setMissingTables] = useState(false);

  const loadTasks = useCallback(async () => {
    const userId = await currentUserId();
    if (!userId) return;
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, notes, due_at, remind_at, program_key, done, completed_at, created_at")
      .eq("user_id", userId)
      .order("due_at", { ascending: true, nullsFirst: false });
    if (isMissingTableError(error)) setMissingTables(true);
    setTasks((data ?? []) as TaskRow[]);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || !active) return;
      setEmail(user.email ?? "");
      const [{ data: row, error: profileError }, { data: favs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("favorite_universities").select("university").eq("user_id", user.id),
      ]);
      if (!active) return;
      if (profileError && isMissingTableError(profileError)) setMissingTables(true);
      const metaName = (user.user_metadata?.["full_name"] as string | undefined) ?? (user.user_metadata?.["name"] as string | undefined) ?? "";
      if (row) {
        const record = row as Record<string, unknown>;
        const text = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : "");
        const list = (key: string) => (Array.isArray(record[key]) ? (record[key] as string[]) : []);
        const gender = record["gender"];
        setProfile({
          full_name: text("full_name") || metaName,
          gender: gender === "male" || gender === "female" ? gender : null,
          city: text("city"),
          target_countries: list("target_countries").length > 0 ? list("target_countries") : [...countries],
          intended_level: text("intended_level"),
          intended_major: text("intended_major"),
          about: text("about"),
          documents: list("documents"),
          skipped_tests: list("skipped_tests"),
          gpa: text("gpa"),
          ielts: text("ielts"),
          toefl: text("toefl"),
          sat: text("sat"),
          language_exam: text("language_exam"),
          extra_exams: text("extra_exams"),
          budget_usd: text("budget_usd"),
        });
      } else {
        setProfile({ ...emptyProfile, full_name: metaName });
      }
      setFavoriteUniversities(favs?.map((item) => item.university) ?? []);
      setProfileLoaded(true);
    })();
    void loadTasks();
    return () => {
      active = false;
    };
  }, [loadTasks]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const openTasks = tasks.filter((task) => !task.done);
  const urgentTasks = openTasks.filter((task) => {
    const urgency = taskUrgency(task);
    return urgency === "overdue" || urgency === "soon";
  });
  const nextDeadline = openTasks.find((task) => task.due_at && new Date(task.due_at).getTime() >= Date.now());
  const submittedCount = lists.applications.filter((item) => item.status === "submitted").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-card">
              <GraduationCap className="size-5" />
            </span>
            Edvora
          </Link>
          <nav className="flex items-center gap-2" aria-label="Навигация кабинета">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/"><ArrowLeft /> <span className="hidden sm:inline">Каталог программ</span><span className="sm:hidden">Каталог</span></Link>
            </Button>
            <Button variant="outline" size="sm" onClick={signOut} aria-label="Выйти из аккаунта"><LogOut className="size-4" /><span className="hidden sm:inline">Выйти</span></Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="fade-up">
          <p className="text-sm text-muted-foreground">Личный кабинет</p>
          <h1 className="mt-1 font-display text-3xl font-bold">{profile.full_name ? `Привет, ${profile.full_name.split(" ")[0]}!` : "Привет!"}</h1>
          {email && <p className="mt-1 text-sm text-muted-foreground">{email}</p>}
        </div>

        {(missingTables || lists.missingTables) && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold">База данных ещё не обновлена</p>
              <p className="mt-1 text-muted-foreground">
                Задачи, избранные программы и заявки пока не могут сохраняться: в базе нет новых таблиц. Нужно применить миграцию
                {" "}<code className="rounded bg-muted px-1">20260925130000_…sql</code> из папки <code className="rounded bg-muted px-1">supabase/migrations</code>.
              </p>
            </div>
          </div>
        )}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Сводка">
          <StatTile icon={ClipboardList} label="Открытых задач" value={String(openTasks.length)} hint={urgentTasks.length > 0 ? `${urgentTasks.length} требуют внимания` : "Всё под контролем"} alert={urgentTasks.length > 0} />
          <StatTile icon={CalendarClock} label="Ближайший дедлайн" value={nextDeadline ? formatDateTime(nextDeadline.due_at) : "—"} hint={nextDeadline?.title ?? "Нет предстоящих дедлайнов"} />
          <StatTile icon={Heart} label="В избранном" value={String(favoriteUniversities.length + lists.favoritePrograms.length)} hint={`${favoriteUniversities.length} унив. · ${lists.favoritePrograms.length} прогр.`} />
          <StatTile icon={Send} label="Заявки" value={`${submittedCount} / ${lists.applications.length}`} hint={`${submittedLabel(profile.gender)}: ${submittedCount} · В прогрессе: ${lists.applications.length - submittedCount}`} />
        </section>

        {urgentTasks.length > 0 && (
          <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-card" aria-label="Напоминания">
            <p className="flex items-center gap-2 text-sm font-semibold"><AlarmClock className="size-4 text-destructive" /> Напоминания</p>
            <ul className="mt-3 grid gap-2">
              {urgentTasks.slice(0, 5).map((task) => (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{task.title}</span>
                  <UrgencyBadge urgency={taskUrgency(task)} due={task.due_at} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <Tabs
          value={tab ?? "profile"}
          onValueChange={(value) => navigate({ to: "/cabinet", search: { tab: value as CabinetTab }, replace: true })}
          className="mt-8"
        >
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-10">
              <TabsTrigger value="profile" className="h-8 gap-1.5"><UserRound className="size-4" /> Профиль</TabsTrigger>
              <TabsTrigger value="tasks" className="h-8 gap-1.5"><ClipboardList className="size-4" /> Задачи {openTasks.length > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{openTasks.length}</span>}</TabsTrigger>
              <TabsTrigger value="favorites" className="h-8 gap-1.5"><Heart className="size-4" /> Избранное</TabsTrigger>
              <TabsTrigger value="applications" className="h-8 gap-1.5"><Send className="size-4" /> Заявки</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile" className="mt-5">
            {profileLoaded ? <ProfileTab profile={profile} onSaved={setProfile} /> : <LoadingBlock />}
          </TabsContent>
          <TabsContent value="tasks" className="mt-5">
            <TasksTab tasks={tasks} reload={loadTasks} />
          </TabsContent>
          <TabsContent value="favorites" className="mt-5">
            <FavoritesTab
              gender={profile.gender}
              universities={favoriteUniversities}
              onUniversitiesChange={setFavoriteUniversities}
              lists={lists}
            />
          </TabsContent>
          <TabsContent value="applications" className="mt-5">
            <ApplicationsTab gender={profile.gender} lists={lists} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ======================= Профиль =======================

function ProfileTab({ profile, onSaved }: { profile: ProfileForm; onSaved: (profile: ProfileForm) => void }) {
  const [form, setForm] = useState<ProfileForm>(profile);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(profile), [profile]);

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleIn = (key: "target_countries" | "documents" | "skipped_tests", value: string) =>
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
    }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.target_countries.length === 0) {
      toast.error("Выберите хотя бы одну страну интереса");
      return;
    }
    setSaving(true);
    const userId = await currentUserId();
    if (!userId) {
      setSaving(false);
      return;
    }
    const clean = (value: string) => value.trim() || null;
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: clean(form.full_name),
        gender: form.gender,
        city: clean(form.city),
        target_countries: form.target_countries,
        intended_level: clean(form.intended_level),
        intended_major: clean(form.intended_major),
        about: clean(form.about),
        documents: form.documents,
        skipped_tests: form.skipped_tests,
        gpa: clean(form.gpa),
        ielts: clean(form.ielts),
        toefl: clean(form.toefl),
        sat: clean(form.sat),
        language_exam: clean(form.language_exam),
        extra_exams: clean(form.extra_exams),
        budget_usd: clean(form.budget_usd),
      },
      { onConflict: "id" },
    );
    setSaving(false);
    if (error) {
      toast.error(isMissingTableError(error) ? "Профиль не сохранён: база ещё не обновлена (нужна миграция)." : "Не удалось сохранить профиль. Попробуйте ещё раз.");
      return;
    }
    onSaved(form);
    toast.success("Профиль сохранён");
  };

  return (
    <form onSubmit={save} className="grid gap-6">
      <Card title="Личные данные">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Имя и фамилия">
            <Input value={form.full_name} onChange={(event) => set("full_name", event.target.value)} placeholder="Акмаль Абиджанов" maxLength={200} />
          </Field>
          <Field label="Город">
            <Input value={form.city} onChange={(event) => set("city", event.target.value)} placeholder="Алматы" maxLength={200} />
          </Field>
          <div className="text-sm font-medium">
            <p>Пол</p>
            <p className="mt-0.5 text-xs font-normal text-muted-foreground">Нужен, чтобы статус заявки писался как «Подался» или «Подалась».</p>
            <div className="mt-2 flex gap-2">
              {([["male", "Он"], ["female", "Она"]] as const).map(([value, label]) => (
                <Button key={value} type="button" size="sm" variant={form.gender === value ? "secondary" : "outline"} aria-pressed={form.gender === value} onClick={() => set("gender", form.gender === value ? null : value)}>
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="text-sm font-medium">
            <p>Страны интереса</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {countries.map((item) => {
                const active = form.target_countries.includes(item);
                return <Button key={item} type="button" size="sm" variant={active ? "secondary" : "outline"} aria-pressed={active} onClick={() => toggleIn("target_countries", item)}>{item}</Button>;
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Цели обучения">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Уровень обучения">
            <NativeSelect value={form.intended_level} onChange={(value) => set("intended_level", value)} options={[["", "Не выбран"], ...levels.map((item) => [item, item] as [string, string])]} />
          </Field>
          <Field label="Специальность">
            <NativeSelect value={form.intended_major} onChange={(value) => set("intended_major", value)} options={[["", "Не выбрана"], ...allMajors.map((item) => [item, item] as [string, string])]} />
          </Field>
        </div>
      </Card>

      <Card title="Баллы и экзамены">
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {scoreFields.map((field) => {
            const skipped = form.skipped_tests.includes(field.key);
            return (
              <label key={field.key} className="block min-w-0 text-sm font-medium">
                <span className="mb-2 flex min-h-8 items-start justify-between gap-2 leading-tight">
                  {field.label}
                  {field.skippable && (
                    <Button type="button" size="sm" variant={skipped ? "secondary" : "outline"} className="h-6 shrink-0 rounded-full px-2 text-[10px] font-normal" aria-pressed={skipped} onClick={() => toggleIn("skipped_tests", field.key)}>нет теста</Button>
                  )}
                </span>
                <Input value={form[field.key]} disabled={skipped} placeholder={field.placeholder} maxLength={100} onChange={(event) => set(field.key, event.target.value)} />
              </label>
            );
          })}
        </div>
        <p className="mt-6 text-sm font-medium">Документы, готовые к подаче</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {documentOptions.map(([key, label]) => {
            const active = form.documents.includes(key);
            return <Button key={key} type="button" size="sm" variant={active ? "secondary" : "outline"} aria-pressed={active} onClick={() => toggleIn("documents", key)}>{label}</Button>;
          })}
        </div>
      </Card>

      <Card title="О себе">
        <Textarea value={form.about} onChange={(event) => set("about", event.target.value)} placeholder="Достижения, олимпиады, волонтёрство, чем хотите заниматься" maxLength={2000} rows={4} />
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Сохранить профиль</Button>
        <Button type="button" variant="outline" onClick={() => setForm(profile)} disabled={saving}>Отменить изменения</Button>
      </div>
    </form>
  );
}

// ======================= Задачи =======================

type TaskDraft = { id: string | null; title: string; notes: string; due: string; remind: string; programKey: string };
const emptyDraft: TaskDraft = { id: null, title: "", notes: "", due: "", remind: "", programKey: "" };

const urgencyGroups: Array<[TaskUrgency, string]> = [
  ["overdue", "Просрочено"],
  ["soon", "Скоро (3 дня)"],
  ["later", "Позже"],
  ["none", "Без срока"],
  ["done", "Выполнено"],
];

function TasksTab({ tasks, reload }: { tasks: TaskRow[]; reload: () => Promise<void> }) {
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    const now = Date.now();
    return urgencyGroups
      .map(([urgency, label]) => [urgency, label, tasks.filter((task) => taskUrgency(task, now) === urgency)] as const)
      .filter(([, , items]) => items.length > 0);
  }, [tasks]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    setSaving(true);
    const userId = await currentUserId();
    if (!userId) {
      setSaving(false);
      return;
    }
    const payload = {
      title,
      notes: draft.notes.trim() || null,
      due_at: fromLocalInput(draft.due),
      remind_at: fromLocalInput(draft.remind),
      program_key: draft.programKey || null,
    };
    const { error } = draft.id
      ? await supabase.from("tasks").update(payload).eq("id", draft.id).eq("user_id", userId)
      : await supabase.from("tasks").insert({ ...payload, user_id: userId });
    setSaving(false);
    if (error) {
      toast.error(isMissingTableError(error) ? "Задача не сохранена: база ещё не обновлена (нужна миграция)." : "Не удалось сохранить задачу.");
      return;
    }
    toast.success(draft.id ? "Задача обновлена" : "Задача добавлена");
    setDraft(emptyDraft);
    await reload();
  };

  const toggleDone = async (task: TaskRow) => {
    const done = !task.done;
    const { error } = await supabase.from("tasks").update({ done, completed_at: done ? new Date().toISOString() : null }).eq("id", task.id);
    if (error) toast.error("Не удалось обновить задачу.");
    await reload();
  };

  const remove = async (task: TaskRow) => {
    if (!window.confirm(`Удалить задачу «${task.title}»?`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) toast.error("Не удалось удалить задачу.");
    if (draft.id === task.id) setDraft(emptyDraft);
    await reload();
  };

  const edit = (task: TaskRow) => {
    setDraft({ id: task.id, title: task.title, notes: task.notes ?? "", due: toLocalInput(task.due_at), remind: toLocalInput(task.remind_at), programKey: task.program_key ?? "" });
    document.getElementById("task-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
      <form id="task-form" onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-card lg:sticky lg:top-24">
        <p className="font-display text-lg font-bold">{draft.id ? "Изменить задачу" : "Новая задача"}</p>
        <div className="mt-4 grid gap-4">
          <Field label="Что нужно сделать">
            <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Сдать IELTS, написать мотивационное письмо…" maxLength={200} required />
          </Field>
          <Field label="Дедлайн">
            <Input type="datetime-local" value={draft.due} onChange={(event) => setDraft({ ...draft, due: event.target.value })} />
          </Field>
          <Field label="Напомнить">
            <Input type="datetime-local" value={draft.remind} onChange={(event) => setDraft({ ...draft, remind: event.target.value })} />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">Напоминание появится на сайте, когда вы зайдёте после этого времени. Задачи с дедлайном в ближайшие 3 дня напоминаются автоматически.</span>
          </Field>
          <Field label="Программа (необязательно)">
            <NativeSelect value={draft.programKey} onChange={(value) => setDraft({ ...draft, programKey: value })} options={[["", "Без привязки"], ...programsData.map((program) => [programKey(program), `${program.university} — ${program.program}`] as [string, string])]} />
          </Field>
          <Field label="Заметки">
            <Textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} maxLength={2000} rows={3} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving || !draft.title.trim()}>{saving ? <Loader2 className="animate-spin" /> : draft.id ? <Pencil /> : <Plus />} {draft.id ? "Сохранить" : "Добавить задачу"}</Button>
            {draft.id && <Button type="button" variant="outline" onClick={() => setDraft(emptyDraft)}>Отмена</Button>}
          </div>
        </div>
      </form>

      <div className="grid gap-6">
        {grouped.length === 0 && (
          <EmptyState icon={ClipboardList} title="Задач пока нет" text="Добавьте первую: например, «Сдать IELTS» с дедлайном, и сайт напомнит о ней заранее." />
        )}
        {grouped.map(([urgency, label, items]) => (
          <section key={urgency}>
            <h3 className={`mb-2 text-sm font-semibold ${urgency === "overdue" ? "text-destructive" : "text-muted-foreground"}`}>{label} · {items.length}</h3>
            <ul className="grid gap-2">
              {items.map((task) => {
                const program = findProgram(task.program_key);
                return (
                  <li key={task.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
                    <button type="button" onClick={() => void toggleDone(task)} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary" aria-label={task.done ? "Отметить как невыполненную" : "Отметить как выполненную"}>
                      {task.done ? <CircleCheck className="size-5 text-accent" /> : <Circle className="size-5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${task.done ? "text-muted-foreground line-through" : ""}`}>{task.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {task.due_at && <UrgencyBadge urgency={taskUrgency(task)} due={task.due_at} />}
                        {task.remind_at && !task.done && <span className="inline-flex items-center gap-1"><AlarmClock className="size-3" /> {formatDateTime(task.remind_at)}</span>}
                        {program && <span className="truncate">{program.university}</span>}
                      </div>
                      {task.notes && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{task.notes}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => edit(task)} aria-label={`Изменить задачу ${task.title}`}><Pencil /></Button>
                      <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => void remove(task)} aria-label={`Удалить задачу ${task.title}`}><Trash /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

// ======================= Избранное =======================

type Lists = ReturnType<typeof useProgramLists>;

function FavoritesTab({ gender, universities, onUniversitiesChange, lists }: { gender: Gender; universities: string[]; onUniversitiesChange: (value: string[]) => void; lists: Lists }) {
  const removeUniversity = async (university: string) => {
    const userId = await currentUserId();
    if (!userId) return;
    const { error } = await supabase.from("favorite_universities").delete().eq("user_id", userId).eq("university", university);
    if (error) {
      toast.error("Не удалось убрать университет из избранного.");
      return;
    }
    onUniversitiesChange(universities.filter((item) => item !== university));
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><Heart className="size-4 text-primary" /> Университеты · {universities.length}</h3>
        {universities.length === 0 ? (
          <EmptyState icon={Heart} title="Нет избранных университетов" text="Нажмите на сердечко на карточке в каталоге, чтобы сохранить университет." />
        ) : (
          <ul className="grid gap-2">
            {universities.map((name) => {
              const info = findUniversity(name);
              return (
                <li key={name} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="min-w-0">
                    <p className="font-medium">{name}</p>
                    {info && <p className="mt-0.5 text-xs text-muted-foreground">{info.country} · {info.city} · QS {info.rank}</p>}
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => void removeUniversity(name)} aria-label={`Убрать ${name} из избранного`}><Trash /></Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><Bookmark className="size-4 text-primary" /> Программы · {lists.favoritePrograms.length}</h3>
        {lists.favoritePrograms.length === 0 ? (
          <EmptyState icon={Bookmark} title="Нет избранных программ" text="Нажмите на закладку на карточке программы в каталоге, чтобы сохранить её." />
        ) : (
          <ul className="grid gap-2">
            {lists.favoritePrograms.map((item) => {
              const application = lists.applicationFor(item.program_key);
              return (
                <li key={item.program_key} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{item.program}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.university}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => void lists.toggleFavoriteProgram(item)} aria-label={`Убрать программу ${item.program} из избранного`}><Trash /></Button>
                  </div>
                  <div className="mt-3">
                    <StatusSelect gender={gender} value={application?.status ?? null} onChange={(status) => void lists.setApplicationStatus(item, status).then((ok) => { if (!ok) toast.error("Не удалось сохранить статус."); })} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ======================= Заявки =======================

function ApplicationsTab({ gender, lists }: { gender: Gender; lists: Lists }) {
  const [newKey, setNewKey] = useState("");
  const available = programsData.filter((program) => !lists.applicationFor(programKey(program)));

  const add = async () => {
    const program = findProgram(newKey);
    if (!program) return;
    const ok = await lists.setApplicationStatus(program, "in_progress");
    if (ok) {
      setNewKey("");
      toast.success("Заявка добавлена");
    } else {
      toast.error("Не удалось добавить заявку.");
    }
  };

  const groups: Array<[ApplicationStatus, string]> = [
    ["in_progress", "В прогрессе"],
    ["submitted", submittedLabel(gender)],
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-end">
        <label className="block flex-1 text-sm font-medium">
          Добавить программу в заявки
          <div className="mt-2">
            <NativeSelect value={newKey} onChange={setNewKey} options={[["", "Выберите программу…"], ...available.map((program) => [programKey(program), `${program.university} — ${program.program}`] as [string, string])]} />
          </div>
        </label>
        <Button type="button" onClick={() => void add()} disabled={!newKey}><Plus /> Добавить</Button>
      </div>

      {lists.applications.length === 0 && (
        <EmptyState icon={Send} title="Заявок пока нет" text="Добавьте программу выше или отметьте статус прямо на карточке в каталоге." />
      )}

      {groups.map(([status, label]) => {
        const items = lists.applications.filter((item) => item.status === status);
        if (items.length === 0) return null;
        return (
          <section key={status}>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{label} · {items.length}</h3>
            <ul className="grid gap-2 md:grid-cols-2">
              {items.map((item) => (
                <li key={item.program_key} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <p className="font-medium">{item.program}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.university}</p>
                  {item.status === "submitted" && item.submitted_at && <p className="mt-1 text-xs text-muted-foreground">Отправлена {formatDateTime(item.submitted_at)}</p>}
                  <div className="mt-3">
                    <StatusSelect gender={gender} value={item.status} onChange={(next) => void lists.setApplicationStatus(item, next).then((ok) => { if (!ok) toast.error("Не удалось сохранить статус."); })} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ======================= Общие элементы =======================

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
      <h2 className="mb-4 font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function StatTile({ icon: Icon, label, value, hint, alert }: { icon: typeof Heart; label: string; value: string; hint: string; alert?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className="size-4 text-accent" /> {label}</p>
      <p className="mt-2 truncate font-display text-xl font-bold">{value}</p>
      <p className={`mt-0.5 truncate text-xs ${alert ? "font-medium text-destructive" : "text-muted-foreground"}`}>{hint}</p>
    </div>
  );
}

function UrgencyBadge({ urgency, due }: { urgency: TaskUrgency; due: string | null }) {
  const styles: Record<TaskUrgency, string> = {
    overdue: "bg-destructive/10 text-destructive",
    soon: "bg-secondary text-secondary-foreground",
    later: "bg-muted text-muted-foreground",
    none: "bg-muted text-muted-foreground",
    done: "bg-muted text-muted-foreground",
  };
  const prefix = urgency === "overdue" ? "Просрочено · " : "До ";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[urgency]}`}>
      <CalendarClock className="size-3" /> {due ? `${urgency === "done" ? "" : prefix}${formatDateTime(due)}` : "Без срока"}
    </span>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Heart; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <Icon className="mx-auto size-6 text-muted-foreground" />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-14 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Загружаем профиль…
    </div>
  );
}
