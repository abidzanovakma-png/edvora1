// Быстрый доступ к текущему пользователю.
//
// Раньше каждое действие вызывало supabase.auth.getUser() — это отдельный
// запрос к серверу, и такие запросы выстраиваются в очередь друг за другом
// (внутри supabase-js они идут под общей блокировкой). При открытии кабинета
// набиралось ~8 последовательных запросов — отсюда «зависания».
//
// Теперь пользователь берётся из сессии, которая уже лежит в браузере
// (без запроса к серверу), и кешируется в памяти. Безопасность не страдает:
// каждый запрос к базе всё равно проверяется сервером (RLS по токену).

import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

let cached: Promise<User | null> | null = null;
let subscribed = false;

function subscribe() {
  if (subscribed || typeof window === "undefined") return;
  subscribed = true;
  // Важно: внутри колбэка не вызываем supabase — только обновляем кеш,
  // иначе supabase-js может заблокироваться.
  supabase.auth.onAuthStateChange((_event, session) => {
    cached = Promise.resolve(session?.user ?? null);
  });
}

export function getCurrentUser(): Promise<User | null> {
  subscribe();
  if (!cached) {
    cached = supabase.auth
      .getSession()
      .then(({ data }) => data.session?.user ?? null)
      .catch(() => null);
  }
  return cached;
}

export async function getUserId(): Promise<string | null> {
  return (await getCurrentUser())?.id ?? null;
}
