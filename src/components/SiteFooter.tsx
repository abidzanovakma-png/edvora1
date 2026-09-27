import { Link } from "@tanstack/react-router";
import { GraduationCap, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { mailtoLink, siteContacts, telegramLink, telLink, whatsappLink } from "@/lib/siteContacts";

/** Подвал сайта: о платформе, навигация и контакты «По всем вопросам». */
export function SiteFooter({ className = "" }: { className?: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className={`border-t border-border bg-card ${className}`}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1.2fr]">
        <div>
          <Link to="/about" className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            Edvora
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Подбор университетов Китая, Японии и Южной Кореи по вашим реальным баллам, бюджету и целям.
          </p>
        </div>

        <nav aria-label="Разделы сайта">
          <p className="text-sm font-semibold">Разделы</p>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground hover:underline">Каталог программ</Link></li>
            <li><Link to="/cabinet" className="hover:text-foreground hover:underline">Личный кабинет</Link></li>
            <li><Link to="/about" className="hover:text-foreground hover:underline">О нас</Link></li>
          </ul>
        </nav>

        <div>
          <p className="text-sm font-semibold">По всем вопросам</p>
          <ul className="mt-3 grid gap-2 text-sm">
            <li>
              <a href={mailtoLink} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground hover:underline">
                <Mail className="size-4 shrink-0 text-accent" /> {siteContacts.email}
              </a>
            </li>
            {siteContacts.call && (
              <li>
                <a href={telLink} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground hover:underline">
                  <Phone className="size-4 shrink-0 text-accent" /> {siteContacts.phoneDisplay}
                </a>
              </li>
            )}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {siteContacts.whatsapp && (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted">
                <MessageCircle className="size-3.5" /> WhatsApp
              </a>
            )}
            {telegramLink && (
              <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted">
                <Send className="size-3.5" /> Telegram
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-border/70">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          © {year} Edvora · Требования программ показываются только из загруженной базы, без домыслов.
        </p>
      </div>
    </footer>
  );
}
