// Контакты Edvora — показываются в подвале сайта и на странице «О нас».
// Чтобы поменять почту или номер, достаточно исправить их здесь.

export const siteContacts = {
  /** Почта для вопросов. */
  email: "hello@edvora.example",
  /** Номер в международном формате, как его показывать. */
  phoneDisplay: "+7 (000) 000-00-00",
  /** Тот же номер только цифрами, с кодом страны (для ссылок). */
  phoneDigits: "70000000000",
  /** Показывать кнопку «Позвонить». */
  call: true,
  /** Показывать кнопку WhatsApp. */
  whatsapp: true,
  /** Ник в Telegram без @ (пусто — кнопки не будет). */
  telegram: "",
} as const;

export const mailtoLink = `mailto:${siteContacts.email}`;
export const telLink = `tel:+${siteContacts.phoneDigits}`;
export const whatsappLink = `https://wa.me/${siteContacts.phoneDigits}`;
export const telegramLink = siteContacts.telegram ? `https://t.me/${siteContacts.telegram}` : "";
