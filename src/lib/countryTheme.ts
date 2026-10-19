// Фирменные цвета стран — одни и те же в карточке программы и в окне «Подробнее».

export const countryTheme: Record<string, string> = {
  Китай: "from-[#8f1d2b] via-[#b4232f] to-[#e0733a]",
  Япония: "from-[#1f2a55] via-[#3b3f7a] to-[#c2405a]",
  "Южная Корея": "from-[#123a63] via-[#1f5f8b] to-[#3fa1a8]",
};

/** Иероглиф-символ страны для фона шапки карточки. */
export const countryGlyph: Record<string, string> = {
  Китай: "中",
  Япония: "日",
  "Южная Корея": "한",
};

export const fallbackTheme = "from-[#2a2f6b] via-[#3d3f9a] to-[#2f8f7a]";
