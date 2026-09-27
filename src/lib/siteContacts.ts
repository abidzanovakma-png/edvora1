// Контакты Edvora — показываются в подвале сайта и на странице «О нас».
// Чтобы поменять почту или номер, достаточно исправить их здесь.

export const siteContacts = {
  /** Почта для вопросов (пусто — почта нигде не показывается). */
  email: "",
  /** Номер так, как его показывать на сайте. */
  phoneDisplay: "+7 775 250 62 65",
  /** Тот же номер только цифрами, с кодом страны (для ссылок). */
  phoneDigits: "77752506265",
  /** Показывать кнопку «Позвонить». */
  call: true,
  /** Показывать кнопку WhatsApp. */
  whatsapp: true,
  /** Ник в Telegram без @ (пусто — кнопки не будет). */
  telegram: "",
} as const;

export const mailtoLink = siteContacts.email ? `mailto:${siteContacts.email}` : "";
export const telLink = `tel:+${siteContacts.phoneDigits}`;
export const whatsappLink = `https://wa.me/${siteContacts.phoneDigits}`;
export const telegramLink = siteContacts.telegram ? `https://t.me/${siteContacts.telegram}` : "";
