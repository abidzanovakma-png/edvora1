import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, RotateCcw, SendHorizontal, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAssistant, DAILY_LIMITS } from "@/lib/ai.functions";

type Message = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "edvora:assistant-chat";

const suggestions = [
  "Куда я могу поступить с моими баллами?",
  "Какие программы подходят под мой бюджет?",
  "Чем отличается поступление в Китай, Японию и Корею?",
  "Что мне подтянуть, чтобы шансы были выше?",
];

function loadHistory(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Message[]) : [];
    return Array.isArray(parsed) ? parsed.slice(-20) : [];
  } catch {
    return [];
  }
}

/** Простой Markdown: **жирный** и списки «- » / «1. » — без сторонних библиотек. */
function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;
        const bullet = /^[-•*]\s+/.test(trimmed);
        const numbered = /^\d+[.)]\s+/.test(trimmed);
        const content = trimmed.replace(/^[-•*]\s+/, "").replace(/^#+\s*/, "");
        const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
          part.startsWith("**") && part.endsWith("**") ? <strong key={partIndex}>{part.slice(2, -2)}</strong> : <span key={partIndex}>{part}</span>,
        );
        if (bullet) return <p key={index} className="flex gap-2"><span className="text-accent">•</span><span>{parts}</span></p>;
        if (numbered) return <p key={index} className="pl-1">{parts}</p>;
        return <p key={index}>{parts}</p>;
      })}
    </div>
  );
}

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch {
      // нет доступа к sessionStorage — история просто не сохранится при перезагрузке
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    setError(null);
    const next: Message[] = [...messages, { role: "user", content: question.slice(0, 2000) }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const result = await askAssistant({ data: { messages: next.slice(-10) } });
      if (result.ok) {
        setMessages([...next, { role: "assistant", content: result.text }]);
        setRemaining(result.remaining);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Не удалось связаться с ИИ. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="flex h-[min(70vh,640px)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="size-4" /></span>
          <div>
            <p className="text-sm font-semibold">ИИ-консультант Edvora</p>
            <p className="text-xs text-muted-foreground">
              Отвечает по базе программ и вашему профилю{remaining !== null ? ` · осталось ${remaining} из ${DAILY_LIMITS.chat} на сегодня` : ""}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={loading}><RotateCcw /> Новый чат</Button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="mx-auto max-w-md py-6 text-center">
            <Bot className="mx-auto size-8 text-accent" />
            <p className="mt-3 font-medium">Спросите что угодно о поступлении</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Консультант видит ваш профиль и все программы Edvora. Чем полнее заполнен профиль, тем точнее советы.
            </p>
            <div className="mt-5 grid gap-2">
              {suggestions.map((item) => (
                <button key={item} type="button" onClick={() => void send(item)} className="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm hover:bg-muted">
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" && <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><Bot className="size-4" /></span>}
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
              {message.role === "assistant" ? <FormattedText text={message.content} /> : <p className="whitespace-pre-line">{message.content}</p>}
            </div>
            {message.role === "user" && <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><UserRound className="size-4" /></span>}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Консультант думает…
          </div>
        )}
        {error && <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
          placeholder="Например: какие университеты Кореи подходят мне по бюджету?"
          rows={1}
          maxLength={2000}
          className="max-h-32 min-h-10 resize-none"
          aria-label="Вопрос консультанту"
        />
        <Button type="submit" size="icon" className="size-10 shrink-0" disabled={loading || !input.trim()} aria-label="Отправить">
          {loading ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
        </Button>
      </form>
      <p className="border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
        ИИ может ошибаться. Перед подачей документов сверяйтесь с официальным сайтом университета.
      </p>
    </div>
  );
}
