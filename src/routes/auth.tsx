import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Loader2, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const countries = ["Китай", "Южная Корея", "Япония"] as const;

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Регистрация и вход — Edvora" },
      {
        name: "description",
        content:
          "Создайте аккаунт Edvora, чтобы получить доступ к каталогу университетов Китая, Японии и Южной Кореи и сохранить свой профиль.",
      },
      { property: "og:title", content: "Регистрация и вход — Edvora" },
      {
        property: "og:description",
        content: "Аккаунт Edvora сохраняет ваш профиль абитуриента и страны интереса.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [targets, setTargets] = useState<string[]>([...countries]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate({ to: "/", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name, target_countries: targets },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage("Мы отправили письмо для подтверждения. Откройте ссылку из письма, чтобы войти.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить вход");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setError(null);
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Вход через Google не удался. Попробуйте ещё раз.");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="hero-surface hidden flex-col justify-between p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid size-9 place-items-center rounded-full bg-primary-foreground text-primary">
            <GraduationCap className="size-5" />
          </span>
          Edvora
        </div>
        <div>
          <h1 className="max-w-md font-display text-4xl font-bold leading-tight">
            Аккаунт открывает доступ к каталогу университетов
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-primary-foreground/80">
            Профиль сохраняется: в следующий раз ваши показатели, страны интереса и подобранные программы будут на месте.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-primary-foreground/80">
            {["30 университетов Китая, Японии и Южной Кореи", "Требования каждой страны в подробностях карточки", "Оценка Safety / Match / Reach по вашему профилю"].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">Edvora · данные только из загруженной базы программ.</p>
      </section>

      <section className="flex items-center justify-center bg-background px-4 py-14">
        <div className="w-full max-w-md rounded-xl border border-border/70 bg-card p-7 shadow-card">
          <div className="mb-6 flex items-center gap-2 font-display text-lg font-bold lg:hidden">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            Edvora
          </div>
          <h2 className="font-display text-2xl font-bold">
            {mode === "signup" ? "Создайте аккаунт" : "Вход в аккаунт"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Регистрация обязательна для доступа к каталогу программ."
              : "Введите почту и пароль, указанные при регистрации."}
          </p>

          <Button variant="outline" className="mt-6 w-full" onClick={google} disabled={loading}>
            Продолжить с Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> или по почте <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={submit}>
            {mode === "signup" && (
              <label className="block text-sm font-medium">
                Имя и фамилия
                <Input className="mt-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="Акмаль Абиджанов" required />
              </label>
            )}
            <label className="block text-sm font-medium">
              Электронная почта
              <Input className="mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            </label>
            <label className="block text-sm font-medium">
              Пароль
              <Input className="mt-2" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Минимум 6 символов" required />
            </label>

            {mode === "signup" && (
              <div>
                <p className="text-sm font-medium">Страны интереса</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {countries.map((item) => {
                    const active = targets.includes(item);
                    return (
                      <Button
                        key={item}
                        type="button"
                        size="sm"
                        variant={active ? "secondary" : "outline"}
                        aria-pressed={active}
                        onClick={() =>
                          setTargets((current) =>
                            active ? current.filter((value) => value !== item) : [...current, item],
                          )
                        }
                      >
                        {item}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            {message && (
              <p className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/40 p-3 text-sm text-muted-foreground">
                <Mail className="mt-0.5 size-4 shrink-0" /> {message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "signup" ? "Зарегистрироваться" : "Войти"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Уже есть аккаунт?" : "Ещё нет аккаунта?"}{" "}
            <button
              type="button"
              className="font-medium text-accent hover:underline"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError(null);
                setMessage(null);
              }}
            >
              {mode === "signup" ? "Войти" : "Создать аккаунт"}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
