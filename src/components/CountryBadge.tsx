import { countryGlyph, countryTheme, fallbackTheme } from "@/lib/countryTheme";

/** Квадратик в цветах страны с её иероглифом — как шапка карточки в каталоге. */
export function CountryBadge({ country, className = "" }: { country?: string | null; className?: string }) {
  const theme = (country && countryTheme[country]) || fallbackTheme;
  const glyph = (country && countryGlyph[country]) || "";
  return (
    <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${theme} font-display text-lg font-bold text-white shadow-card ${className}`}>
      {glyph}
    </span>
  );
}
