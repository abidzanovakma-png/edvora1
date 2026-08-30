import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarDays,
  ChevronDown,
  CircleGauge,
  GraduationCap,
  Languages,
  MapPin,
  Medal,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import programsData from "@/data/programs.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Program = (typeof programsData)[number];
type AppliedProfile = { values: string[]; noTest: Record<number, boolean> };

export const Route = createFileRoute("/")({
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
  ["Языковой экзамен (HSK/TOPIK/EJU)", "HSK", true],
  ["Балл языкового экзамена", "4", false],
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

function matchesLanguageExam(program: Program, examValue: string, scoreValue: string, skipped: boolean | undefined) {
  if (skipped || !examValue.trim()) return true;
  const requirement = program.languageExamRequirement.toLocaleLowerCase("ru");
  if (/не требуется|рекомендуется|альтернатив/.test(requirement)) return true;
  const exam = examValue.trim().toLocaleLowerCase("ru").split(/\s+/)[0] ?? "";
  if (!exam || !requirement.includes(exam)) return true;
  const required = numericValue(requirement.slice(requirement.indexOf(exam) + exam.length));
  return matchesMinimum(scoreValue, false, required);
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
  const [selected, setSelected] = useState<Program | null>(null);
  const [targetCountries, setTargetCountries] = useState<string[]>([...countries]);
  const [noTest, setNoTest] = useState<Record<number, boolean>>({});
  const [values, setValues] = useState<string[]>(Array(fields.length).fill(""));
  const [appliedCountries, setAppliedCountries] = useState<string[]>([...countries]);
  const [appliedProfile, setAppliedProfile] = useState<AppliedProfile | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ru");
    return programsData.filter((program) => {
      const matchesQuery =
        !needle ||
        [program.university, program.program, program.city].some((value) =>
          value.toLocaleLowerCase("ru").includes(needle),
        );
      const profileMatches = !appliedProfile || (
        matchesMinimum(appliedProfile.values[0] ?? "", appliedProfile.noTest[0], program.gpaMin) &&
        matchesMinimum(appliedProfile.values[1] ?? "", appliedProfile.noTest[1], program.ieltsMin) &&
        matchesMinimum(appliedProfile.values[2] ?? "", appliedProfile.noTest[2], program.toeflMin) &&
        matchesMinimum(appliedProfile.values[3] ?? "", appliedProfile.noTest[3], null) &&
        matchesLanguageExam(program, appliedProfile.values[4] ?? "", appliedProfile.values[5] ?? "", appliedProfile.noTest[4]) &&
        matchesSupplementaryExam(program, appliedProfile.values[6] ?? "") &&
        (numericValue(appliedProfile.values[7] ?? "") === null || program.costMin <= (numericValue(appliedProfile.values[7] ?? "") ?? 0))
      );
      return (
        matchesQuery &&
        appliedCountries.includes(program.country) &&
        profileMatches &&
        (country === "Все страны" || program.country === country) &&
        (level === "Все уровни" || program.level === level) &&
        (language === "Все языки" || program.language === language)
      );
    });
  }, [query, country, level, language, appliedCountries, appliedProfile]);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const resetProfile = () => {
    setValues(Array(fields.length).fill(""));
    setNoTest({});
    setTargetCountries([...countries]);
    setAppliedCountries([...countries]);
    setAppliedProfile(null);
    setCountry("Все страны");
  };

  const applyProfile = () => {
    setAppliedCountries(targetCountries);
    setAppliedProfile({ values: [...values], noTest: { ...noTest } });
    setCountry("Все страны");
    scrollTo("programs");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            Edvora
          </div>
          <nav className="flex items-center gap-2" aria-label="Основная навигация">
            <Button variant="ghost" onClick={() => scrollTo("programs")}>Программы</Button>
            <Button onClick={() => scrollTo("profile")}>Подобрать</Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero-surface text-primary-foreground">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:items-center md:py-20">
            <div className="fade-up">
              <span className="inline-flex rounded-full bg-primary-foreground px-3 py-1 text-xs font-semibold text-primary">
                34 программ · 3 страны
              </span>
              <h1 className="mt-6 max-w-2xl font-display text-4xl font-bold leading-tight md:text-5xl">
                Подбор университета по вашим реальным показателям
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-primary-foreground/80">
                Заполните профиль — Edvora сопоставит GPA, языковые тесты и бюджет с требованиями программ и покажет индекс совместимости, сильные стороны и точные дефициты.
              </p>
              <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button variant="secondary" size="lg" onClick={() => scrollTo("profile")}>
                  <Search /> Найти университеты
                </Button>
                <Button className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" variant="ghost" onClick={() => scrollTo("programs")}>Смотреть каталог</Button>
              </div>
              <p className="mt-5 flex max-w-xl items-center gap-2 text-xs text-primary-foreground/70">
                <ShieldCheck className="size-4 shrink-0" /> Все требования отображаются только из загруженной базы, без домыслов.
              </p>
            </div>
            <div className="grid gap-3">
              {countries.map((item) => (
                <div key={item} className="rounded-[18px] bg-primary-foreground/10 p-5 backdrop-blur-sm">
                  <p className="font-display text-lg font-bold">{item}</p>
                  <p className="mt-1 text-sm text-primary-foreground/70">
                    {programsData.filter((program) => program.country === item).length} программ в базе
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="profile" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <h2 className="mb-6 flex items-center gap-2 font-display text-2xl font-bold">
            <CircleGauge className="size-5 text-accent" /> Профиль абитуриента
          </h2>
          <div className="rounded-xl border border-border/70 bg-card p-6 shadow-card">
            <p className="mb-2 text-sm font-medium">Целевые страны</p>
            <div className="mb-6 flex flex-wrap gap-2">
              {countries.map((item) => {
                const active = targetCountries.includes(item);
                return <Button key={item} size="sm" variant={active ? "secondary" : "outline"} aria-pressed={active} onClick={() => setTargetCountries((current) => active ? current.filter((value) => value !== item) : [...current, item])}>{item}</Button>;
              })}
            </div>
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              {fields.map(([label, placeholder, togglable], index) => (
                <label key={label} className="block min-w-0 text-sm font-medium">
                  <span className="mb-2 flex min-h-8 items-start justify-between gap-2 leading-tight">
                    {label}
                    {togglable && <Button type="button" size="sm" variant={noTest[index] ? "secondary" : "outline"} className="h-6 shrink-0 rounded-full px-2 text-[10px] font-normal" aria-pressed={Boolean(noTest[index])} onClick={() => setNoTest((current) => ({ ...current, [index]: !current[index] }))}>нет теста</Button>}
                  </span>
                  <Input value={values[index] ?? ""} disabled={noTest[index]} placeholder={placeholder} onChange={(event) => setValues((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} />
                </label>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button onClick={applyProfile}>Подобрать программы</Button>
              <Button variant="outline" onClick={resetProfile}>Сбросить</Button>
            </div>
          </div>
        </section>

        <section id="programs" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><h2 className="font-display text-2xl font-bold">Каталог программ</h2><p className="mt-1 text-sm text-muted-foreground">Найдено: {filtered.length}</p></div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><SlidersHorizontal className="size-4" /> Фильтры и сортировка</p>
          </div>
          <div className="mb-6 grid gap-3 rounded-xl border border-border/70 bg-card p-4 md:grid-cols-4">
            <label className="relative md:col-span-2"><span className="sr-only">Поиск</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по университету, программе, городу" /></label>
            <FilterSelect value={level} onChange={setLevel} options={["Все уровни", ...new Set(programsData.map((program) => program.level))]} label="Уровень" />
            <FilterSelect value={language} onChange={setLanguage} options={["Все языки", ...new Set(programsData.map((program) => program.language))]} label="Язык" />
            <FilterSelect value={country} onChange={setCountry} options={["Все страны", ...countries]} label="Страна" />
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((program, index) => <ProgramCard key={`${program.university}-${program.program}-${index}`} program={program} onOpen={() => setSelected(program)} />)}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 py-8 text-center text-sm text-muted-foreground">Edvora · данные отображаются исключительно из загруженной таблицы программ.</footer>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && <DialogContent className="max-h-[86vh] max-w-3xl overflow-y-auto bg-background p-6 sm:rounded-xl">
          <DialogHeader className="border-b pb-5 pr-8">
            <DialogTitle className="font-display text-xl">{selected.university}</DialogTitle>
            <DialogDescription>{selected.program}</DialogDescription>
          </DialogHeader>
          <div><p className="mb-3 text-xs font-bold uppercase">Данные из базы</p>{Object.entries(selected.details).map(([key, value]) => <div key={key} className="border-b border-border/70 py-2.5"><dt className="text-[10px] font-medium uppercase text-muted-foreground">{key}</dt><dd className="mt-1 text-sm leading-relaxed">{value}</dd></div>)}</div>
        </DialogContent>}
      </Dialog>
    </div>
  );
}

function FilterSelect({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: string[]; label: string }) {
  return <label className="relative"><span className="sr-only">{label}</span><select className="h-9 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /></label>;
}

function ProgramCard({ program, onOpen }: { program: Program; onOpen: () => void }) {
  const rows = [
    [GraduationCap, "Уровень", program.level], [Languages, "Язык", program.language],
    [CircleGauge, "GPA", program.gpa], [null, "IELTS", program.ielts], [null, "TOEFL", program.toefl],
    [BadgeDollarSign, "Стоимость", program.cost],
  ] as const;
  return <article className="card-elevate fade-up flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-card">
    <div className="border-b border-border/70 bg-muted/35 p-5"><span className="inline-flex rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-secondary-foreground">{program.country}</span><h3 className="mt-3 font-display text-base font-bold">{program.university}</h3><p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><span className="flex items-center gap-1"><MapPin className="size-3" />{program.city}</span><span>·</span><span className="flex items-center gap-1"><Medal className="size-3" />QS {program.rank}</span></p></div>
    <div className="flex flex-1 flex-col gap-4 p-5"><p className="line-clamp-3 min-h-[3.75rem] text-sm text-muted-foreground">{program.program}</p><dl className="space-y-2.5 text-xs">{rows.map(([Icon, label, value]) => <div key={label} className="flex items-start gap-2">{Icon ? <Icon className="mt-0.5 size-3.5 shrink-0 text-accent" /> : <span className="w-3.5 shrink-0" />}<dt className="shrink-0 text-muted-foreground">{label}:</dt><dd className="line-clamp-2 font-medium">{value}</dd></div>)}</dl><div className="mt-auto pt-2"><Button className="w-full" variant="secondary" onClick={onOpen}>Подробнее</Button></div></div>
  </article>;
}
