// ИИ в Edvora: консультант по поступлению и объяснение шансов.
//
// Всё, что касается ИИ, выполняется на сервере (createServerFn): ключ
// LOVABLE_API_KEY и подсказки для модели в браузер не попадают.
// Вызовы идут через Lovable AI Gateway и оплачиваются кредитами Lovable,
// поэтому у каждого пользователя есть дневной лимит запросов.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import programsData from "@/data/programs.json";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// ---------- Настройки ----------

/** Сколько запросов в сутки можно сделать одному пользователю. */
export const DAILY_LIMITS = { chat: 20, explain: 30 } as const;

/** Адрес шлюза Lovable AI (OpenAI-совместимый формат). */
const DEFAULT_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
/**
 * Названия моделей, которые пробуем по очереди: точный идентификатор Claude
 * в шлюзе Lovable нигде не опубликован. Первая сработавшая модель
 * запоминается, и дальше используется сразу она.
 */
const MODEL_CANDIDATES = [
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-haiku-4-5",
  "claude-haiku-4-5",
  "anthropic/claude-sonnet-5",
  "google/gemini-2.5-flash",
];

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class AiError extends Error {}

let workingModel: string | null = null;

/** Единственное место, где вызывается модель. */
async function callModel(messages: ChatMessage[], maxTokens: number): Promise<string> {
  // process.env читается только здесь, на сервере (в браузере его нет).
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("ИИ ещё не подключён к проекту (нет LOVABLE_API_KEY).");
  const url = process.env["LOVABLE_AI_GATEWAY_URL"] || DEFAULT_GATEWAY_URL;
  const preferred = process.env["EDVORA_AI_MODEL"];
  const candidates = [...new Set([preferred, workingModel, ...MODEL_CANDIDATES].filter((item): item is string => Boolean(item)))];

  let lastProblem = "";
  for (const model of candidates) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.4 }),
      });
    } catch (error) {
      console.error("[Edvora AI] network error", error);
      throw new AiError("Сервер не смог связаться с ИИ. Попробуйте чуть позже.");
    }

    if (response.status === 429) throw new AiError("Сейчас слишком много запросов к ИИ. Попробуйте через минуту.");
    if (response.status === 402) throw new AiError("ИИ временно недоступен: закончились кредиты Lovable на ИИ.");
    if (response.status === 401 || response.status === 403) {
      const details = await response.text().catch(() => "");
      console.error("[Edvora AI] auth error", response.status, details.slice(0, 500));
      throw new AiError(`ИИ отклонил ключ доступа (код ${response.status}). Проверьте, что Lovable AI включён для проекта.`);
    }
    if (!response.ok) {
      // 400 / 404 / 422 обычно значат «нет такой модели» — пробуем следующую.
      const details = await response.text().catch(() => "");
      console.error("[Edvora AI] gateway error", model, response.status, details.slice(0, 500));
      lastProblem = `код ${response.status}: ${details.replace(/\s+/g, " ").slice(0, 160)}`;
      if ([400, 404, 422].includes(response.status)) continue;
      throw new AiError(`ИИ не ответил (${lastProblem}). Попробуйте ещё раз чуть позже.`);
    }

    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) throw new AiError("ИИ вернул пустой ответ. Попробуйте переформулировать вопрос.");
    workingModel = model;
    return text;
  }
  throw new AiError(`ИИ не ответил (${lastProblem || "нет подходящей модели"}). Пришлите этот текст разработчику.`);
}

// ---------- Контекст для модели ----------

/** Краткая выжимка всей базы программ — ИИ отвечает только по ней. */
const buildCatalogContext = () => programsData
  .map((program, index) =>
    [
      `#${index + 1} ${program.university} — ${program.program}`,
      `Страна/город: ${program.country}, ${program.city}; QS: ${program.rank}`,
      `Уровни: ${program.levels.join(", ")}; языки: ${program.languages.join(", ")}`,
      `Специальности: ${program.majors.join(", ")}`,
      `GPA: ${program.gpa}; IELTS: ${program.ielts}; TOEFL: ${program.toefl}`,
      `Языковой экзамен: ${program.languageExamRequirement || "—"}`,
      `Стандартизированные тесты: ${program.standardizedTests || "—"}`,
      `Стоимость: ${program.cost}`,
      `Сайт: ${program.website}`,
    ].join("\n"),
  )
  .join("\n\n");

const RULES = `Ты — ИИ-консультант Edvora, платформы для подбора университетов Китая, Японии и Южной Кореи.
Правила:
- Отвечай по-русски, дружелюбно и коротко (обычно 3–8 предложений или короткий список).
- Используй ТОЛЬКО данные из базы программ ниже и профиля студента. Ничего не выдумывай: если данных нет, честно скажи об этом и посоветуй проверить официальный сайт университета.
- Называй университеты и программы так, как они записаны в базе.
- Цифры (GPA, IELTS, TOEFL, стоимость) бери только из базы.
- Не обещай поступление; говори о шансах осторожно.
- Если вопрос не про поступление и учёбу за рубежом, вежливо верни разговор к теме.`;

type ProfileRow = Record<string, unknown> | null;

function profileContext(profile: ProfileRow) {
  if (!profile) return "Профиль студента не заполнен.";
  const value = (key: string) => {
    const raw = profile[key];
    if (Array.isArray(raw)) return raw.length ? raw.join(", ") : "—";
    return typeof raw === "string" && raw.trim() ? raw : "—";
  };
  const skipped = Array.isArray(profile["skipped_tests"]) ? (profile["skipped_tests"] as string[]) : [];
  return [
    `Имя: ${value("full_name")}`,
    `Страны интереса: ${value("target_countries")}`,
    `Желаемый уровень: ${value("intended_level")}; специальность: ${value("intended_major")}`,
    `GPA: ${value("gpa")}; IELTS: ${value("ielts")}; TOEFL: ${value("toefl")}; SAT/ACT: ${value("sat")}`,
    `Языковой экзамен: ${value("language_exam")}; доп. экзамены: ${value("extra_exams")}`,
    `Бюджет в год (USD): ${value("budget_usd")}`,
    `Тесты, которых нет: ${skipped.length ? skipped.join(", ") : "—"}`,
    `Готовые документы: ${value("documents")}`,
    `О себе: ${value("about")}`,
  ].join("\n");
}

// ---------- Лимиты ----------

type Kind = keyof typeof DAILY_LIMITS;

// Если таблицы ai_usage ещё нет, считаем в памяти сервера (менее надёжно, но работает).
const memoryUsage = new Map<string, number[]>();

type Supa = SupabaseClient<Database>;

/** Проверяет лимит. Запрос записывается в счётчик только после успешного ответа ИИ. */
async function checkUsage(supabase: Supa, userId: string, kind: Kind) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const limit = DAILY_LIMITS[kind];
  const { count, error } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("created_at", since);

  if (error) {
    const recent = (memoryUsage.get(`${userId}:${kind}`) ?? []).filter((time) => time > Date.now() - 24 * 60 * 60 * 1000);
    if (recent.length >= limit) throw new AiError(limitMessage(kind));
    return { used: recent.length, table: false };
  }
  if ((count ?? 0) >= limit) throw new AiError(limitMessage(kind));
  return { used: count ?? 0, table: true };
}

async function recordUsage(supabase: Supa, userId: string, kind: Kind, usage: { used: number; table: boolean }) {
  if (usage.table) {
    await supabase.from("ai_usage").insert({ user_id: userId, kind });
  } else {
    const key = `${userId}:${kind}`;
    memoryUsage.set(key, [...(memoryUsage.get(key) ?? []), Date.now()]);
  }
  return DAILY_LIMITS[kind] - usage.used - 1;
}

function limitMessage(kind: Kind) {
  return kind === "chat"
    ? `На сегодня лимит вопросов ИИ-консультанту исчерпан (${DAILY_LIMITS.chat} в сутки). Возвращайтесь завтра!`
    : `На сегодня лимит объяснений исчерпан (${DAILY_LIMITS.explain} в сутки). Возвращайтесь завтра!`;
}

async function loadProfile(supabase: Supa, userId: string): Promise<ProfileRow> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return (data as ProfileRow) ?? null;
}

type AiResult = { ok: true; text: string; remaining: number } | { ok: false; error: string };

function failure(error: unknown): AiResult {
  if (error instanceof AiError) return { ok: false, error: error.message };
  console.error("[Edvora AI] unexpected error", error);
  return { ok: false, error: "Что-то пошло не так. Попробуйте ещё раз." };
}

// ---------- 1. ИИ-консультант ----------

const chatInput = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(20),
});

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => chatInput.parse(input))
  .handler(async ({ data, context }): Promise<AiResult> => {
    try {
      const usage = await checkUsage(context.supabase, context.userId, "chat");
      const profile = await loadProfile(context.supabase, context.userId);
      const system = `${RULES}\n\n=== ПРОФИЛЬ СТУДЕНТА ===\n${profileContext(profile)}\n\n=== БАЗА ПРОГРАММ EDVORA ===\n${buildCatalogContext()}`;
      // Берём только последние сообщения, чтобы запрос не разрастался.
      const history = data.messages.slice(-10);
      const text = await callModel([{ role: "system", content: system }, ...history], 700);
      const remaining = await recordUsage(context.supabase, context.userId, "chat", usage);
      return { ok: true, text, remaining };
    } catch (error) {
      return failure(error);
    }
  });

// ---------- 4. Объяснение шансов ----------

const explainInput = z.object({
  programKey: z.string().min(3).max(600),
  category: z.enum(["Safety", "Match", "Reach"]),
  criteria: z
    .array(z.object({ label: z.string().max(100), status: z.string().max(20), note: z.string().max(300) }))
    .max(20),
  profile: z.object({
    gpa: z.string().max(20),
    ielts: z.string().max(20),
    toefl: z.string().max(20),
    sat: z.string().max(20),
    motivation: z.boolean(),
    recommendations: z.boolean(),
    portfolio: z.boolean(),
  }),
});

const categoryMeaning = {
  Safety: "Safety — студент проходит по требованиям с запасом",
  Match: "Match — студент примерно соответствует требованиям",
  Reach: "Reach — поступить сложно, есть дефициты",
} as const;

export const explainChances = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => explainInput.parse(input))
  .handler(async ({ data, context }): Promise<AiResult> => {
    try {
      const program = programsData.find((item) => `${item.university}::${item.program}` === data.programKey);
      if (!program) throw new AiError("Программа не найдена в базе.");
      const usage = await checkUsage(context.supabase, context.userId, "explain");

      const criteria = data.criteria.map((item) => `- ${item.label}: ${item.status}${item.note ? ` (${item.note})` : ""}`).join("\n");
      const prompt = `Объясни студенту его шансы на эту программу.

Программа: ${program.university} — ${program.program} (${program.country}, ${program.city}, QS ${program.rank})
Требования: GPA ${program.gpa}; IELTS ${program.ielts}; TOEFL ${program.toefl}; языковой экзамен: ${program.languageExamRequirement || "—"}; тесты: ${program.standardizedTests || "—"}; стоимость: ${program.cost}

Профиль студента: GPA ${data.profile.gpa || "не указан"}, IELTS ${data.profile.ielts || "не указан"}, TOEFL ${data.profile.toefl || "не указан"}, SAT/ACT ${data.profile.sat || "не указан"}; мотивационное письмо: ${data.profile.motivation ? "есть" : "нет"}; рекомендации: ${data.profile.recommendations ? "есть" : "нет"}; портфолио: ${data.profile.portfolio ? "есть" : "нет"}.

Оценка Edvora: ${categoryMeaning[data.category]}.
Проверка по критериям:
${criteria}

Формат ответа: 2–3 предложения, почему такая оценка, затем «Что сделать:» и 2–3 коротких конкретных совета. Без вступлений и без выдуманных фактов.`;

      const text = await callModel(
        [
          { role: "system", content: RULES },
          { role: "user", content: prompt },
        ],
        350,
      );
      const remaining = await recordUsage(context.supabase, context.userId, "explain", usage);
      return { ok: true, text, remaining };
    } catch (error) {
      return failure(error);
    }
  });
