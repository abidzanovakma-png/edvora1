import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, formatDateTime, taskUrgency, tasksNeedingReminder, type TaskRow } from "@/lib/userData";

const SHOWN_KEY = "edvora:reminders-shown";

/**
 * Напоминания внутри сайта: при входе показывает всплывающие уведомления
 * о просроченных задачах, задачах с дедлайном в ближайшие 3 дня и задачах,
 * у которых наступило время напоминания. Один раз за сессию браузера.
 */
export function ReminderToasts() {
  const navigate = useNavigate();

  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(SHOWN_KEY) === "1";
    } catch {
      alreadyShown = false;
    }
    if (alreadyShown) return;

    let active = true;
    void (async () => {
      const userId = await currentUserId();
      if (!userId) return;
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, notes, due_at, remind_at, program_key, done, completed_at, created_at")
        .eq("user_id", userId)
        .eq("done", false);
      if (!active || error || !data) return;
      const due = tasksNeedingReminder(data as TaskRow[]);
      try {
        sessionStorage.setItem(SHOWN_KEY, "1");
      } catch {
        // sessionStorage недоступен — просто покажем напоминания ещё раз в следующий раз
      }
      due.slice(0, 3).forEach((task) => {
        const urgency = taskUrgency(task);
        const title = urgency === "overdue" ? `Просрочено: ${task.title}` : `Напоминание: ${task.title}`;
        toast(title, {
          description: task.due_at ? `Дедлайн: ${formatDateTime(task.due_at)}` : undefined,
          duration: 10000,
          action: { label: "Открыть", onClick: () => navigate({ to: "/cabinet", search: { tab: "tasks" } }) },
        });
      });
      if (due.length > 3) {
        toast(`И ещё ${due.length - 3} задач требуют внимания`, {
          action: { label: "Все задачи", onClick: () => navigate({ to: "/cabinet", search: { tab: "tasks" } }) },
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  return null;
}
