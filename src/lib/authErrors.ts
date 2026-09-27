// Переводит сообщения об ошибках Supabase Auth на русский язык.
// Supabase всегда отвечает по-английски, поэтому без этого пользователь
// видел бы, например, «Invalid login credentials».

const translations: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "Неверная почта или пароль."],
  [/email not confirmed/i, "Почта ещё не подтверждена. Откройте ссылку из письма или отправьте письмо ещё раз."],
  [/user already registered|already been registered|already exists/i, "Эта почта уже зарегистрирована. Войдите в аккаунт."],
  [/longer than 72|password.*too long|exceeds.*72/i, "Пароль слишком длинный: максимум 72 символа латиницей (или 36 кириллицей)."],
  [/password should be at least|password is too short/i, "Пароль слишком короткий: минимум 6 символов."],
  [/password should contain|must contain/i, "Сервер требует в пароле определённые символы. Добавьте цифры, буквы и знаки или напишите нам."],
  [/password.*(weak|pwned|leaked)|weak password/i, "Пароль слишком простой или встречался в утечках. Придумайте другой."],
  [/unable to validate email|invalid email|email address .* is invalid|invalid format/i, "Проверьте адрес почты: похоже, в нём ошибка."],
  [/rate limit|too many requests|security purposes/i, "Слишком много попыток. Подождите минуту и попробуйте снова."],
  [/signups? not allowed|signup is disabled/i, "Регистрация сейчас отключена."],
  [/email link is invalid|token has expired|otp.*expired/i, "Ссылка устарела. Отправьте письмо ещё раз."],
  [/failed to fetch|network|load failed/i, "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз."],
];

export function translateAuthError(error: unknown, fallback = "Что-то пошло не так. Попробуйте ещё раз."): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!message) return fallback;
  for (const [pattern, text] of translations) {
    if (pattern.test(message)) return text;
  }
  // Неизвестная ошибка: показываем исходный текст, чтобы было понятно, что случилось.
  return `${fallback} (${message})`;
}

/**
 * Проверка пароля при регистрации и смене пароля.
 * Правило одно: от 6 символов. Любые буквы, цифры, знаки, пробелы и
 * кириллица разрешены. Сверху — технический предел системы входа: 72 байта.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < 6) return "Пароль слишком короткий: минимум 6 символов.";
  if (new TextEncoder().encode(password).length > 72) {
    return "Пароль слишком длинный: максимум 72 символа латиницей (или 36 кириллицей).";
  }
  return null;
}

export function isEmailNotConfirmed(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /email not confirmed/i.test(message);
}
