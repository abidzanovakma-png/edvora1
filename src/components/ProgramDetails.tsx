import {
  BadgeCheck,
  BookOpen,
  CalendarClock,
  CircleHelp,
  FileText,
  GraduationCap,
  Landmark,
  Languages,
  ListChecks,
  MapPin,
  Medal,
  Route as RouteIcon,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { guides, type Guide } from "@/data/countryGuides";

type Details = Record<string, string>;

export type DetailProgram = {
  university: string;
  program: string;
  country: string;
  city: string;
  rank: string | number;
  cost: string;
  gpa: string;
  ielts: string;
  toefl: string;
  levels: string[];
  languages: string[];
  majors: string[];
  website: string;
  details: Details;
};

const countryTheme: Record<string, string> = {
  Китай: "from-[#8f1d2b] via-[#b4232f] to-[#e0733a]",
  Япония: "from-[#1f2a55] via-[#3b3f7a] to-[#c2405a]",
  "Южная Корея": "from-[#123a63] via-[#1f5f8b] to-[#3fa1a8]",
};

function SectionTitle({ icon: Icon, children }: { icon: typeof BookOpen; children: React.ReactNode }) {
  return (
    <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide">
      <Icon className="size-4 text-accent" /> {children}
    </h4>
  );
}

function Rows({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-accent/60"
        >
          <dt className="text-[10px] font-bold uppercase tracking-wide text-accent">{item.label}</dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgramDetails({ program }: { program: DetailProgram }) {
  const guide: Guide | undefined = guides[program.country];
  const gradient = countryTheme[program.country] ?? "from-primary via-primary to-accent";

  const stats = [
    { icon: Medal, label: "QS", value: String(program.rank) },
    { icon: Wallet, label: "Стоимость", value: program.cost },
    { icon: BadgeCheck, label: "GPA", value: program.gpa },
    { icon: Languages, label: "IELTS", value: program.ielts },
    { icon: Languages, label: "TOEFL", value: program.toefl },
  ];

  return (
    <div className="-m-6">
      <div className={`bg-gradient-to-br ${gradient} px-6 pb-6 pt-7 text-primary-foreground`}>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 backdrop-blur-sm">
            {program.country}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2.5 py-1 backdrop-blur-sm">
            <MapPin className="size-3" /> {program.city}
          </span>
          {guide && (
            <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 backdrop-blur-sm">{guide.local}</span>
          )}
        </div>
        <h3 className="mt-4 font-display text-2xl font-bold leading-tight">{program.university}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-foreground/80">{program.program}</p>
        {guide && (
          <p className="mt-3 flex items-start gap-2 text-xs text-primary-foreground/75">
            <Sparkles className="mt-0.5 size-3.5 shrink-0" /> {guide.tagline}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-primary-foreground/10 p-3 backdrop-blur-sm">
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-primary-foreground/70">
                <stat.icon className="size-3" /> {stat.label}
              </p>
              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-snug">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-6">
        <Tabs defaultValue="university">
          <TabsList className="mb-5 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
            <TabsTrigger value="university" className="text-xs">Университет</TabsTrigger>
            <TabsTrigger value="requirements" className="text-xs">Требования</TabsTrigger>
            <TabsTrigger value="majors" className="text-xs">Язык и специальности</TabsTrigger>
            <TabsTrigger value="money" className="text-xs">Стипендии</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs">Документы</TabsTrigger>
            <TabsTrigger value="process" className="text-xs">Процесс и сроки</TabsTrigger>
            <TabsTrigger value="faq" className="text-xs">Вопросы</TabsTrigger>
          </TabsList>

          <TabsContent value="university" className="space-y-5">
            <div>
              <SectionTitle icon={GraduationCap}>Данные университета</SectionTitle>
              <Rows items={Object.entries(program.details).map(([label, value]) => ({ label, value }))} />
            </div>
            {guide && (
              <div>
                <SectionTitle icon={Landmark}>Как устроено поступление — {guide.country}</SectionTitle>
                <Rows items={guide.overview} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="requirements" className="space-y-5">
            {guide ? (
              <>
                <div>
                  <SectionTitle icon={ListChecks}>Требования — {guide.country}</SectionTitle>
                  <Rows items={guide.requirements} />
                </div>
                <div>
                  <SectionTitle icon={ListChecks}>Чек-лист абитуриента</SectionTitle>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {guide.checklist.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/25 p-3 text-sm leading-relaxed"
                      >
                        <BadgeCheck className="mt-0.5 size-4 shrink-0 text-accent" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Требования по этой стране отсутствуют в загруженном файле.</p>
            )}
          </TabsContent>

          <TabsContent value="majors" className="space-y-5">
            <div>
              <SectionTitle icon={Languages}>Языки обучения этого университета</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {program.languages.map((item) => (
                  <span key={item} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {program.majors.map((item) => (
                  <span key={item} className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {program.levels.map((item) => (
                  <span key={item} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            {guide && (
              <>
                <div>
                  <SectionTitle icon={Languages}>Языковые треки — {guide.country}</SectionTitle>
                  <Rows items={guide.tracks.map((track) => ({ label: track.name, value: track.value }))} />
                </div>
                <div>
                  <SectionTitle icon={BookOpen}>Специальности и что проверять</SectionTitle>
                  <div className="overflow-x-auto rounded-xl border border-border/70">
                    <table className="w-full min-w-[560px] text-left text-xs">
                      <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Специальность</th>
                          <th className="px-3 py-2">На местном языке</th>
                          <th className="px-3 py-2">На английском</th>
                          <th className="px-3 py-2">Что проверять</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guide.majors.map((item) => (
                          <tr key={item.name} className="border-t border-border/60 align-top">
                            <td className="px-3 py-2.5 font-semibold">{item.name}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{item.local}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{item.english}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{item.check}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {guide.majorsNote && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{guide.majorsNote}</p>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="money" className="space-y-5">
            {guide && (
              <>
                <div>
                  <SectionTitle icon={Wallet}>Стипендии — {guide.country}</SectionTitle>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {guide.scholarships.map((item) => (
                      <div key={item.name} className="rounded-xl border border-border/70 bg-card p-4">
                        <p className="font-display text-sm font-bold leading-snug">{item.name}</p>
                        <span className="mt-2 inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                          {item.tag}
                        </span>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.value}</p>
                        {item.note && <p className="mt-1.5 text-xs italic text-muted-foreground/80">{item.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <SectionTitle icon={BadgeCheck}>Что покрывает грант</SectionTitle>
                  <ul className="space-y-2">
                    {guide.covers.map((item) => (
                      <li key={item} className="flex items-start gap-2 rounded-lg bg-muted/30 p-3 text-sm leading-relaxed">
                        <BadgeCheck className="mt-0.5 size-4 shrink-0 text-accent" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="documents">
            {guide && (
              <div>
                <SectionTitle icon={FileText}>Документы — {guide.country}</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                  {guide.documents.map((item) => (
                    <div key={item.doc} className="rounded-xl border border-border/70 bg-card p-4">
                      <p className="text-sm font-bold">{item.doc}</p>
                      <p className="mt-1 text-xs font-semibold uppercase text-accent">{item.need}</p>
                      {item.note && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="process" className="space-y-5">
            {guide && (
              <>
                <div>
                  <SectionTitle icon={RouteIcon}>Пошаговый процесс</SectionTitle>
                  <ol className="relative space-y-3 border-l border-border pl-5">
                    {guide.steps.map((item, index) => (
                      <li key={item.step} className="relative">
                        <span className="absolute -left-[27px] grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                          {index + 1}
                        </span>
                        <p className="text-sm font-bold">{item.step}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.action}</p>
                        <p className="mt-1 text-xs leading-relaxed text-accent">{item.result}</p>
                        {item.when && <p className="mt-0.5 text-xs text-muted-foreground/80">{item.when}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <SectionTitle icon={CalendarClock}>Ориентировочные сроки</SectionTitle>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {guide.timeline.map((item) => (
                      <div key={item.period} className="rounded-xl border border-border/70 bg-muted/25 p-3">
                        <p className="text-xs font-bold uppercase text-accent">{item.period}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="faq" className="space-y-5">
            {guide && (
              <>
                <div>
                  <SectionTitle icon={CircleHelp}>Частые вопросы</SectionTitle>
                  <div className="space-y-2">
                    {guide.faq.map((item) => (
                      <details
                        key={item.q}
                        className="group rounded-xl border border-border/70 bg-card p-4 open:border-accent/60"
                      >
                        <summary className="cursor-pointer list-none text-sm font-semibold">{item.q}</summary>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                      </details>
                    ))}
                  </div>
                </div>
                <div>
                  <SectionTitle icon={FileText}>Важные примечания</SectionTitle>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                    {guide.notes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <SectionTitle icon={Landmark}>Источники</SectionTitle>
                  <ul className="space-y-1.5 text-sm">
                    {guide.sources.map((item) => (
                      <li key={item.url}>
                        <a
                          className="text-accent hover:underline"
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
