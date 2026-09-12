import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Heart, LogOut, Sparkles } from "lucide-react";
import {
  BadgeDollarSign,
  BookOpen,

  ChevronDown,
  CircleGauge,
  ExternalLink,
  Globe,
  GraduationCap,
  Languages,
  MapPin,
  Medal,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import programsData from "@/data/programs.json";
import { assess, statusLabels, type Assessment } from "@/lib/assessment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProgramDetails } from "@/components/ProgramDetails";

type Program = (typeof programsData)[number];
type Docs = { motivation: boolean; recommendations: boolean; portfolio: boolean };
type AppliedProfile = { values: string[]; noTest: Record<number, boolean>; docs: Docs };


export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Edvora — подбор университетов по вашему профилю" },
      {
        name: "description",
        content:
          "Edvora сопоставляет GPA, IELTS, TOEFL и бюджет с базой программ университетов Китая, Японии и Южной Кореи.",
      },
      { property: "og:title", content: "Edvora — подбор университетов по вашему профилю" },
      {
        property: "og:description",
        content: "Подбор университетов Китая, Японии и Южной Кореи по вашим реальным показателям.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const countries = ["Китай", "Южная Корея", "Япония"] as const;
const fields = [
  ["GPA (по шкале 4.0)", "3.6", true],
  ["IELTS Academic", "6.5", true],
  ["TOEFL iBT", "92", true],
  ["SAT / ACT", "1350", true],
  ["Языковой экзамен (HSK/TOPIK/EJU)", "HSK 4", true],
  ["Доп. экзамены (IB, A-Level, ЕГЭ)", "IB 36", false],
  ["Бюджет, USD / год", "8000", false],

] as const;

function numericValue(value: string) {
  const parsed = Number.parseFloat(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesMinimum(value: string, skipped: boolean | undefined, minimum: number | null) {
  const entered = numericValue(value);
  return skipped || entered === null || minimum === null || entered >= minimum;
}

function matchesLanguageExam(program: Program, examValue: string, skipped: boolean | undefined) {
  if (skipped || !examValue.trim()) return true;
  const requirement = program.languageExamRequirement.toLocaleLowerCase("ru");
  if (/не требуется|рекомендуется|альтернатив/.test(requirement)) return true;
  const input = examValue.trim().toLocaleLowerCase("ru");
  const exam = input.split(/[\s\d]+/)[0] ?? "";
  if (!exam || !requirement.includes(exam)) return true;
  const required = numericValue(requirement.slice(requirement.indexOf(exam) + exam.length));
  const scored = input.slice(exam.length);
  return matchesMinimum(scored, false, required);
}


function matchesSupplementaryExam(program: Program, value: string) {
  const exam = value.trim().toLocaleLowerCase("ru").split(/[\s\d]+/)[0] ?? "";
  if (!exam) return true;
  const requirements = program.standardizedTests.toLocaleLowerCase("ru");
  return !requirements || requirements.includes(exam) || !/обязател/.test(requirements);
}

function Index() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("Все страны");
  const [level, setLevel] = useState("Все уровни");
  const [language, setLanguage] = useState("Все языки");
  const [major, setMajor] = useState("Все специальности");
  const [selected, setSelected] = useState<Program | null>(null);
  const [targetCountries, setTargetCountries] = useState<string[]>([...countries]);
  const [noTest, setNoTest] = useState<Record<number, boolean>>({});
  const [values, setValues] = useState<string[]>(Array(fields.length).fill(""));
  const [docs, setDocs] = useState<Docs>({ motivation: false, recommendations: false, portfolio: false });
  const [appliedCountries, setAppliedCountries] = useState<string[]>([...countries]);
  const [appliedProfile, setAppliedProfile] = useState<AppliedProfile | null>(null);
  const [accountName, setAccountName] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || !active) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, target_countries")
        .eq("id", user.id)
        .maybeSingle();
      const { data: savedFavorites } = await supabase
        .from("favorite_universities")
        .select("university")
        .eq("user_id", user.id);
      if (!active) return;
      const metaName =
        (user.user_metadata?.["full_name"] as string | undefined) ??
        (user.user_metadata?.["name"] as string | undefined);
      setAccountName(profile?.full_name ?? metaName ?? user.email ?? "");
      setFavorites(savedFavorites?.map((item) => item.university) ?? []);
      const saved = profile?.target_countries ?? [];
      if (saved.length > 0) {
        setTargetCountries(saved);
        setAppliedCountries(saved);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const toggleFavorite = async (university: string) => {
    const wasFavorite = favorites.includes(university);
    setFavorites((current) => wasFavorite ? current.filter((item) => item !== university) : [...current, university]);
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const result = wasFavorite
      ? await supabase.from("favorite_universities").delete().eq("user_id", data.user.id).eq("university", university)
      : await supabase.from("favorite_universities").insert({ user_id: data.user.id, university });
    if (result.error) {
      setFavorites((current) => wasFavorite ? [...current, university] : current.filter((item) => item !== university));
    }
  };


  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ru");
    const list = programsData.filter((program) => {
      const matchesQuery =
        !needle ||
        [program.university, program.program, program.city].some((value) =>
          value.toLocaleLowerCase("ru").includes(needle),
        );
      const matchesFavorite = !favoritesOnly || favorites.includes(program.university);
      const profileMatches = !appliedProfile || (
        matchesMinimum(appliedProfile.values[0] ?? "", appliedProfile.noTest[0], program.gpaMin) &&
        matchesMinimum(appliedProfile.values[1] ?? "", appliedProfile.noTest[1], program.ieltsMin) &&
        matchesMinimum(appliedProfile.values[2] ?? "", appliedProfile.noTest[2], program.toeflMin) &&
        matchesMinimum(appliedProfile.values[3] ?? "", appliedProfile.noTest[3], null) &&
        matchesLanguageExam(program, appliedProfile.values[4] ?? "", appliedProfile.noTest[4]) &&
        matchesSupplementaryExam(program, appliedProfile.values[5] ?? "") &&
        (numericValue(appliedProfile.values[6] ?? "") === null || program.costMin <= (numericValue(appliedProfile.values[6] ?? "") ?? 0))
      );
      return (
        matchesQuery &&
        matchesFavorite &&
        appliedCountries.includes(program.country) &&
        profileMatches &&
        (country === "Все страны" || program.country === country) &&
        (level === "Все уровни" || program.levels.includes(level)) &&
        (language === "Все языки" || program.languages.includes(language)) &&
        (major === "Все специальности" || program.majors.includes(major))
      );
    });

    const scored = list.map((program) => ({
      program,
      assessment: appliedProfile
        ? assess(program, {
            gpa: appliedProfile.noTest[0] ? "" : appliedProfile.values[0] ?? "",
            ielts: appliedProfile.noTest[1] ? "" : appliedProfile.values[1] ?? "",
            toefl: appliedProfile.noTest[2] ? "" : appliedProfile.values[2] ?? "",
            sat: appliedProfile.noTest[3] ? "" : appliedProfile.values[3] ?? "",
            ...appliedProfile.docs,
          })
        : null,
    }));

    const order = { Safety: 0, Match: 1, Reach: 2 } as const;
    return scored.sort((a, b) =>
      a.assessment && b.assessment ? order[a.assessment.category] - order[b.assessment.category] : 0,
    );
  }, [query, country, level, language, major, appliedCountries, appliedProfile, favorites, favoritesOnly]);


  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const resetProfile = () => {
    setValues(Array(fields.length).fill(""));
    setNoTest({});
    setDocs({ motivation: false, recommendations: false, portfolio: false });
    setTargetCountries([...countries]);
    setAppliedCountries([...countries]);
    setAppliedProfile(null);
    setCountry("Все страны");
    setLanguage("Все языки");
    setMajor("Все специальности");

  };

  const applyProfile = () => {
    setAppliedCountries(targetCountries);
    setAppliedProfile({ values: [...values], noTest: { ...noTest }, docs: { ...docs } });
    setCountry("Все страны");
    scrollTo("programs");
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      await supabase
        .from("profiles")
        .upsert({ id: data.user.id, target_countries: targetCountries }, { onConflict: "id" });
    })();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="nav-shell mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl border border-border/80 bg-card/90 px-3 shadow-card backdrop-blur-xl sm:px-5">
          <div className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <span className="brand-mark grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-card">
              <GraduationCap className="size-5" />
            </span>
            Edvora
          </div>
          <nav className="flex items-center gap-1.5" aria-label="Основная навигация">
            <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => scrollTo("programs")}>Программы</Button>
            <Button variant={favoritesOnly ? "secondary" : "ghost"} size="sm" className="rounded-xl" onClick={() => { setFavoritesOnly((current) => !current); scrollTo("programs"); }} aria-pressed={favoritesOnly}>
              <Heart className={favoritesOnly ? "fill-current" : ""} /> <span className="hidden sm:inline">Избранное</span><span>{favorites.length}</span>
            </Button>
            <Button className="rounded-xl shadow-card" onClick={() => scrollTo("profile")}><Sparkles /> Подобрать</Button>
            {accountName && <span className="hidden max-w-[160px] truncate text-sm font-medium text-muted-foreground md:inline">{accountName}</span>}
            <Button variant="outline" size="sm" onClick={signOut} aria-label="Выйти из аккаунта"><LogOut className="size-4" /><span className="hidden sm:inline">Выйти</span></Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero-surface relative -mt-[76px] overflow-hidden border-b border-border pt-[76px]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.35fr_1fr] md:items-center md:py-16">
            <div className="fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/75 px-3 py-1.5 text-xs font-semibold text-primary shadow-card backdrop-blur">
                <Sparkles className="size-3.5 text-accent" />
                {programsData.length} университетов · 3 страны
              </span>
              <h1 className="mt-6 max-w-2xl font-display text-4xl font-bold leading-tight md:text-5xl">
                Подбор университета по вашим реальным показателям
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                Заполните профиль — Edvora сопоставит GPA, языковые тесты и бюджет с требованиями программ и покажет индекс совместимости, сильные стороны и точные дефициты.
              </p>
              <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button size="lg" className="rounded-xl shadow-card" onClick={() => scrollTo("profile")}>
                  <Search /> Найти университеты <ArrowRight />
                </Button>
                <Button variant="ghost" onClick={() => scrollTo("programs")}>Смотреть каталог</Button>
              </div>
              <p className="mt-5 flex max-w-xl items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 shrink-0" /> Все требования отображаются только из загруженной базы, без домыслов.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
              {countries.map((item, index) => (
                <div key={item} className="country-tile group relative overflow-hidden rounded-2xl border border-border/80 bg-card/85 p-5 shadow-card backdrop-blur">
                  <span className="absolute right-4 top-3 font-display text-4xl font-bold text-primary/10">0{index + 1}</span>
                  <div className="mb-4 grid size-9 place-items-center rounded-xl bg-secondary text-primary"><Globe className="size-4" /></div>
                  <p className="font-display text-lg font-bold">{item}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {programsData.filter((program) => program.country === item).length} программ в базе
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="profile" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6">
          <h2 className="mb-6 flex items-center gap-2 font-display text-2xl font-bold">
            <CircleGauge className="size-5 text-accent" /> Профиль абитуриента
          </h2>
          <div className="profile-panel rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7">
            <p className="mb-2 text-sm font-medium">Целевые страны</p>
            <div className="mb-6 flex flex-wrap gap-2">
              {countries.map((item) => {
                const active = targetCountries.includes(item);
                return <Button key={item} size="sm" variant={active ? "secondary" : "outline"} aria-pressed={active} onClick={() => setTargetCountries((current) => active ? current.filter((value) => value !== item) : [...current, item])}>{item}</Button>;
              })}
            </div>
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              {fields.map(([label, placeholder, togglable], index) => (
                <label key={label} className="profile-field block min-w-0 rounded-xl border border-border/70 bg-muted/35 p-3 text-sm font-medium transition-colors focus-within:border-primary/50 focus-within:bg-card focus-within:shadow-card">
                  <span className="mb-2 flex min-h-8 items-start justify-between gap-2 leading-tight">
                    {label}
                    {togglable && <Button type="button" size="sm" variant={noTest[index] ? "secondary" : "outline"} className="h-6 shrink-0 rounded-full px-2 text-[10px] font-normal" aria-pressed={Boolean(noTest[index])} onClick={() => setNoTest((current) => ({ ...current, [index]: !current[index] }))}>нет теста</Button>}
                  </span>
                  <Input className="border-0 bg-card shadow-none focus-visible:ring-1" value={values[index] ?? ""} disabled={noTest[index]} placeholder={placeholder} onChange={(event) => setValues((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} />
                </label>
              ))}
            </div>
            <p className="mt-7 text-sm font-medium">Документы, готовые к подаче</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {([["motivation", "Мотивационное письмо"], ["recommendations", "Рекомендательные письма"], ["portfolio", "Портфолио"]] as const).map(([key, label]) => (
                <Button key={key} size="sm" variant={docs[key] ? "secondary" : "outline"} aria-pressed={docs[key]} onClick={() => setDocs((current) => ({ ...current, [key]: !current[key] }))}>{label}</Button>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button onClick={applyProfile}>Подобрать программы</Button>
              <Button variant="outline" onClick={resetProfile}>Сбросить</Button>
            </div>

          </div>
        </section>

        <section id="programs" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-20 sm:px-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><h2 className="font-display text-2xl font-bold">{favoritesOnly ? "Избранные университеты" : "Каталог программ"}</h2><p className="mt-1 text-sm text-muted-foreground">Найдено: {filtered.length}</p></div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><SlidersHorizontal className="size-4" /> Фильтры и сортировка</p>
          </div>
          <div className="mb-6 grid gap-3 rounded-xl border border-border/70 bg-card p-4 md:grid-cols-4">
            <label className="relative md:col-span-2"><span className="sr-only">Поиск</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по университету, программе, городу" /></label>
            <FilterSelect value={level} onChange={setLevel} options={["Все уровни", "Бакалавриат", "Магистратура", "Аспирантура"]} label="Уровень" />
            <FilterSelect value={language} onChange={setLanguage} options={["Все языки", "Английский", "Китайский", "Японский", "Корейский"]} label="Язык обучения" />
            <FilterSelect value={country} onChange={setCountry} options={["Все страны", ...countries]} label="Страна" />
            <FilterSelect value={major} onChange={setMajor} options={["Все специальности", ...[...new Set(programsData.flatMap((program) => program.majors))].sort((a, b) => a.localeCompare(b, "ru"))]} label="Специальность" />

          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(({ program, assessment }, index) => <ProgramCard key={`${program.university}-${program.program}-${index}`} program={program} assessment={assessment} onOpen={() => setSelected(program)} favorite={favorites.includes(program.university)} onFavorite={() => void toggleFavorite(program.university)} />)}
          </div>
          {filtered.length === 0 && <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center"><Heart className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 font-medium">{favoritesOnly ? "В избранном пока нет университетов" : "По выбранным параметрам ничего не найдено"}</p></div>}
        </section>
      </main>

      <footer className="border-t border-border/70 py-8 text-center text-sm text-muted-foreground">Edvora · данные отображаются исключительно из загруженной таблицы программ.</footer>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto bg-background p-6 sm:rounded-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{selected.university}</DialogTitle>
            <DialogDescription>{selected.program}</DialogDescription>
          </DialogHeader>
          <ProgramDetails program={selected} />
        </DialogContent>}
      </Dialog>
    </div>
  );
}

function FilterSelect({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: string[]; label: string }) {
  return <label className="relative"><span className="sr-only">{label}</span><select className="h-9 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /></label>;
}

const categoryStyles = {
  Safety: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Match: "bg-primary/10 text-primary border-primary/20",
  Reach: "bg-muted text-muted-foreground border-border",
} as const;

function ProgramCard({ program, assessment, onOpen, favorite, onFavorite }: { program: Program; assessment: Assessment | null; onOpen: () => void; favorite: boolean; onFavorite: () => void }) {
  return (
    <article className="fade-up flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <MapPin className="size-3" /> {program.country}
            </span>
            {assessment && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${categoryStyles[assessment.category]}`}>
                {assessment.category}
              </span>
            )}
          </div>
          <h3 className="mt-2 font-display text-lg font-bold leading-snug">{program.university}</h3>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{program.city}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Medal className="size-3" /> QS {program.rank}</span>
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 rounded-full" onClick={onFavorite} aria-label={favorite ? `Удалить ${program.university} из избранного` : `Добавить ${program.university} в избранное`} aria-pressed={favorite}>
          <Heart className={favorite ? "fill-primary text-primary" : "text-muted-foreground"} />
        </Button>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{program.program}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
          <GraduationCap className="size-3.5" /> {program.levels.join(", ")}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
          <Languages className="size-3.5" /> {program.languages.join(", ")}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
          <BookOpen className="size-3.5" /> {program.majors.join(", ")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-xs">
        <div>
          <p className="text-[10px] text-muted-foreground">GPA</p>
          <p className="font-semibold">{program.gpa}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">IELTS</p>
          <p className="font-semibold">{program.ielts}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Стоимость</p>
          <p className="font-semibold">{program.cost}</p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-5">
        <a href={program.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
          <Globe className="size-3.5 shrink-0" /> Официальный сайт <ExternalLink className="size-3" />
        </a>
        <Button className="w-full rounded-xl" onClick={onOpen}>Подробнее <ArrowRight className="size-4" /></Button>
      </div>
    </article>
  );
}
