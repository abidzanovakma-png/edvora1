import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { taskUrgency, type TaskRow } from "@/lib/userData";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Месячный календарь дедлайнов (неделя начинается с понедельника). */
export function TaskCalendar({ tasks, onSelectTask }: { tasks: TaskRow[]; onSelectTask?: (task: TaskRow) => void }) {
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string>(dayKey(today));

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const task of tasks) {
      if (!task.due_at) continue;
      const date = new Date(task.due_at);
      if (Number.isNaN(date.getTime())) continue;
      const key = dayKey(date);
      map.set(key, [...(map.get(key) ?? []), task]);
    }
    return map;
  }, [tasks]);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // понедельник = 0
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  }, [month]);

  const monthLabel = month.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const selectedTasks = tasksByDay.get(selectedDay) ?? [];
  const selectedDate = cells.find((date) => dayKey(date) === selectedDay);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Предыдущий месяц"><ChevronLeft /></Button>
        <p className="font-display font-bold capitalize">{monthLabel}</p>
        <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Следующий месяц"><ChevronRight /></Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {WEEKDAYS.map((day) => <div key={day} className="py-1">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const key = dayKey(date);
          const dayTasks = tasksByDay.get(key) ?? [];
          const inMonth = date.getMonth() === month.getMonth();
          const isToday = key === dayKey(today);
          const isSelected = key === selectedDay;
          const hasOverdue = dayTasks.some((task) => taskUrgency(task) === "overdue");
          const openCount = dayTasks.filter((task) => !task.done).length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDay(key)}
              aria-label={`${date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}${dayTasks.length ? `, задач: ${dayTasks.length}` : ""}`}
              aria-pressed={isSelected}
              className={`flex min-h-12 flex-col items-center rounded-md border p-1 text-xs transition-colors sm:min-h-16 ${
                isSelected ? "border-primary bg-secondary" : "border-transparent hover:bg-muted"
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <span className={`grid size-6 place-items-center rounded-full ${isToday ? "bg-primary font-bold text-primary-foreground" : ""}`}>{date.getDate()}</span>
              {dayTasks.length > 0 && (
                <span className="mt-1 flex items-center gap-0.5">
                  <span className={`size-1.5 rounded-full ${hasOverdue ? "bg-destructive" : openCount > 0 ? "bg-primary" : "bg-muted-foreground"}`} />
                  {dayTasks.length > 1 && <span className="text-[10px] text-muted-foreground">{dayTasks.length}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <p className="text-sm font-semibold">
          {selectedDate ? selectedDate.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" }) : "Выбранный день"}
        </p>
        {selectedTasks.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">В этот день дедлайнов нет.</p>
        ) : (
          <ul className="mt-2 grid gap-1.5">
            {selectedTasks.map((task) => (
              <li key={task.id}>
                <button type="button" onClick={() => onSelectTask?.(task)} className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
                  <span className={task.done ? "text-muted-foreground line-through" : "font-medium"}>{task.title}</span>
                  <span className={`shrink-0 text-xs ${taskUrgency(task) === "overdue" ? "text-destructive" : "text-muted-foreground"}`}>{task.due_at ? new Date(task.due_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
