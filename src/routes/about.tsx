import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CircleGauge,
  GraduationCap,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import programsData from "@/data/programs.json";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { mailtoLink, siteContacts, telegramLink, telLink, whatsappLink } from "@/lib/siteContacts";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "О нас — Edvora" },
      {
        name: "description",
        content: "Edvora — платформа для подбора университетов Китая, Японии и Южной Кореи по реальным баллам, бюджету и целям абитуриента.",
      },
      { property: "og:title", content: "О нас — Edvora" },
      { property: "og:description", content: "Кто мы, что умеет Edvora и как с нами связаться." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AboutPage,
});

const countryCount = new Set(programsData.map((program) => program.country)).size;
const universityCount = new Set(programsData.map((program) => program.university)).size;

const features = [
  { icon: BookOpenCheck, title: "Каталог программ", text: `${universityCount} университетов ${countryCount} стран с требованиями, стоимостью, языками и рейтингом QS в одном месте.` },
  { icon: CircleGauge, title: "Подбор по профилю", text: "Вводите GPA, IELTS, TOEFL, экзамены и бюджет, и Edvora покажет, где у вас Safety, Match и Reach." },
  { icon: Scale, title: "Сравнение", text: "До трёх программ рядом в одной таблице: сразу видно, где выше рейтинг, ниже требования и дешевле учёба." },
  { icon: CalendarClock, title: "Дедлайны и задачи", text: "Личный календарь подготовки с напоминаниями на сайте и в календаре телефона." },
  { icon: Send, title: "Статусы заявок", text: "Отмечайте, куда заявка «в прогрессе», а куда вы уже подались, чтобы ничего не потерять." },
  { icon: UserRound, title: "Личный кабинет", text: "Профиль, избранные университеты и программы сохраняются и ждут вас при следующем входе." },
];

const steps = [
  ["Создайте аккаунт", "Регистрация по почте или через Google занимает минуту."],
  ["Заполните профиль", "Баллы, экзамены, бюджет и страны, которые вам интересны."],
  ["Получите подборку", "Смотрите шансы по каждой программе, сравнивайте и планируйте подачу в кабинете."],
] as const;

function AboutPage() {
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
          <nav className="flex items-center gap-2" aria-label="Навигация">
            <ThemeToggle />
            <Button size="sm" asChild>
              <Link to="/">Перейти в каталог <ArrowRight /></Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero-surface border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              <Sparkles className="size-3.5" /> О нас
            </span>
            <h1 className="fade-up mt-6 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">
              Поступление в университеты Азии без хаоса и догадок
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Edvora помогает абитуриентам найти университет в Китае, Японии или Южной Корее, который подходит
              по реальным баллам, бюджету и целям, и довести подачу документов до конца.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold">Зачем мы это делаем</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Требования зарубежных университетов разбросаны по десяткам сайтов, на разных языках и в разном формате.
              Абитуриенту приходится часами сверять GPA, языковые сертификаты, экзамены и стоимость, а потом ещё
              держать в голове дедлайны по каждой программе.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">Что мы предлагаем</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Edvora собирает требования в одну понятную базу, сравнивает их с вашим профилем и честно показывает шансы:
              где вы проходите с запасом, где на грани, а где стоит подтянуть баллы. Всё, что нужно для подачи,
              хранится в вашем личном кабинете.
            </p>
          </div>
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="font-display text-2xl font-bold">Что умеет Edvora</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, text }) => (
                <article key={title} className="card-elevate rounded-xl border border-border bg-card p-5 shadow-card">
                  <span className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold">Как это работает</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map(([title, text], index) => (
              <li key={title} className="rounded-xl border border-border bg-card p-5 shadow-card">
                <span className="grid size-9 place-items-center rounded-full bg-primary font-display font-bold text-primary-foreground">{index + 1}</span>
                <h3 className="mt-4 font-display text-base font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold">Наши принципы</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="flex gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
              <ShieldCheck className="mt-0.5 size-6 shrink-0 text-accent" />
              <div>
                <h3 className="font-display font-bold">Только проверенные данные</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Требования показываются только из нашей базы программ, без домыслов. Если данных нет, мы так и пишем,
                  а не угадываем. Перед подачей всегда сверяйтесь с официальным сайтом университета: ссылка есть в каждой карточке.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
              <Lock className="mt-0.5 size-6 shrink-0 text-accent" />
              <div>
                <h3 className="font-display font-bold">Ваши данные — только ваши</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Профиль, задачи, избранное и заявки видны только вам: доступ к ним защищён на уровне базы данных.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-10">
            <h2 className="font-display text-2xl font-bold">Свяжитесь с нами</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Есть вопрос о поступлении, нашли неточность в требованиях или хотите предложить идею? Напишите нам, мы отвечаем по всем вопросам.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <a href={mailtoLink}><Mail /> {siteContacts.email}</a>
              </Button>
              {siteContacts.call && (
                <Button variant="outline" asChild>
                  <a href={telLink}><Phone /> {siteContacts.phoneDisplay}</a>
                </Button>
              )}
              {siteContacts.whatsapp && (
                <Button variant="outline" asChild>
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a>
                </Button>
              )}
              {telegramLink && (
                <Button variant="outline" asChild>
                  <a href={telegramLink} target="_blank" rel="noopener noreferrer"><Send /> Telegram</a>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
