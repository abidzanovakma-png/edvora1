import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/session";
import { ReminderToasts } from "@/components/ReminderToasts";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Сессия берётся из браузера без запроса к серверу — переходы между
    // страницами больше не ждут сеть. Сервер всё равно проверяет токен
    // при каждом запросе к базе.
    const user = await getCurrentUser();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => (
    <>
      <ReminderToasts />
      <Outlet />
    </>
  ),
});
