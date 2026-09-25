import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { translateAuthError } from "@/lib/authErrors";

// Сюда ведёт ссылка из письма «Восстановление пароля».
// Supabase сам разбирает токен из адреса и создаёт временную сессию,
// после чего пользователь задаёт новый пароль.
export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Новый пароль — Edvora" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) setState("ready");
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setState("ready");
    });
    // Если за несколько секунд сессия не появилась — ссылка устарела или уже использована.
    const timer = window.setTimeout(() => {
      if (active) setState((current) => (current === "checking" ? "invalid" : current));
    }, 4000);
    return () => {
      active = false;
      window.clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Пароль слишком короткий: минимум 6 символов.");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(translateAuthError(updateError, "Не удалось сменить пароль."));
      return;
    }
    toast.success("Пароль изменён");
    navigate({ to: "/", replace: true });
  };

  return (
    <main className="soft-grid relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card sm:p-9">
        <div className="mb-7 flex items-center justify-center gap-2 font-display text-xl font-bold text-primary">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          Edvora
        </div>

        {state === "checking" && (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Проверяем ссылку…
          </p>
        )}

        {state === "invalid" && (
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Ссылка не работает</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Возможно, она устарела или уже была использована. Запросите новое письмо для смены пароля.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/auth">Вернуться ко входу</Link>
            </Button>
          </div>
        )}

        {state === "ready" && (
          <>
            <h1 className="text-center font-display text-2xl font-bold">Новый пароль</h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">Придумайте новый пароль для входа в Edvora.</p>
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <label className="block text-sm font-medium">
                Новый пароль
                <Input className="mt-2" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Минимум 6 символов" autoComplete="new-password" required />
              </label>
              <label className="block text-sm font-medium">
                Повторите пароль
                <Input className="mt-2" type="password" minLength={6} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required />
              </label>
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                Сохранить пароль
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
