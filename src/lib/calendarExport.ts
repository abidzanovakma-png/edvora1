// Экспорт задач во внешние календари: ссылка «Добавить в Google Календарь»
// и файл .ics (подходит для iPhone, Android, Outlook, Apple Calendar).
// В файле у каждой задачи есть будильник, поэтому телефон сам напомнит о дедлайне.

import type { TaskRow } from "@/lib/userData";

const HOUR_MS = 60 * 60 * 1000;

/** Дата в формате календарей: 20260925T130000Z (UTC). */
function toCalendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(task: Pick<TaskRow, "title" | "notes" | "due_at">) {
  if (!task.due_at) return null;
  const start = new Date(task.due_at);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + HOUR_MS);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Edvora: ${task.title}`,
    dates: `${toCalendarDate(start)}/${toCalendarDate(end)}`,
    details: task.notes ?? "Дедлайн из личного кабинета Edvora",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Строки .ics не длиннее 75 байт (требование формата), перенос — пробелом. */
function fold(line: string) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (encoder.encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(tasks: TaskRow[], now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Edvora//Tasks//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Edvora — дедлайны",
  ];
  for (const task of tasks) {
    if (!task.due_at || task.done) continue;
    const start = new Date(task.due_at);
    if (Number.isNaN(start.getTime())) continue;
    const end = new Date(start.getTime() + HOUR_MS);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${task.id}@edvora`,
      `DTSTAMP:${toCalendarDate(now)}`,
      `DTSTART:${toCalendarDate(start)}`,
      `DTEND:${toCalendarDate(end)}`,
      `SUMMARY:${escapeText(`Edvora: ${task.title}`)}`,
    );
    if (task.notes) lines.push(`DESCRIPTION:${escapeText(task.notes)}`);
    // Напоминание: во время «Напомнить», а если его нет — за сутки до дедлайна.
    const remind = task.remind_at ? new Date(task.remind_at) : null;
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(task.title)}`,
      remind && !Number.isNaN(remind.getTime()) ? `TRIGGER;VALUE=DATE-TIME:${toCalendarDate(remind)}` : "TRIGGER:-P1D",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(tasks: TaskRow[], filename = "edvora-deadlines.ics") {
  const blob = new Blob([buildIcs(tasks)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
