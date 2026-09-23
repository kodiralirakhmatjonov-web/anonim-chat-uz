import { STATUS_ASSETS } from './status-assets';
import { MINI_ASSETS } from './mini-assets';
import { bookingMiniV7HTML } from './mini-v7';
type ScheduledController = { cron?: string; scheduledTime?: number; noRetry?: () => void };

type Locale = "ru" | "en" | "uz" | "uz_cyrl";

type LocalizedStatusCopy = {
  title: string;
  body: string;
};

type TranslationSet = {
  actions: { refresh: string; liveTimer: string; openIumrah: string; connectTelegram: string };
  generic: {
    booking: string;
    dates: string;
    confirmation: string;
    stageExpired: string;
    synced: string;
    bookingNotLinkedTitle: string;
    bookingNotLinkedBody: string;
    updateFailedTitle: string;
    reconnectPrompt: string;
    linkExpiredTitle: string;
    linkExpiredBody: string;
    helpTitle: string;
    helpBody: string;
    linkSuccessTitle: string;
    linkSuccessBody: string;
    callbackUpdated: string;
    callbackRefreshFailed: string;
    callbackNotLinked: string;
  };
  lifecycle: { availability: string; price_lock: string; payment_confirmation: string; documents: string };
  statuses: {
    newBooking: LocalizedStatusCopy;
    checking: LocalizedStatusCopy;
    paymentWaiting: LocalizedStatusCopy;
    paymentReceived: LocalizedStatusCopy;
    confirmed: LocalizedStatusCopy;
    ready: LocalizedStatusCopy;
    inTrip: LocalizedStatusCopy;
    completed: LocalizedStatusCopy;
    fallbackTitle: string;
  };
};

const I18N: Record<Locale, TranslationSet> = {
  ru: {
    actions: { refresh: "Обновить статус", liveTimer: "Живой таймер", openIumrah: "Открыть iumrah", connectTelegram: "Подключить Telegram" },
    generic: {
      booking: "Бронь", dates: "Даты", confirmation: "Подтверждение", stageExpired: "Срок этапа завершён", synced: "Статус синхронизирован с единой системой iumrah.",
      bookingNotLinkedTitle: "Бронь ещё не подключена", bookingNotLinkedBody: "Откройте свою бронь в iumrah и нажмите «Подключить Telegram». Ссылка действует 10 минут и связывает Telegram без пароля.",
      updateFailedTitle: "Не удалось обновить бронь", reconnectPrompt: "Откройте iumrah и переподключите Telegram.",
      linkExpiredTitle: "Ссылка больше не действует", linkExpiredBody: "Откройте бронь в iumrah и создайте новую ссылку «Подключить Telegram».",
      helpTitle: "iumrah Telegram", helpBody: "/status — статус бронирования\n/start — мои бронирования\n\nДля первой привязки используйте кнопку «Подключить Telegram» внутри iumrah.",
      linkSuccessTitle: "Telegram подключён к iumrah", linkSuccessBody: "Бронь %s привязана. Теперь изменения статуса будут приходить сюда автоматически.",
      callbackUpdated: "Статус обновлён", callbackRefreshFailed: "Не удалось обновить", callbackNotLinked: "Бронь не подключена"
    },
    lifecycle: { availability: "До максимального срока проверки", price_lock: "Цена зафиксирована ещё", payment_confirmation: "Проверка оплаты", documents: "Подготовка документов" },
    statuses: {
      newBooking: { title: "Новое бронирование", body: "Ваша бронь создана и передана в систему iumrah. Скоро начнётся автоматическая проверка рейсов, отелей и остальных компонентов поездки." },
      checking: { title: "Проверка наличия", body: "iumrah проверяет рейсы, отели и остальные компоненты вашей поездки." },
      paymentWaiting: { title: "Наличие подтверждено", body: "Можно переходить к оплате и заполнению данных паломников. Цена удерживается ограниченное время." },
      paymentReceived: { title: "Оплата получена", body: "Платёж уже получен и сейчас проходит подтверждение." },
      confirmed: { title: "Бронирование подтверждено", body: "Мы готовим документы и подтверждения по вашей поездке." },
      ready: { title: "Документы готовы", body: "Поездка готова. Основные документы и подтверждения уже собраны." },
      inTrip: { title: "Паломник в поездке", body: "Ваша поездка уже началась. Основные данные остаются доступны в iumrah." },
      completed: { title: "Завершено", body: "Бронирование завершено. Пусть Аллах примет вашу Умру." },
      fallbackTitle: "Статус бронирования"
    }
  },
  en: {
    actions: { refresh: "Refresh status", liveTimer: "Live timer", openIumrah: "Open iumrah", connectTelegram: "Connect Telegram" },
    generic: {
      booking: "Booking", dates: "Dates", confirmation: "Confirmation", stageExpired: "Stage time is over", synced: "Status is synced with the unified iumrah system.",
      bookingNotLinkedTitle: "No booking is linked yet", bookingNotLinkedBody: "Open your booking in iumrah and tap “Connect Telegram”. The link stays active for 10 minutes and links Telegram without a password.",
      updateFailedTitle: "Could not refresh booking", reconnectPrompt: "Open iumrah and reconnect Telegram.",
      linkExpiredTitle: "This link is no longer active", linkExpiredBody: "Open your booking in iumrah and create a new “Connect Telegram” link.",
      helpTitle: "iumrah Telegram", helpBody: "/status — booking status\n/start — my bookings\n\nFor the first link, use the “Connect Telegram” button inside iumrah.",
      linkSuccessTitle: "Telegram is connected to iumrah", linkSuccessBody: "Booking %s has been linked. Status updates will now arrive here automatically.",
      callbackUpdated: "Status refreshed", callbackRefreshFailed: "Refresh failed", callbackNotLinked: "Booking is not linked"
    },
    lifecycle: { availability: "Maximum availability window", price_lock: "Price is locked for", payment_confirmation: "Payment review", documents: "Preparing documents" },
    statuses: {
      newBooking: { title: "New booking", body: "Your booking has been created and sent to the iumrah system. Automatic verification of flights, hotels and the remaining trip components will begin shortly." },
      checking: { title: "Checking availability", body: "iumrah is checking flights, hotels and the remaining trip components." },
      paymentWaiting: { title: "Availability confirmed", body: "You can now proceed with payment and pilgrim details. The price is held for a limited time." },
      paymentReceived: { title: "Payment received", body: "Your payment has been received and is now being reviewed." },
      confirmed: { title: "Booking confirmed", body: "We are preparing your travel documents and confirmations." },
      ready: { title: "Documents ready", body: "Your trip is ready. Core documents and confirmations are already prepared." },
      inTrip: { title: "Pilgrim is in trip", body: "Your Umrah journey is already active. Core details remain available in iumrah." },
      completed: { title: "Completed", body: "This booking is completed. May Allah accept your Umrah." },
      fallbackTitle: "Booking status"
    }
  },
  uz: {
    actions: { refresh: "Statusni yangilash", liveTimer: "Jonli taymer", openIumrah: "iumrah'ni ochish", connectTelegram: "Telegram'ni ulash" },
    generic: {
      booking: "Bron", dates: "Sanalar", confirmation: "Tasdiq", stageExpired: "Bosqich muddati tugadi", synced: "Status iumrah yagona tizimi bilan sinxronlangan.",
      bookingNotLinkedTitle: "Bron hali ulanmagan", bookingNotLinkedBody: "Broningizni iumrah ichida oching va “Telegram'ni ulash” tugmasini bosing. Havola 10 daqiqa amal qiladi va Telegram'ni parolsiz bog'laydi.",
      updateFailedTitle: "Bronni yangilab bo‘lmadi", reconnectPrompt: "iumrah'ni ochib, Telegram'ni qayta ulang.",
      linkExpiredTitle: "Havola endi faol emas", linkExpiredBody: "iumrah ichida bronni oching va yangi “Telegram'ni ulash” havolasini yarating.",
      helpTitle: "iumrah Telegram", helpBody: "/status — bron holati\n/start — mening bronlarim\n\nBirinchi ulash uchun iumrah ichidagi “Telegram'ni ulash” tugmasidan foydalaning.",
      linkSuccessTitle: "Telegram iumrah'ga ulandi", linkSuccessBody: "%s broni ulandi. Endi status o'zgarishlari shu yerga avtomatik keladi.",
      callbackUpdated: "Status yangilandi", callbackRefreshFailed: "Yangilanmadi", callbackNotLinked: "Bron ulanmagan"
    },
    lifecycle: { availability: "Maksimal tekshiruv muddati", price_lock: "Narx yana shuncha vaqt ushlab turiladi", payment_confirmation: "To'lovni tekshirish", documents: "Hujjatlar tayyorlanmoqda" },
    statuses: {
      newBooking: { title: "Yangi bron", body: "Broningiz yaratildi va iumrah tizimiga yuborildi. Tez orada parvozlar, mehmonxonalar va safarning qolgan qismlari avtomatik tekshiriladi." },
      checking: { title: "Mavjudlik tekshirilmoqda", body: "iumrah parvozlar, mehmonxonalar va safarning qolgan qismlarini tekshirmoqda." },
      paymentWaiting: { title: "Mavjudlik tasdiqlandi", body: "Endi to'lov va ziyoratchilar ma'lumotlarini topshirishingiz mumkin. Narx cheklangan vaqtga ushlab turiladi." },
      paymentReceived: { title: "To'lov qabul qilindi", body: "To'lov qabul qilindi va hozir tasdiqlanmoqda." },
      confirmed: { title: "Bron tasdiqlandi", body: "Safaringiz bo'yicha hujjatlar va tasdiqlar tayyorlanmoqda." },
      ready: { title: "Hujjatlar tayyor", body: "Safar tayyor. Asosiy hujjatlar va tasdiqlar allaqachon tayyor." },
      inTrip: { title: "Ziyoratchi safarda", body: "Umra safaringiz boshlandi. Asosiy ma'lumotlar iumrah ichida mavjud." },
      completed: { title: "Yakunlandi", body: "Bron yakunlandi. Alloh Umrangizni qabul qilsin." },
      fallbackTitle: "Bron holati"
    }
  },
  uz_cyrl: {
    actions: { refresh: "Статусни янгилаш", liveTimer: "Жонли таймер", openIumrah: "iumrah'ни очиш", connectTelegram: "Telegram'ни улаш" },
    generic: {
      booking: "Брон", dates: "Саналар", confirmation: "Тасдиқ", stageExpired: "Босқич муддати тугади", synced: "Статус iumrah ягона тизими билан синхронланган.",
      bookingNotLinkedTitle: "Брон ҳали уланмаган", bookingNotLinkedBody: "Бронингизни iumrah ичида очинг ва “Telegram'ни улаш” тугмасини босинг. Ҳавола 10 дақиқа амал қилади ва Telegram'ни паролсиз боғлайди.",
      updateFailedTitle: "Бронни янгилаб бўлмади", reconnectPrompt: "iumrah'ни очиб, Telegram'ни қайта уланг.",
      linkExpiredTitle: "Ҳавола энди фаол эмас", linkExpiredBody: "iumrah ичида бронни очинг ва янги “Telegram'ни улаш” ҳаволасини яратинг.",
      helpTitle: "iumrah Telegram", helpBody: "/status — брон ҳолати\n/start — менинг бронларим\n\nБиринчи улаш учун iumrah ичидаги “Telegram'ни улаш” тугмасидан фойдаланинг.",
      linkSuccessTitle: "Telegram iumrah'га уланди", linkSuccessBody: "%s брони уланди. Энди статус ўзгаришлари шу ерга автоматик келади.",
      callbackUpdated: "Статус янгиланди", callbackRefreshFailed: "Янгиланмади", callbackNotLinked: "Брон уланмаган"
    },
    lifecycle: { availability: "Максимал текширув муддати", price_lock: "Нарх яна шунча вақт ушлаб турилади", payment_confirmation: "Тўловни текшириш", documents: "Ҳужжатлар тайёрланмоқда" },
    statuses: {
      newBooking: { title: "Янги брон", body: "Бронингиз яратилди ва iumrah тизимига юборилди. Яқин орада парвозлар, меҳмонхоналар ва сафарнинг қолган қисмлари автоматик текширилади." },
      checking: { title: "Мавжудлик текширилмоқда", body: "iumrah парвозлар, меҳмонхоналар ва сафарнинг қолган қисмларини текширмоқда." },
      paymentWaiting: { title: "Мавжудлик тасдиқланди", body: "Энди тўлов ва зиёратчилар маълумотларини топширишингиз мумкин. Нарх чекланган вақтга ушлаб турилади." },
      paymentReceived: { title: "Тўлов қабул қилинди", body: "Тўлов қабул қилинди ва ҳозир тасдиқланмоқда." },
      confirmed: { title: "Брон тасдиқланди", body: "Сафарингиз бўйича ҳужжатлар ва тасдиқлар тайёрланмоқда." },
      ready: { title: "Ҳужжатлар тайёр", body: "Сафар тайёр. Асосий ҳужжатлар ва тасдиқлар аллақачон тайёр." },
      inTrip: { title: "Зиёратчи сафарда", body: "Умра сафарингиз бошланди. Асосий маълумотлар iumrah ичида мавжуд." },
      completed: { title: "Якунланди", body: "Брон якунланди. Аллоҳ Умрангизни қабул қилсин." },
      fallbackTitle: "Брон ҳолати"
    }
  }
};


interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

type FetcherLike = {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
};

interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  IUMRAH_TELEGRAM_BRIDGE_SECRET?: string;
  IUMRAH_API_ORIGIN?: string;
  TELEGRAM_BOT_USERNAME?: string;
  PUBLIC_BASE_URL?: string;
  LINK_ENCRYPTION_KEY?: string;
  IUMRAH_WEB?: FetcherLike;
  IUMRAH_PACKAGE_API?: FetcherLike;
  DB: D1Database;
}



type BotUXCopy = {
  chooseLanguage: string;
  languageSaved: string;
  welcomeTitle: string;
  welcomeBody: string;
  pinnedTitle: string;
  pinnedBody: string;
  openMini: string;
  status: string;
  support: string;
  supportTitle: string;
  supportBody: string;
  menuReady: string;
  website: string;
};

const BOT_UX: Record<Locale, BotUXCopy> = {
  ru: {
    chooseLanguage: "Выберите язык iumrah Telegram",
    languageSaved: "Русский выбран",
    welcomeTitle: "iumrah — ваша поездка в Telegram",
    welcomeBody: "Отслеживайте статус бронирования, серверные таймеры и изменения поездки. Полное управление бронью доступно в Mini App.",
    pinnedTitle: "Отслеживание бронирования",
    pinnedBody: "Откройте Mini App, чтобы видеть актуальный статус, таймеры, отели, услуги и iumrah Care.",
    openMini: "Открыть Mini App",
    status: "Статус брони",
    support: "iumrah Care",
    supportTitle: "iumrah Care",
    supportBody: "Поддержка по вашей поездке. Телефон: +998 50 889 88 45. Для управления поддержкой откройте Care в Mini App.",
    menuReady: "Меню готово. Mini App всегда доступно кнопкой ниже.",
    website: "Открыть iumrah.app",
  },
  en: {
    chooseLanguage: "Choose your iumrah Telegram language",
    languageSaved: "English selected",
    welcomeTitle: "iumrah — your trip in Telegram",
    welcomeBody: "Track booking status, server timers and trip changes. Full booking management is available in the Mini App.",
    pinnedTitle: "Booking tracking",
    pinnedBody: "Open the Mini App to see live status, timers, hotels, services and iumrah Care.",
    openMini: "Open Mini App",
    status: "Booking status",
    support: "iumrah Care",
    supportTitle: "iumrah Care",
    supportBody: "Support for your trip. Phone: +998 50 889 88 45. Open Care in the Mini App for full support controls.",
    menuReady: "Menu is ready. The Mini App is always available from the button below.",
    website: "Open iumrah.app",
  },
  uz: {
    chooseLanguage: "iumrah Telegram tilini tanlang",
    languageSaved: "O‘zbek tili tanlandi",
    welcomeTitle: "iumrah — safaringiz Telegram ichida",
    welcomeBody: "Bron holati, server taymerlari va safardagi o‘zgarishlarni kuzating. Bronni to‘liq boshqarish Mini App ichida mavjud.",
    pinnedTitle: "Bronni kuzatish",
    pinnedBody: "Jonli status, taymerlar, mehmonxonalar, xizmatlar va iumrah Care uchun Mini App’ni oching.",
    openMini: "Mini App’ni ochish",
    status: "Bron holati",
    support: "iumrah Care",
    supportTitle: "iumrah Care",
    supportBody: "Safaringiz bo‘yicha yordam. Telefon: +998 50 889 88 45. To‘liq yordam boshqaruvi uchun Mini App ichidagi Care bo‘limini oching.",
    menuReady: "Menyu tayyor. Mini App pastdagi tugma orqali doim ochiladi.",
    website: "iumrah.app’ni ochish",
  },
  uz_cyrl: {
    chooseLanguage: "iumrah Telegram тилини танланг",
    languageSaved: "Ўзбек тили танланди",
    welcomeTitle: "iumrah — сафарингиз Telegram ичида",
    welcomeBody: "Брон ҳолати, сервер таймерлари ва сафардаги ўзгаришларни кузатинг. Бронни тўлиқ бошқариш Mini App ичида мавжуд.",
    pinnedTitle: "Бронни кузатиш",
    pinnedBody: "Жонли статус, таймерлар, меҳмонхоналар, хизматлар ва iumrah Care учун Mini App’ни очинг.",
    openMini: "Mini App’ни очиш",
    status: "Брон ҳолати",
    support: "iumrah Care",
    supportTitle: "iumrah Care",
    supportBody: "Сафарингиз бўйича ёрдам. Телефон: +998 50 889 88 45. Тўлиқ ёрдам бошқаруви учун Mini App ичидаги Care бўлимини очинг.",
    menuReady: "Меню тайёр. Mini App пастдаги тугма орқали доим очилади.",
    website: "iumrah.app’ни очиш",
  },
};

type TelegramUserPreferenceRow = {
  telegram_user_id: number;
  language: string;
  pinned_message_id: number | null;
  updated_at: string;
};

type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

type TelegramChat = { id: number; type: string };
type TelegramMessage = { message_id: number; from?: TelegramUser; chat: TelegramChat; text?: string };
type TelegramCallbackQuery = { id: string; from: TelegramUser; data?: string; message?: TelegramMessage };
type TelegramUpdate = { update_id: number; message?: TelegramMessage; callback_query?: TelegramCallbackQuery };

type ClientTripSnapshot = {
  bookingID: string;
  bookingNumber?: number | null;
  bookingDisplayNumber?: string | null;
  pilgrimID?: string | null;
  status: string;
  paymentStatus?: string | null;
  confirmationNumber?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
  availabilityStartedAt?: string | null;
  availabilityDeadlineAt?: string | null;
  priceLockStartedAt?: string | null;
  priceLockExpiresAt?: string | null;
  paymentReceivedAt?: string | null;
  paymentConfirmationDeadlineAt?: string | null;
  documentsStartedAt?: string | null;
  documentsDeadlineAt?: string | null;
};

type StatusHistoryEntry = { oldStatus?: string | null; newStatus: string; createdAt: string };
type ClientTripResponse = { ok?: boolean; trip: ClientTripSnapshot; statusHistory?: StatusHistoryEntry[] | null };
type Lifecycle = {
  kind: "availability" | "price_lock" | "payment_confirmation" | "documents" | "none";
  deadlineAt: string | null;
  title: string;
};

type LinkedBookingRow = {
  telegram_user_id: number;
  chat_id: number;
  booking_id: string;
  booking_token_ciphertext: string;
  booking_token_iv: string;
  language: string | null;
  last_status: string | null;
  last_payment_status: string | null;
  last_confirmation_number: string | null;
  notifications_enabled: number;
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const LINK_TTL_SECONDS = 10 * 60;
const MINI_INIT_MAX_AGE_SECONDS = 60 * 60;
const encoder = new TextEncoder();

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function normalizeOrigin(raw: string | undefined): string {
  const value = raw?.trim().replace(/\/+$/, "");
  return value || "https://iumrah.app";
}

function apiOrigin(env: Env): string {
  return normalizeOrigin(env.IUMRAH_API_ORIGIN);
}



function normalizeLocale(value: string | null | undefined): Locale {
  const raw = (value || '').trim().toLowerCase();
  if (!raw) return 'ru';
  if (raw.startsWith('en')) return 'en';
  if (["uzcyr", "uz-cyr", "uz_cyr", "uz-cyrl", "uz_cyrl", "uzcyrl", "uzkiril", "uz-kiril", "uz_kiril"].includes(raw)) return 'uz_cyrl';
  if (raw.includes('cyr') || raw.includes('кирил')) return 'uz_cyrl';
  if (raw.startsWith('uz')) return 'uz';
  return 'ru';
}

function textFor(locale: Locale): TranslationSet {
  return I18N[locale] ?? I18N.ru;
}

function fmt(template: string, value: string): string {
  return template.replace('%s', value);
}

function validBookingID(value: string): boolean {
  return /^IUM-\d{4}-[A-Z2-9]{7}$/.test(value);
}

function clean(value: unknown, max = 256): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullableString(value: unknown): string | null {
  const text = clean(value);
  return text || null;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function encryptionKey(env: Env): Promise<CryptoKey> {
  const secret = clean(env.LINK_ENCRYPTION_KEY || env.IUMRAH_TELEGRAM_BRIDGE_SECRET || env.TELEGRAM_BOT_TOKEN, 1024);
  if (secret.length < 24) throw new Error("LINK_ENCRYPTION_KEY_NOT_CONFIGURED");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptSecret(env: Env, value: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(env), encoder.encode(value));
  return { ciphertext: base64Url(new Uint8Array(encrypted)), iv: base64Url(iv) };
}

async function decryptSecret(env: Env, ciphertext: string, iv: string): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(iv) },
    await encryptionKey(env),
    base64UrlToBytes(ciphertext),
  );
  return new TextDecoder().decode(plain);
}

function telegramApi(env: Env, method: string): string {
  return `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;
}

async function telegramCall<T = unknown>(env: Env, method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(telegramApi(env, method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as { ok?: boolean; result?: T; description?: string };
  if (!response.ok || body.ok !== true) throw new Error(`Telegram ${method} failed: ${body.description ?? response.statusText}`);
  return body.result as T;
}

async function sendMessage(env: Env, chatId: number, text: string, replyMarkup?: Record<string, unknown>): Promise<TelegramMessage> {
  return telegramCall<TelegramMessage>(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    protect_content: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function editMessage(env: Env, chatId: number, messageId: number, text: string, replyMarkup?: Record<string, unknown>): Promise<void> {
  await telegramCall(env, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function sendPhotoMessage(env: Env, chatId: number, photo: string, caption: string, replyMarkup?: Record<string, unknown>): Promise<TelegramMessage> {
  return telegramCall<TelegramMessage>(env, "sendPhoto", {
    chat_id: chatId,
    photo,
    caption,
    parse_mode: "HTML",
    protect_content: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function answerCallback(env: Env, callbackId: string, text?: string): Promise<void> {
  await telegramCall(env, "answerCallbackQuery", { callback_query_id: callbackId, ...(text ? { text } : {}) });
}

function botUX(locale: Locale): BotUXCopy {
  return BOT_UX[locale] ?? BOT_UX.ru;
}

function miniBaseURL(env: Env, runtimeBaseURL?: string): string {
  return clean(runtimeBaseURL || env.PUBLIC_BASE_URL, 512).replace(/\/+$/, "");
}

async function ensureBotUXSchema(env: Env): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS telegram_user_preferences (
      telegram_user_id INTEGER PRIMARY KEY,
      language TEXT NOT NULL DEFAULT 'ru',
      pinned_message_id INTEGER,
      updated_at TEXT NOT NULL
    )`,
  ).run();
}

async function getUserPreference(env: Env, telegramUserID: number): Promise<TelegramUserPreferenceRow | null> {
  await ensureBotUXSchema(env);
  return env.DB.prepare(
    `SELECT telegram_user_id, language, pinned_message_id, updated_at
     FROM telegram_user_preferences WHERE telegram_user_id=?1 LIMIT 1`,
  ).bind(telegramUserID).first<TelegramUserPreferenceRow>();
}

async function saveUserLocale(env: Env, telegramUserID: number, locale: Locale): Promise<void> {
  await ensureBotUXSchema(env);
  await env.DB.prepare(
    `INSERT INTO telegram_user_preferences(telegram_user_id, language, pinned_message_id, updated_at)
     VALUES (?1, ?2, NULL, ?3)
     ON CONFLICT(telegram_user_id) DO UPDATE SET language=excluded.language, updated_at=excluded.updated_at`,
  ).bind(telegramUserID, locale, new Date().toISOString()).run();
  await env.DB.prepare(
    `UPDATE telegram_bookings SET language=?1, updated_at=?2 WHERE telegram_user_id=?3`,
  ).bind(locale, new Date().toISOString(), telegramUserID).run();
}

async function savePinnedMessageID(env: Env, telegramUserID: number, locale: Locale, messageID: number): Promise<void> {
  await ensureBotUXSchema(env);
  await env.DB.prepare(
    `INSERT INTO telegram_user_preferences(telegram_user_id, language, pinned_message_id, updated_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(telegram_user_id) DO UPDATE SET language=excluded.language, pinned_message_id=excluded.pinned_message_id, updated_at=excluded.updated_at`,
  ).bind(telegramUserID, locale, messageID, new Date().toISOString()).run();
}

function languageKeyboard(current?: Locale): Record<string, unknown> {
  const label = (locale: Locale, text: string) => `${current === locale ? "✓ " : ""}${text}`;
  return {
    inline_keyboard: [
      [
        { text: label("ru", "Русский"), callback_data: "lang:ru" },
        { text: label("en", "English"), callback_data: "lang:en" },
      ],
      [
        { text: label("uz", "O‘zbekcha"), callback_data: "lang:uz" },
        { text: label("uz_cyrl", "Ўзбекча"), callback_data: "lang:uz_cyrl" },
      ],
    ],
  };
}

function pinnedKeyboard(env: Env, locale: Locale, runtimeBaseURL?: string): Record<string, unknown> {
  const copy = botUX(locale);
  const base = miniBaseURL(env, runtimeBaseURL);
  const rows: Record<string, unknown>[][] = [];
  if (base) rows.push([{ text: copy.openMini, web_app: { url: `${base}/mini` } }]);
  rows.push([
    { text: copy.status, callback_data: "home:status" },
    { text: copy.support, callback_data: "home:support" },
  ]);
  return { inline_keyboard: rows };
}

function persistentReplyKeyboard(env: Env, locale: Locale, runtimeBaseURL?: string): Record<string, unknown> {
  const copy = botUX(locale);
  const base = miniBaseURL(env, runtimeBaseURL);
  const rows: Record<string, unknown>[][] = [];
  if (base) rows.push([{ text: copy.openMini, web_app: { url: `${base}/mini` } }]);
  rows.push([{ text: copy.status }, { text: copy.support }]);
  return { keyboard: rows, resize_keyboard: true, is_persistent: true, input_field_placeholder: "iumrah" };
}

async function setMiniAppMenuButton(env: Env, chatID: number, locale: Locale, runtimeBaseURL?: string): Promise<void> {
  const base = miniBaseURL(env, runtimeBaseURL);
  if (!base) return;
  try {
    await telegramCall(env, "setChatMenuButton", {
      chat_id: chatID,
      menu_button: { type: "web_app", text: botUX(locale).openMini, web_app: { url: `${base}/mini` } },
    });
  } catch (error) {
    console.error("setChatMenuButton failed", chatID, error);
  }
}

async function sendLanguageSelector(env: Env, chatID: number, current?: Locale): Promise<void> {
  const copy = botUX(current ?? "ru");
  await sendMessage(env, chatID, `<b>${escapeHtml(copy.chooseLanguage)}</b>`, languageKeyboard(current));
}

async function ensurePinnedMiniAppMessage(env: Env, chatID: number, telegramUserID: number, locale: Locale, runtimeBaseURL?: string): Promise<void> {
  const copy = botUX(locale);
  const text = `<b>${escapeHtml(copy.pinnedTitle)}</b>\n\n${escapeHtml(copy.pinnedBody)}`;
  const pref = await getUserPreference(env, telegramUserID);
  const existing = Number(pref?.pinned_message_id || 0);
  if (existing > 0) {
    try {
      await editMessage(env, chatID, existing, text, pinnedKeyboard(env, locale, runtimeBaseURL));
      return;
    } catch (error) {
      console.error("edit pinned welcome failed", chatID, error);
    }
  }
  const message = await sendMessage(env, chatID, text, pinnedKeyboard(env, locale, runtimeBaseURL));
  await savePinnedMessageID(env, telegramUserID, locale, message.message_id);
  try {
    await telegramCall(env, "pinChatMessage", { chat_id: chatID, message_id: message.message_id, disable_notification: true });
  } catch (error) {
    console.error("pinChatMessage failed", chatID, error);
  }
}

async function sendBotHome(env: Env, chatID: number, telegramUserID: number, locale: Locale, runtimeBaseURL?: string, includeStatus = true): Promise<void> {
  const copy = botUX(locale);
  await setMiniAppMenuButton(env, chatID, locale, runtimeBaseURL);
  await ensurePinnedMiniAppMessage(env, chatID, telegramUserID, locale, runtimeBaseURL);
  await sendMessage(
    env,
    chatID,
    `<b>${escapeHtml(copy.welcomeTitle)}</b>\n\n${escapeHtml(copy.welcomeBody)}`,
    persistentReplyKeyboard(env, locale, runtimeBaseURL),
  );
  if (includeStatus) await showBookings(env, chatID, telegramUserID, runtimeBaseURL, locale);
}

async function sendSupportHome(env: Env, chatID: number, locale: Locale, runtimeBaseURL?: string): Promise<void> {
  const copy = botUX(locale);
  const base = miniBaseURL(env, runtimeBaseURL);
  const rows: Record<string, unknown>[][] = [];
  if (base) rows.push([{ text: copy.support, web_app: { url: `${base}/mini?tab=care` } }]);
  rows.push([{ text: copy.website, url: "https://iumrah.app" }]);
  await sendMessage(
    env,
    chatID,
    `<b>${escapeHtml(copy.supportTitle)}</b>\n\n${escapeHtml(copy.supportBody)}`,
    { inline_keyboard: rows },
  );
}

function parseTripPayload(value: unknown): ClientTripResponse | null {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;
  const tripValue = root.trip;
  if (!tripValue || typeof tripValue !== "object") return null;
  const trip = tripValue as Record<string, unknown>;
  const bookingID = clean(trip.bookingID);
  const status = clean(trip.status);
  if (!bookingID || !status) return null;
  const number = typeof trip.bookingNumber === "number" && Number.isFinite(trip.bookingNumber) ? trip.bookingNumber : null;
  const parsed: ClientTripSnapshot = {
    bookingID,
    bookingNumber: number,
    bookingDisplayNumber: nullableString(trip.bookingDisplayNumber),
    pilgrimID: nullableString(trip.pilgrimID),
    status,
    paymentStatus: nullableString(trip.paymentStatus),
    confirmationNumber: nullableString(trip.confirmationNumber),
    startDate: nullableString(trip.startDate),
    endDate: nullableString(trip.endDate),
    createdAt: nullableString(trip.createdAt),
    updatedAt: nullableString(trip.updatedAt),
    completedAt: nullableString(trip.completedAt),
    availabilityStartedAt: nullableString(trip.availabilityStartedAt),
    availabilityDeadlineAt: nullableString(trip.availabilityDeadlineAt),
    priceLockStartedAt: nullableString(trip.priceLockStartedAt),
    priceLockExpiresAt: nullableString(trip.priceLockExpiresAt),
    paymentReceivedAt: nullableString(trip.paymentReceivedAt),
    paymentConfirmationDeadlineAt: nullableString(trip.paymentConfirmationDeadlineAt),
    documentsStartedAt: nullableString(trip.documentsStartedAt),
    documentsDeadlineAt: nullableString(trip.documentsDeadlineAt),
  };
  const history = Array.isArray(root.statusHistory)
    ? root.statusHistory.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const newStatus = clean(row.newStatus);
        const createdAt = clean(row.createdAt);
        return newStatus && createdAt ? [{ oldStatus: nullableString(row.oldStatus), newStatus, createdAt }] : [];
      })
    : [];
  return { ok: root.ok === true, trip: parsed, statusHistory: history };
}

function parseWebBookingPayload(value: unknown): ClientTripResponse | null {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;
  const rawBooking = root.booking;
  if (!rawBooking || typeof rawBooking !== "object") return null;
  const booking = rawBooking as Record<string, unknown>;
  const bookingID = clean(booking.id ?? booking.bookingID, 64);
  const status = clean(booking.status, 64);
  if (!bookingID || !status) return null;
  const input = booking.input && typeof booking.input === "object" ? booking.input as Record<string, unknown> : {};
  const trip: ClientTripSnapshot = {
    bookingID,
    bookingNumber: null,
    bookingDisplayNumber: nullableString(booking.bookingDisplayNumber),
    status,
    paymentStatus: nullableString(booking.paymentStatus),
    confirmationNumber: nullableString(booking.confirmationNumber),
    startDate: nullableString(booking.startDate) ?? nullableString(input.startDate),
    endDate: nullableString(booking.endDate) ?? nullableString(input.endDate),
    createdAt: nullableString(booking.createdAt),
    updatedAt: nullableString(booking.updatedAt) ?? nullableString(booking.createdAt),
    completedAt: nullableString(booking.completedAt),
    availabilityStartedAt: nullableString(booking.availabilityStartedAt),
    availabilityDeadlineAt: nullableString(booking.availabilityDeadlineAt),
    priceLockStartedAt: nullableString(booking.priceLockStartedAt),
    priceLockExpiresAt: nullableString(booking.priceLockExpiresAt),
    paymentReceivedAt: nullableString(booking.paymentReceivedAt),
    paymentConfirmationDeadlineAt: nullableString(booking.paymentConfirmationDeadlineAt),
    documentsStartedAt: nullableString(booking.documentsStartedAt),
    documentsDeadlineAt: nullableString(booking.documentsDeadlineAt),
  };
  return { ok: true, trip, statusHistory: [] };
}

async function fetchTrip(env: Env, bookingID: string, bookingToken: string): Promise<ClientTripResponse> {
  const headers = { accept: "application/json", "x-booking-token": bookingToken };

  // Canonical operational status comes directly from the iumrah server.
  try {
    const response = await fetch(`${serverOrigin(env)}/api/catalog/hotels/client/trips/${encodeURIComponent(bookingID)}`, {
      method: "GET", headers, redirect: "manual",
    });
    if (response.ok) {
      const payload = parseTripPayload(await response.json());
      if (payload && payload.trip.bookingID === bookingID) return payload;
    }
    if (response.status === 404 || response.status === 401) throw new Error("BOOKING_NOT_FOUND");
    console.error("direct operational trip lookup failed", bookingID, response.status);
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_NOT_FOUND") throw error;
    console.error("direct operational trip request failed", bookingID, error);
  }

  // Compatibility read fallback. No website update is required; this only uses
  // the already-deployed GET route if the operational trip service is unavailable.
  const fallback = await fetchExistingWebRead(env, `/api/bookings/${encodeURIComponent(bookingID)}`, bookingToken);
  if (fallback.status === 200) {
    const payload = parseWebBookingPayload(fallback.body);
    if (payload && payload.trip.bookingID === bookingID) return payload;
    throw new Error("INVALID_BOOKING_RESPONSE");
  }
  if (fallback.status === 404 || fallback.status === 401) throw new Error("BOOKING_NOT_FOUND");
  throw new Error(`IUMRAH_API_${fallback.status}`);
}

function dateMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function transitionDate(history: StatusHistoryEntry[] | null | undefined, status: string): string | null {
  const target = status.trim().toLowerCase();
  const matches = (history ?? []).filter((item) => item.newStatus.trim().toLowerCase() === target);
  return matches.length ? matches[matches.length - 1].createdAt : null;
}

function deadline(explicit: string | null | undefined, start: string | null | undefined, seconds: number): string | null {
  const explicitMs = dateMs(explicit);
  if (explicitMs !== null) return new Date(explicitMs).toISOString();
  const startMs = dateMs(start);
  return startMs === null ? null : new Date(startMs + seconds * 1000).toISOString();
}

function lifecycle(payload: ClientTripResponse): Lifecycle {
  const trip = payload.trip;
  const status = trip.status.trim().toUpperCase();
  if (status === "NEW" || status === "AVAILABILITY_CHECK") {
    return {
      kind: "availability",
      deadlineAt: deadline(trip.availabilityDeadlineAt, trip.availabilityStartedAt || trip.createdAt, 6 * 60 * 60),
      title: "До максимального срока проверки",
    };
  }
  if (status === "PAYMENT_PENDING") {
    if (trip.paymentReceivedAt) {
      return {
        kind: "payment_confirmation",
        deadlineAt: deadline(trip.paymentConfirmationDeadlineAt, trip.paymentReceivedAt, 10 * 60),
        title: "Проверка оплаты",
      };
    }
    return {
      kind: "price_lock",
      deadlineAt: deadline(
        trip.priceLockExpiresAt,
        trip.priceLockStartedAt || transitionDate(payload.statusHistory, "payment_pending") || trip.updatedAt,
        30 * 60,
      ),
      title: "Цена зафиксирована ещё",
    };
  }
  if (status === "PAID" || status === "BOOKING_CONFIRMED") {
    return {
      kind: "documents",
      deadlineAt: deadline(
        trip.documentsDeadlineAt,
        trip.documentsStartedAt || transitionDate(payload.statusHistory, "booking_confirmed") || trip.updatedAt,
        24 * 60 * 60,
      ),
      title: "Подготовка документов",
    };
  }
  return { kind: "none", deadlineAt: null, title: "" };
}

function countdown(deadlineAt: string | null, now = Date.now()): string | null {
  const end = dateMs(deadlineAt);
  if (end === null) return null;
  const total = Math.max(0, Math.floor((end - now) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((item) => String(item).padStart(2, "0")).join(":");
}

function bookingReference(trip: ClientTripSnapshot): string {
  if (trip.bookingDisplayNumber) return trip.bookingDisplayNumber;
  if (typeof trip.bookingNumber === "number") return `#${String(Math.trunc(trip.bookingNumber)).padStart(4, "0")}`;
  return trip.bookingID;
}

function statusImageKey(status: string): keyof typeof STATUS_ASSETS {
  switch (status.trim().toUpperCase()) {
    case "NEW":
      return "new";
    case "AVAILABILITY_CHECK":
      return "checking";
    case "PAYMENT_PENDING":
      return "payment_pending";
    case "PAID":
    case "BOOKING_CONFIRMED":
      return "paid";
    case "DOCUMENTS_READY":
    case "READY_TO_TRAVEL":
      return "docs";
    case "IN_TRIP":
      return "in_trip";
    case "COMPLETED":
      return "completed";
    default:
      return "new";
  }
}

function statusCopy(locale: Locale, status: string, paymentStatus?: string | null): { title: string; body: string } {
  const copy = textFor(locale).statuses;
  switch (status.trim().toUpperCase()) {
    case "NEW":
      return copy.newBooking;
    case "AVAILABILITY_CHECK":
      return copy.checking;
    case "PAYMENT_PENDING":
      if (paymentStatus && /received|review|checking|submitted/i.test(paymentStatus)) return copy.paymentReceived;
      return copy.paymentWaiting;
    case "PAID":
    case "BOOKING_CONFIRMED":
      return copy.confirmed;
    case "DOCUMENTS_READY":
    case "READY_TO_TRAVEL":
      return copy.ready;
    case "IN_TRIP":
      return copy.inTrip;
    case "COMPLETED":
      return copy.completed;
    default:
      return { title: copy.fallbackTitle, body: `${copy.fallbackTitle}: ${status}` };
  }
}

function lifecycleTitle(locale: Locale, kind: Lifecycle["kind"]): string {
  const labels = textFor(locale).lifecycle;
  switch (kind) {
    case "availability": return labels.availability;
    case "price_lock": return labels.price_lock;
    case "payment_confirmation": return labels.payment_confirmation;
    case "documents": return labels.documents;
    default: return "";
  }
}

function bookingKeyboard(env: Env, bookingID: string, locale: Locale, runtimeBaseURL?: string): Record<string, unknown> {
  const statusStrings = textFor(locale).actions;
  const ux = botUX(locale);
  const rows: Record<string, unknown>[][] = [];
  const configuredBase = miniBaseURL(env, runtimeBaseURL);
  if (configuredBase) {
    rows.push([{ text: ux.openMini, web_app: { url: `${configuredBase}/mini?booking=${encodeURIComponent(bookingID)}` } }]);
    rows.push([
      { text: statusStrings.refresh, callback_data: `refresh:${bookingID}` },
      { text: ux.support, web_app: { url: `${configuredBase}/mini?booking=${encodeURIComponent(bookingID)}&tab=care` } },
    ]);
  } else {
    rows.push([{ text: statusStrings.refresh, callback_data: `refresh:${bookingID}` }]);
  }
  rows.push([{ text: ux.website, url: "https://iumrah.app/account" }]);
  return { inline_keyboard: rows };
}

function bookingMessage(env: Env, payload: ClientTripResponse, locale: Locale): string {
  const trip = payload.trip;
  const strings = textFor(locale);
  const phase = lifecycle(payload);
  const left = countdown(phase.deadlineAt);
  const copy = statusCopy(locale, trip.status, trip.paymentStatus);
  const lines = [
    `<b>${escapeHtml(copy.title)}</b>`,
    '',
    `${escapeHtml(strings.generic.booking)}: <code>${escapeHtml(bookingReference(trip))}</code>`,
    trip.startDate && trip.endDate ? `${escapeHtml(strings.generic.dates)}: ${escapeHtml(trip.startDate)} — ${escapeHtml(trip.endDate)}` : '',
    trip.confirmationNumber ? `${escapeHtml(strings.generic.confirmation)}: <code>${escapeHtml(trip.confirmationNumber)}</code>` : '',
    '',
    escapeHtml(copy.body),
  ].filter(Boolean);
  if (phase.kind !== 'none' && left) {
    const expired = dateMs(phase.deadlineAt) !== null && (dateMs(phase.deadlineAt) as number) <= Date.now();
    lines.push('', `<b>${escapeHtml(expired ? strings.generic.stageExpired : lifecycleTitle(locale, phase.kind))}</b>`, `<code>${left}</code>`);
  }
  lines.push('', `<i>${escapeHtml(strings.generic.synced)}</i>`);
  return lines.join('\n');
}

function statusImageURL(baseURL: string | undefined, payload: ClientTripResponse): string | null {
  const base = clean(baseURL, 512).replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/status-image/${statusImageKey(payload.trip.status)}.webp`;
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function serveStatusImage(key: string): Response {
  const asset = STATUS_ASSETS[key as keyof typeof STATUS_ASSETS];
  if (!asset) return new Response('Not found', { status: 404 });
  return new Response(decodeBase64(asset.data), {
    headers: {
      'content-type': asset.contentType,
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}

async function sendStatusCard(env: Env, chatId: number, payload: ClientTripResponse, locale: Locale, runtimeBaseURL?: string): Promise<void> {
  const caption = bookingMessage(env, payload, locale);
  const photo = statusImageURL(runtimeBaseURL || env.PUBLIC_BASE_URL, payload);
  if (photo) {
    await sendPhotoMessage(env, chatId, photo, caption, bookingKeyboard(env, payload.trip.bookingID, locale, runtimeBaseURL));
    return;
  }
  await sendMessage(env, chatId, caption, bookingKeyboard(env, payload.trip.bookingID, locale, runtimeBaseURL));
}

function requireBridge(request: Request, env: Env): boolean {
  const secret = clean(env.IUMRAH_TELEGRAM_BRIDGE_SECRET, 1024);
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}` || request.headers.get("x-iumrah-bridge-secret") === secret;
}

async function createLinkToken(request: Request, env: Env): Promise<Response> {
  // The existing high-entropy booking token is the authorization proof for linking.
  // The Worker validates it against the canonical iUmrah trip API before creating a one-time Telegram link.
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return json({ error: "INVALID_REQUEST" }, 400); }
  const bookingID = clean(body.bookingId ?? body.bookingID, 64);
  const bookingToken = clean(body.bookingToken ?? body.accessToken, 256);
  const language = normalizeLocale(clean(body.language, 16) || "ru");
  if (!validBookingID(bookingID) || bookingToken.length < 24) return json({ error: "INVALID_BOOKING" }, 400);

  // Do not call iumrah Web from this nested web -> bot request. The link is
  // only a short-lived claim ticket; the booking token is validated when the
  // user actually claims it in Telegram (bot -> iumrah Web via Service Binding).
  // Invalid/spoofed tokens therefore never become linked bookings and expose no data.

  const raw = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(raw);
  const encrypted = await encryptSecret(env, bookingToken);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + LINK_TTL_SECONDS * 1000).toISOString();
  await env.DB.prepare(
    `INSERT OR REPLACE INTO telegram_link_tokens
      (token_hash, booking_id, booking_token_ciphertext, booking_token_iv, language, created_at, expires_at, used_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL)`,
  ).bind(tokenHash, bookingID, encrypted.ciphertext, encrypted.iv, language, createdAt, expiresAt).run();

  let username = clean(env.TELEGRAM_BOT_USERNAME, 64).replace(/^@/, "");
  if (!username) {
    try {
      const me = await telegramCall<{ username?: string }>(env, "getMe", {});
      username = clean(me?.username, 64).replace(/^@/, "");
    } catch {
      username = "";
    }
  }
  const startParameter = `link_${raw}`;
  const linkUrl = username ? `https://t.me/${username}?start=${startParameter}` : null;
  return json({ ok: true, booking: { bookingID, bookingDisplayNumber: null }, startParameter, linkUrl, expiresAt });
}

async function claimLinkToken(env: Env, message: TelegramMessage, user: TelegramUser, rawToken: string, runtimeBaseURL?: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{32,60}$/.test(rawToken)) return false;
  const hash = await sha256Hex(rawToken);
  const row = await env.DB.prepare(
    `SELECT token_hash, booking_id, booking_token_ciphertext, booking_token_iv, language, expires_at, used_at
     FROM telegram_link_tokens WHERE token_hash=?1 LIMIT 1`,
  ).bind(hash).first<{
    token_hash: string; booking_id: string; booking_token_ciphertext: string; booking_token_iv: string;
    language: string | null; expires_at: string; used_at: string | null;
  }>();
  if (!row || row.used_at || Date.parse(row.expires_at) <= Date.now()) return false;

  const bookingToken = await decryptSecret(env, row.booking_token_ciphertext, row.booking_token_iv);
  let payload: ClientTripResponse;
  try { payload = await fetchTrip(env, row.booking_id, bookingToken); }
  catch { return false; }
  const locale = normalizeLocale(row.language || user.language_code || 'ru');
  const strings = textFor(locale);
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO telegram_bookings
        (telegram_user_id, chat_id, booking_id, booking_token_ciphertext, booking_token_iv, language,
         last_status, last_payment_status, last_confirmation_number, notifications_enabled, linked_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?10)
       ON CONFLICT(telegram_user_id, booking_id) DO UPDATE SET
         chat_id=excluded.chat_id,
         booking_token_ciphertext=excluded.booking_token_ciphertext,
         booking_token_iv=excluded.booking_token_iv,
         language=excluded.language,
         last_status=excluded.last_status,
         last_payment_status=excluded.last_payment_status,
         last_confirmation_number=excluded.last_confirmation_number,
         notifications_enabled=1,
         updated_at=excluded.updated_at`,
    ).bind(
      user.id, message.chat.id, row.booking_id, row.booking_token_ciphertext, row.booking_token_iv, locale,
      payload.trip.status, payload.trip.paymentStatus ?? null, payload.trip.confirmationNumber ?? null, now,
    ),
    env.DB.prepare("UPDATE telegram_link_tokens SET used_at=?1 WHERE token_hash=?2 AND used_at IS NULL").bind(now, hash),
  ]);

  await saveUserLocale(env, user.id, locale);
  await setMiniAppMenuButton(env, message.chat.id, locale, runtimeBaseURL);
  await ensurePinnedMiniAppMessage(env, message.chat.id, user.id, locale, runtimeBaseURL);
  await sendMessage(
    env,
    message.chat.id,
    `<b>${escapeHtml(strings.generic.linkSuccessTitle)}</b>

${escapeHtml(fmt(strings.generic.linkSuccessBody, bookingReference(payload.trip)))}` ,
    persistentReplyKeyboard(env, locale, runtimeBaseURL),
  );
  await sendStatusCard(env, message.chat.id, payload, locale, runtimeBaseURL);
  return true;
}

async function linkedRowsForUser(env: Env, userID: number): Promise<LinkedBookingRow[]> {
  const result = await env.DB.prepare(
    `SELECT telegram_user_id, chat_id, booking_id, booking_token_ciphertext, booking_token_iv, language,
            last_status, last_payment_status, last_confirmation_number, notifications_enabled
     FROM telegram_bookings WHERE telegram_user_id=?1 ORDER BY updated_at DESC LIMIT 10`,
  ).bind(userID).all<LinkedBookingRow>();
  return result.results ?? [];
}

async function showBookings(env: Env, chatId: number, userID: number, runtimeBaseURL?: string, preferredLocale?: Locale): Promise<void> {
  const rows = await linkedRowsForUser(env, userID);
  const locale = preferredLocale ?? normalizeLocale(rows[0]?.language || 'ru');
  const strings = textFor(locale);
  if (!rows.length) {
    await sendMessage(
      env,
      chatId,
      `<b>${escapeHtml(strings.generic.bookingNotLinkedTitle)}</b>

${escapeHtml(strings.generic.bookingNotLinkedBody)}`,
      persistentReplyKeyboard(env, locale, runtimeBaseURL),
    );
    return;
  }
  for (const row of rows.slice(0, 3)) {
    const rowLocale = preferredLocale ?? normalizeLocale(row.language || locale);
    const rowStrings = textFor(rowLocale);
    try {
      const token = await decryptSecret(env, row.booking_token_ciphertext, row.booking_token_iv);
      const payload = await fetchTrip(env, row.booking_id, token);
      await sendStatusCard(env, chatId, payload, rowLocale, runtimeBaseURL);
    } catch {
      await sendMessage(env, chatId, `<b>${escapeHtml(rowStrings.generic.updateFailedTitle)}</b>

<code>${escapeHtml(row.booking_id)}</code>
${escapeHtml(rowStrings.generic.reconnectPrompt)}`);
    }
  }
}

async function refreshBooking(env: Env, callback: TelegramCallbackQuery, bookingID: string, runtimeBaseURL?: string): Promise<void> {
  const message = callback.message;
  if (!message) return;
  const row = await env.DB.prepare(
    `SELECT telegram_user_id, chat_id, booking_id, booking_token_ciphertext, booking_token_iv, language,
            last_status, last_payment_status, last_confirmation_number, notifications_enabled
     FROM telegram_bookings WHERE telegram_user_id=?1 AND booking_id=?2 LIMIT 1`,
  ).bind(callback.from.id, bookingID).first<LinkedBookingRow>();
  const locale = normalizeLocale(row?.language || callback.from.language_code || 'ru');
  const strings = textFor(locale);
  if (!row) { await answerCallback(env, callback.id, strings.generic.callbackNotLinked); return; }
  try {
    const token = await decryptSecret(env, row.booking_token_ciphertext, row.booking_token_iv);
    const payload = await fetchTrip(env, bookingID, token);
    await sendStatusCard(env, message.chat.id, payload, locale, runtimeBaseURL);
    await env.DB.prepare(
      `UPDATE telegram_bookings SET last_status=?1,last_payment_status=?2,last_confirmation_number=?3,updated_at=?4
       WHERE telegram_user_id=?5 AND booking_id=?6`,
    ).bind(payload.trip.status, payload.trip.paymentStatus ?? null, payload.trip.confirmationNumber ?? null, new Date().toISOString(), callback.from.id, bookingID).run();
    await answerCallback(env, callback.id, strings.generic.callbackUpdated);
  } catch {
    await answerCallback(env, callback.id, strings.generic.callbackRefreshFailed);
  }
}

async function handleCallback(env: Env, callback: TelegramCallbackQuery, runtimeBaseURL?: string): Promise<void> {
  const data = clean(callback.data, 128);
  const message = callback.message;
  const chatID = message?.chat.id;
  if (data.startsWith("lang:")) {
    if (!chatID) return;
    const raw = data.slice("lang:".length);
    const locale = (["ru", "en", "uz", "uz_cyrl"] as Locale[]).includes(raw as Locale) ? raw as Locale : "ru";
    await saveUserLocale(env, callback.from.id, locale);
    await answerCallback(env, callback.id, botUX(locale).languageSaved);
    try {
      await editMessage(env, chatID, message.message_id, `<b>${escapeHtml(botUX(locale).languageSaved)}</b>`, languageKeyboard(locale));
    } catch { /* message may be too old or unchanged */ }
    await sendBotHome(env, chatID, callback.from.id, locale, runtimeBaseURL, true);
    return;
  }
  if (data === "home:status") {
    if (!chatID) return;
    const pref = await getUserPreference(env, callback.from.id);
    const locale = normalizeLocale(pref?.language || callback.from.language_code || "ru");
    await answerCallback(env, callback.id);
    await showBookings(env, chatID, callback.from.id, runtimeBaseURL, locale);
    return;
  }
  if (data === "home:support") {
    if (!chatID) return;
    const pref = await getUserPreference(env, callback.from.id);
    const locale = normalizeLocale(pref?.language || callback.from.language_code || "ru");
    await answerCallback(env, callback.id);
    await sendSupportHome(env, chatID, locale, runtimeBaseURL);
    return;
  }
  if (data.startsWith("refresh:")) {
    await refreshBooking(env, callback, data.slice("refresh:".length), runtimeBaseURL);
    return;
  }
  await answerCallback(env, callback.id);
}

async function handleMessage(env: Env, message: TelegramMessage, runtimeBaseURL?: string): Promise<void> {
  const text = message.text?.trim();
  if (!text || !message.from) return;
  const pref = await getUserPreference(env, message.from.id);
  const savedLocale = normalizeLocale(pref?.language || message.from.language_code || 'ru');
  const strings = textFor(savedLocale);
  const ux = botUX(savedLocale);
  const start = text.match(/^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]+))?$/i);
  if (start) {
    const parameter = start[1] ?? '';
    if (parameter.startsWith('link_')) {
      const ok = await claimLinkToken(env, message, message.from, parameter.slice(5), runtimeBaseURL);
      if (!ok) {
        await sendMessage(env, message.chat.id, `<b>${escapeHtml(strings.generic.linkExpiredTitle)}</b>\n\n${escapeHtml(strings.generic.linkExpiredBody)}`);
      }
      return;
    }
    await sendLanguageSelector(env, message.chat.id, pref ? savedLocale : undefined);
    return;
  }
  if (/^\/language(?:@\w+)?$/i.test(text)) {
    await sendLanguageSelector(env, message.chat.id, savedLocale);
    return;
  }
  if (/^\/(booking|status)(?:@\w+)?$/i.test(text) || text === ux.status || Object.values(BOT_UX).some(v => v.status === text)) {
    await showBookings(env, message.chat.id, message.from.id, runtimeBaseURL, savedLocale);
    return;
  }
  if (text === ux.support || Object.values(BOT_UX).some(v => v.support === text)) {
    await sendSupportHome(env, message.chat.id, savedLocale, runtimeBaseURL);
    return;
  }
  if (/^\/help(?:@\w+)?$/i.test(text)) {
    await sendMessage(
      env,
      message.chat.id,
      `<b>${escapeHtml(strings.generic.helpTitle)}</b>\n\n${escapeHtml(strings.generic.helpBody)}\n/language — Language`,
      persistentReplyKeyboard(env, savedLocale, runtimeBaseURL),
    );
    return;
  }
  await sendBotHome(env, message.chat.id, message.from.id, savedLocale, runtimeBaseURL, false);
}

async function handleUpdate(env: Env, update: TelegramUpdate, runtimeBaseURL?: string): Promise<void> {
  if (update.callback_query) return handleCallback(env, update.callback_query, runtimeBaseURL);
  if (update.message) return handleMessage(env, update.message, runtimeBaseURL);
}

function changed(row: LinkedBookingRow, trip: ClientTripSnapshot): boolean {
  return (row.last_status ?? "") !== trip.status ||
    (row.last_payment_status ?? "") !== (trip.paymentStatus ?? "") ||
    (row.last_confirmation_number ?? "") !== (trip.confirmationNumber ?? "");
}

async function reconcileRow(env: Env, row: LinkedBookingRow, force = false, runtimeBaseURL?: string): Promise<void> {
  if (!row.notifications_enabled) return;
  const token = await decryptSecret(env, row.booking_token_ciphertext, row.booking_token_iv);
  const payload = await fetchTrip(env, row.booking_id, token);
  const locale = normalizeLocale(row.language || 'ru');
  if (force || changed(row, payload.trip)) {
    await sendStatusCard(env, row.chat_id, payload, locale, runtimeBaseURL);
  }
  await env.DB.prepare(
    `UPDATE telegram_bookings SET last_status=?1,last_payment_status=?2,last_confirmation_number=?3,updated_at=?4
     WHERE telegram_user_id=?5 AND booking_id=?6`,
  ).bind(
    payload.trip.status,
    payload.trip.paymentStatus ?? null,
    payload.trip.confirmationNumber ?? null,
    new Date().toISOString(),
    row.telegram_user_id,
    row.booking_id,
  ).run();
}

async function reconcileAll(env: Env): Promise<void> {
  await env.DB.prepare("DELETE FROM telegram_link_tokens WHERE expires_at<?1 OR used_at IS NOT NULL").bind(new Date(Date.now() - 86400000).toISOString()).run();
  const config = await env.DB.prepare("SELECT value FROM bot_config WHERE key='public_base_url' LIMIT 1").first<{ value: string }>();
  const runtimeBaseURL = clean(env.PUBLIC_BASE_URL || config?.value, 512).replace(/\/+$/, "");
  const result = await env.DB.prepare(
    `SELECT telegram_user_id, chat_id, booking_id, booking_token_ciphertext, booking_token_iv, language,
            last_status, last_payment_status, last_confirmation_number, notifications_enabled
     FROM telegram_bookings WHERE notifications_enabled=1 ORDER BY updated_at ASC LIMIT 100`,
  ).all<LinkedBookingRow>();
  for (const row of result.results ?? []) {
    try { await reconcileRow(env, row, false, runtimeBaseURL); } catch (error) { console.error("reconcile failed", row.booking_id, error); }
  }
}

async function bookingEvent(request: Request, env: Env): Promise<Response> {
  if (!requireBridge(request, env)) return json({ error: "UNAUTHORIZED" }, 401);
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return json({ error: "INVALID_REQUEST" }, 400); }
  const bookingID = clean(body.bookingId ?? body.bookingID, 64);
  if (!validBookingID(bookingID)) return json({ error: "INVALID_BOOKING" }, 400);
  const result = await env.DB.prepare(
    `SELECT telegram_user_id, chat_id, booking_id, booking_token_ciphertext, booking_token_iv, language,
            last_status, last_payment_status, last_confirmation_number, notifications_enabled
     FROM telegram_bookings WHERE booking_id=?1 AND notifications_enabled=1`,
  ).bind(bookingID).all<LinkedBookingRow>();
  let sent = 0;
  for (const row of result.results ?? []) {
    try { await reconcileRow(env, row, false, new URL(request.url).origin); sent += 1; } catch (error) { console.error("booking event failed", bookingID, error); }
  }
  return json({ ok: true, bookingID, sent });
}

async function hmac(keyBytes: ArrayBuffer | Uint8Array, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function validateTelegramInitData(env: Env, initData: string): Promise<TelegramUser | null> {
  if (!initData || initData.length > 8192) return null;
  const params = new URLSearchParams(initData);
  const expectedHash = params.get("hash")?.toLowerCase() ?? "";
  if (!/^[0-9a-f]{64}$/.test(expectedHash)) return null;
  const entries = Array.from(params.entries()).filter(([key]) => key !== "hash").sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join("\n");
  const secretKey = await hmac(encoder.encode("WebAppData"), env.TELEGRAM_BOT_TOKEN);
  const actualHash = bytesToHex(await hmac(secretKey, dataCheckString));
  if (actualHash !== expectedHash) return null;
  const authDate = Number(params.get("auth_date") ?? 0);
  if (!Number.isFinite(authDate) || Math.abs(Date.now() / 1000 - authDate) > MINI_INIT_MAX_AGE_SECONDS) return null;
  const rawUser = params.get("user");
  if (!rawUser) return null;
  try {
    const user = JSON.parse(rawUser) as TelegramUser;
    return typeof user.id === "number" && Number.isFinite(user.id) ? user : null;
  } catch { return null; }
}

function miniHTML(): string {
  return bookingMiniV7HTML();
}

function serveMiniAsset(key: string): Response {
  const asset = MINI_ASSETS[key as keyof typeof MINI_ASSETS];
  if (!asset) return new Response("Not found", { status: 404 });
  return new Response(decodeBase64(asset.data), {
    headers: { "content-type": asset.contentType, "cache-control": "public, max-age=31536000, immutable" },
  });
}

function serverOrigin(env: Env): string {
  return normalizeOrigin(env.IUMRAH_API_ORIGIN);
}

async function fetchServerJSON(env: Env, path: string, bookingToken: string, init?: RequestInit): Promise<{ status: number; body: any }> {
  const headers = new Headers(init?.headers || {});
  headers.set("accept", "application/json");
  if (bookingToken) headers.set("x-booking-token", bookingToken);
  if (init?.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  try {
    const response = await fetch(`${serverOrigin(env)}${path}`, { ...init, headers, redirect: "manual" });
    let body: any = null;
    try { body = await response.json(); } catch { body = null; }
    return { status: response.status, body };
  } catch (error) {
    console.error("iumrah direct server request failed", path, error);
    return { status: 502, body: { error: "IUMRAH_SERVER_UNREACHABLE" } };
  }
}

async function fetchPackageServerJSON(env: Env, path: string, bookingToken: string, init?: RequestInit): Promise<{ status: number; body: any }> {
  const headers = new Headers(init?.headers || {});
  headers.set("accept", "application/json");
  if (bookingToken) headers.set("x-booking-token", bookingToken);
  if (init?.body && !headers.has("content-type")) headers.set("content-type", "application/json");

  if (env.IUMRAH_PACKAGE_API && typeof env.IUMRAH_PACKAGE_API.fetch === "function") {
    try {
      const response = await env.IUMRAH_PACKAGE_API.fetch(new Request(`https://iumrah-package-api.internal${path}`, { ...init, headers, redirect: "manual" }));
      let body: any = null;
      try { body = await response.json(); } catch { body = null; }
      return { status: response.status, body };
    } catch (error) {
      console.error("iumrah PackageEngine service binding failed; trying public server", path, error);
    }
  }
  return fetchServerJSON(env, path, bookingToken, init);
}

async function fetchExistingWebRead(env: Env, path: string, bookingToken: string, init?: RequestInit): Promise<{ status: number; body: any }> {
  // Existing web read routes remain a compatibility fallback only. V7.5 does not
  // require any website code changes and all booking mutations go directly to
  // PackageEngine / Hotels backend routes.
  if (!env.IUMRAH_WEB || typeof env.IUMRAH_WEB.fetch !== "function") {
    return fetchServerJSON(env, path, bookingToken, init);
  }
  const headers = new Headers(init?.headers || {});
  headers.set("accept", "application/json");
  if (bookingToken) headers.set("x-booking-token", bookingToken);
  if (init?.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  try {
    const response = await env.IUMRAH_WEB.fetch(new Request(`https://iumrah-web.internal${path}`, { ...init, headers, redirect: "manual" }));
    let body: any = null;
    try { body = await response.json(); } catch { body = null; }
    return { status: response.status, body };
  } catch {
    return fetchServerJSON(env, path, bookingToken, init);
  }
}

async function miniBookingBundle(env: Env, row: LinkedBookingRow): Promise<any | null> {
  try {
    const token = await decryptSecret(env, row.booking_token_ciphertext, row.booking_token_iv);
    const primary = await fetchExistingWebRead(env, `/api/bookings/${encodeURIComponent(row.booking_id)}`, token);
    if (primary.status !== 200 || !primary.body?.booking) return null;
    const payload = await fetchTrip(env, row.booking_id, token);
    const optional = async (path: string) => {
      try {
        const result = await fetchServerJSON(env, path, token);
        return result.status === 200 ? result.body : null;
      } catch { return null; }
    };
    const makkahHotelID = clean(primary.body.booking?.hotelSelection?.hotelId, 128);
    const madinahHotelID = clean(primary.body.booking?.madinahHotelSelection?.hotelId, 128);
    const [checkout, itinerary, security, makkahHotel, madinahHotel] = await Promise.all([
      optional(`/api/catalog/hotels/client/trips/${encodeURIComponent(row.booking_id)}/checkout`),
      optional(`/api/catalog/hotels/client/trips/${encodeURIComponent(row.booking_id)}/itinerary`),
      optional(`/api/catalog/hotels/client/trips/${encodeURIComponent(row.booking_id)}/security`),
      makkahHotelID ? optional(`/api/catalog/hotels/${encodeURIComponent(makkahHotelID)}`) : Promise.resolve(null),
      madinahHotelID ? optional(`/api/catalog/hotels/${encodeURIComponent(madinahHotelID)}`) : Promise.resolve(null),
    ]);
    return {
      reference: bookingReference(payload.trip),
      booking: primary.body.booking,
      trip: payload.trip,
      lifecycle: lifecycle(payload),
      guide: (payload as any).assignment?.guide ?? null,
      checkout: checkout && checkout.ok !== false ? checkout : null,
      itinerary: Array.isArray(itinerary?.items) ? itinerary.items : [],
      security: security?.confirmation ?? null,
      hotelDetails: {
        makkah: makkahHotel && makkahHotel.ok !== false ? makkahHotel : null,
        madinah: madinahHotel && madinahHotel.ok !== false ? madinahHotel : null,
      },
    };
  } catch { return null; }
}

async function miniBootstrap(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return json({ error: "INVALID_REQUEST" }, 400); }
  const user = await validateTelegramInitData(env, clean(body.initData, 8192));
  if (!user) return json({ error: "TELEGRAM_AUTH_FAILED" }, 401);
  const rows = await linkedRowsForUser(env, user.id);
  if (!rows.length) return json({ error: "BOOKING_NOT_LINKED" }, 404);
  const locale = normalizeLocale(rows[0]?.language || user.language_code || "ru");
  const bundles: any[] = [];
  for (const row of rows.slice(0, 10)) {
    const bundle = await miniBookingBundle(env, row);
    if (bundle) bundles.push(bundle);
  }
  if (!bundles.length) return json({ error: "BOOKING_REFRESH_FAILED" }, 502);
  let careProfile: any = null;
  try {
    const token = await decryptSecret(env, rows[0].booking_token_ciphertext, rows[0].booking_token_iv);
    const team = await fetchServerJSON(env, "/api/catalog/hotels/team", token);
    const members = Array.isArray(team.body?.members) ? team.body.members : [];
    careProfile = members.find((member: any) => member?.isOwner === true) || members[0] || null;
  } catch { careProfile = null; }
  return json({ ok: true, locale, bookings: bundles, careProfile });
}

async function miniHotelContext(request: Request, env: Env): Promise<{ user: TelegramUser; row: LinkedBookingRow; token: string; body: Record<string, unknown> } | Response> {
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return json({ error: "INVALID_REQUEST" }, 400); }
  const user = await validateTelegramInitData(env, clean(body.initData, 8192));
  if (!user) return json({ error: "TELEGRAM_AUTH_FAILED" }, 401);
  const bookingID = clean(body.bookingId, 64);
  if (!validBookingID(bookingID)) return json({ error: "INVALID_BOOKING" }, 400);
  const row = await env.DB.prepare(
    `SELECT telegram_user_id, chat_id, booking_id, booking_token_ciphertext, booking_token_iv, language,
            last_status, last_payment_status, last_confirmation_number, notifications_enabled
     FROM telegram_bookings WHERE telegram_user_id=?1 AND booking_id=?2 LIMIT 1`,
  ).bind(user.id, bookingID).first<LinkedBookingRow>();
  if (!row) return json({ error: "BOOKING_NOT_LINKED" }, 404);
  const token = await decryptSecret(env, row.booking_token_ciphertext, row.booking_token_iv);
  return { user, row, token, body };
}

async function miniHotels(request: Request, env: Env): Promise<Response> {
  const context = await miniHotelContext(request, env);
  if (context instanceof Response) return context;
  const role = clean(context.body.role, 16).toLowerCase();
  if (role !== "makkah" && role !== "madinah") return json({ error: "INVALID_HOTEL_ROLE" }, 400);
  const city = role === "madinah" ? "Madinah" : "Makkah";
  const result = await fetchServerJSON(env, `/api/catalog/hotels?city=${encodeURIComponent(city)}`, context.token);
  if (result.status < 200 || result.status >= 300) return json({ error: result.body?.error || `HOTEL_LIST_${result.status}` }, result.status || 502);
  return json({ ok: true, role, hotels: Array.isArray(result.body?.hotels) ? result.body.hotels : [] });
}

async function miniHotel(request: Request, env: Env): Promise<Response> {
  const context = await miniHotelContext(request, env);
  if (context instanceof Response) return context;
  const hotelID = clean(context.body.hotelId, 128);
  if (!hotelID) return json({ error: "INVALID_HOTEL" }, 400);
  const [detail, categories] = await Promise.all([
    fetchServerJSON(env, `/api/catalog/hotels/${encodeURIComponent(hotelID)}`, context.token),
    fetchPackageServerJSON(env, `/api/package/hotel/${encodeURIComponent(hotelID)}/room-categories`, context.token),
  ]);
  if (detail.status < 200 || detail.status >= 300 || !detail.body?.hotel) return json({ error: detail.body?.error || `HOTEL_DETAIL_${detail.status}` }, detail.status || 502);
  return json({ ok: true, hotel: detail.body.hotel, categories: Array.isArray(categories.body?.categories) ? categories.body.categories : [] });
}

async function miniAction(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return json({ error: "INVALID_REQUEST" }, 400); }
  const user = await validateTelegramInitData(env, clean(body.initData, 8192));
  if (!user) return json({ error: "TELEGRAM_AUTH_FAILED" }, 401);
  const bookingID = clean(body.bookingId, 64);
  if (!validBookingID(bookingID)) return json({ error: "INVALID_BOOKING" }, 400);
  const row = await env.DB.prepare(
    `SELECT telegram_user_id, chat_id, booking_id, booking_token_ciphertext, booking_token_iv, language,
            last_status, last_payment_status, last_confirmation_number, notifications_enabled
     FROM telegram_bookings WHERE telegram_user_id=?1 AND booking_id=?2 LIMIT 1`,
  ).bind(user.id, bookingID).first<LinkedBookingRow>();
  if (!row) return json({ error: "BOOKING_NOT_LINKED" }, 404);
  const token = await decryptSecret(env, row.booking_token_ciphertext, row.booking_token_iv);
  const action = clean(body.action, 64);
  const payload = body.payload && typeof body.payload === "object" ? body.payload as Record<string, unknown> : {};
  let result: { status: number; body: any };
  if (action === "contacts") {
    result = await fetchPackageServerJSON(env, `/api/package/booking/${encodeURIComponent(bookingID)}/contact`, token, {
      method: "PATCH", body: JSON.stringify({ telegram: clean(payload.telegram, 128), whatsapp: clean(payload.whatsapp, 128) }),
    });
  } else if (action === "customization") {
    const out: Record<string, boolean> = {};
    for (const key of ["ziyaratMakkah", "ziyaratMadinah", "esim"]) if (typeof payload[key] === "boolean") out[key] = payload[key] as boolean;
    if (!Object.keys(out).length) return json({ error: "INVALID_CUSTOMIZATION" }, 400);
    result = await fetchPackageServerJSON(env, `/api/package/booking/${encodeURIComponent(bookingID)}/customization`, token, { method: "PATCH", body: JSON.stringify(out) });
  } else if (action === "hotel") {
    const role = clean(payload.role, 16).toLowerCase();
    const hotelID = clean(payload.hotelId, 128);
    const roomID = clean(payload.roomId, 128);
    const categoryID = clean(payload.categoryId, 128);
    if ((role !== "makkah" && role !== "madinah") || !hotelID) return json({ error: "INVALID_HOTEL_SELECTION" }, 400);
    const detail = await fetchServerJSON(env, `/api/catalog/hotels/${encodeURIComponent(hotelID)}`, token);
    if (detail.status !== 200 || !detail.body?.hotel) return json({ error: detail.body?.error || "HOTEL_NOT_FOUND" }, detail.status || 404);
    const hotel = detail.body.hotel as Record<string, any>;
    const rooms = Array.isArray(hotel.rooms) ? hotel.rooms : [];
    const room = roomID ? rooms.find((item: any) => clean(item?.id, 128) === roomID) : null;
    let category: any = null;
    if (categoryID) {
      const categories = await fetchPackageServerJSON(env, `/api/package/hotel/${encodeURIComponent(hotelID)}/room-categories`, token);
      category = Array.isArray(categories.body?.categories) ? categories.body.categories.find((item: any) => clean(item?.id, 128) === categoryID) : null;
      if (!category) return json({ error: "ROOM_CATEGORY_NOT_FOUND" }, 404);
    }
    if (roomID && !room) return json({ error: "ROOM_NOT_FOUND" }, 404);
    const images = Array.isArray(hotel.images) ? hotel.images : [];
    const cover = images.find((item: any) => item?.isCover === true)?.url || images[0]?.url || null;
    const updateBody = {
      role,
      hotelId: clean(hotel.id, 128),
      coverImageURL: cover,
      roomId: room ? clean(room.id, 128) || null : null,
      roomName: room ? clean(room.name, 256) || null : category ? clean(category.displayName, 256) || null : null,
      roomBeds: room ? clean(room.beds, 256) || null : category ? clean(category.bedConfiguration, 256) || null : null,
      roomSizeM2: room && typeof room.sizeM2 === "number" ? room.sizeM2 : null,
      roomMaxGuests: room && typeof room.maxGuests === "number" ? room.maxGuests : category && typeof category.maxGuests === "number" ? category.maxGuests : null,
      roomCategory: category ? clean(category.category, 32) || null : null,
      roomSource: category ? "iumrahPrimary" : room ? "hotelInventory" : null,
    };
    result = await fetchPackageServerJSON(env, `/api/package/booking/${encodeURIComponent(bookingID)}`, token, { method: "PATCH", body: JSON.stringify(updateBody) });
  } else if (action === "delete") {
    // The iOS client uses the Hotels backend booking-control route. Call that
    // directly first so the operational trip layer can clean up its state too.
    const clientDelete = await fetchServerJSON(
      env,
      `/api/catalog/hotels/client/bookings/${encodeURIComponent(bookingID)}`,
      token,
      { method: "DELETE" },
    );

    // PackageEngine owns the canonical bookings DB and exposes the same hard
    // delete by booking token. Calling it as well makes deletion durable even
    // when the client/operational route is not deployed on a given environment.
    const packageDelete = await fetchPackageServerJSON(
      env,
      `/api/package/booking/${encodeURIComponent(bookingID)}`,
      token,
      { method: "DELETE" },
    );

    const clientOK = clientDelete.status >= 200 && clientDelete.status < 300;
    const packageOK = packageDelete.status >= 200 && packageDelete.status < 300;
    const alreadyGone = (clientDelete.status === 404 && packageDelete.status === 404);
    if (!clientOK && !packageOK && !alreadyGone) {
      const preferred = packageDelete.status !== 404 && packageDelete.status !== 405 ? packageDelete : clientDelete;
      return json({
        error: preferred.body?.error || `BOOKING_DELETE_${preferred.status}`,
        clientStatus: clientDelete.status,
        packageStatus: packageDelete.status,
      }, preferred.status || 502);
    }

    await env.DB.batch([
      env.DB.prepare("DELETE FROM telegram_bookings WHERE telegram_user_id=?1 AND booking_id=?2").bind(user.id, bookingID),
      env.DB.prepare("DELETE FROM telegram_link_tokens WHERE booking_id=?1").bind(bookingID),
    ]);
    result = { status: 200, body: { ok: true, deleted: true, clientStatus: clientDelete.status, packageStatus: packageDelete.status } };
  } else {
    return json({ error: "UNSUPPORTED_ACTION" }, 400);
  }
  if (result.status < 200 || result.status >= 300) return json({ error: result.body?.error || `IUMRAH_ACTION_${result.status}` }, result.status || 502);
  return json({ ok: true, result: result.body });
}

async function miniCareCall(request: Request, env: Env): Promise<Response> {
  const context = await miniHotelContext(request, env);
  if (context instanceof Response) return context;

  let phone = "+998508898845";
  try {
    const team = await fetchServerJSON(env, "/api/catalog/hotels/team", context.token);
    const members = Array.isArray(team.body?.members) ? team.body.members : [];
    const care = members.find((member: any) => member?.isOwner === true) || members[0] || null;
    const candidate = clean(care?.phoneUZ || care?.phone || "", 64).replace(/[^0-9+]/g, "");
    if (candidate.length >= 7) phone = candidate;
  } catch { /* use the production Care fallback number */ }

  try {
    await telegramCall(env, "sendContact", {
      chat_id: context.row.chat_id,
      phone_number: phone,
      first_name: "iumrah Care",
    });
    return json({ ok: true, phone, deliveredToTelegram: true });
  } catch (error) {
    console.error("care contact delivery failed", error);
    return json({ error: "CARE_CALL_CONTACT_FAILED", phone }, 502);
  }
}

async function miniCareMessages(request: Request, env: Env): Promise<Response> {
  const context = await miniHotelContext(request, env);
  if (context instanceof Response) return context;
  const bookingID = context.row.booking_id;
  const result = await fetchServerJSON(env, `/api/catalog/hotels/client/chats/${encodeURIComponent(bookingID)}/messages`, context.token);
  if (result.status < 200 || result.status >= 300) return json({ error: result.body?.error || `CARE_MESSAGES_${result.status}` }, result.status || 502);
  try {
    await fetchServerJSON(env, `/api/catalog/hotels/client/chats/${encodeURIComponent(bookingID)}/read`, context.token, {
      method: "POST", body: JSON.stringify({}),
    });
  } catch { /* read receipts are best-effort */ }
  return json({ ok: true, bookingID, messages: Array.isArray(result.body?.messages) ? result.body.messages : [] });
}

async function miniCareSend(request: Request, env: Env): Promise<Response> {
  const context = await miniHotelContext(request, env);
  if (context instanceof Response) return context;
  const bookingID = context.row.booking_id;
  const body = clean(context.body.message, 4000);
  if (!body) return json({ error: "EMPTY_MESSAGE" }, 400);
  const result = await fetchServerJSON(env, `/api/catalog/hotels/client/chats/${encodeURIComponent(bookingID)}/messages`, context.token, {
    method: "POST",
    body: JSON.stringify({ body, clientMessageID: crypto.randomUUID() }),
  });
  if (result.status < 200 || result.status >= 300) return json({ error: result.body?.error || `CARE_SEND_${result.status}` }, result.status || 502);
  return json({ ok: true, message: result.body?.message ?? null });
}

function decodeBase64Payload(value: string): Uint8Array | null {
  try {
    const normalized = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch { return null; }
}

async function miniCarePhoto(request: Request, env: Env): Promise<Response> {
  const context = await miniHotelContext(request, env);
  if (context instanceof Response) return context;
  const bookingID = context.row.booking_id;
  const raw = clean(context.body.dataBase64, 12_000_000);
  const bytes = decodeBase64Payload(raw);
  if (!bytes || bytes.byteLength < 16 || bytes.byteLength > 7_500_000) return json({ error: "INVALID_IMAGE" }, 400);
  if (!env.IUMRAH_WEB || typeof env.IUMRAH_WEB.fetch !== "function") return json({ error: "IUMRAH_WEB_BINDING_MISSING" }, 503);
  const headers = new Headers({ accept: "application/json", "content-type": "image/jpeg", "x-booking-token": context.token });
  const response = await env.IUMRAH_WEB.fetch(new Request(
    `https://iumrah-web.internal/api/catalog/hotels/client/chats/${encodeURIComponent(bookingID)}/attachments`,
    { method: "POST", headers, body: bytes, redirect: "manual" },
  ));
  let body: any = null;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok) return json({ error: body?.error || `CARE_PHOTO_${response.status}` }, response.status || 502);
  return json({ ok: true, message: body?.message ?? null });
}

function normalizedCareAttachmentPath(raw: string, bookingID: string): string | null {
  try {
    const value = raw.trim();
    if (!value) return null;
    const url = value.startsWith("http://") || value.startsWith("https://") ? new URL(value) : new URL(value, "https://iumrah-web.internal");
    const prefix = `/api/catalog/hotels/client/chats/${encodeURIComponent(bookingID)}/`;
    return url.pathname.startsWith(prefix) ? `${url.pathname}${url.search}` : null;
  } catch { return null; }
}

async function miniCareAttachment(request: Request, env: Env): Promise<Response> {
  const context = await miniHotelContext(request, env);
  if (context instanceof Response) return context;
  const bookingID = context.row.booking_id;
  const path = normalizedCareAttachmentPath(clean(context.body.path, 2048), bookingID);
  if (!path) return json({ error: "INVALID_ATTACHMENT" }, 400);
  if (!env.IUMRAH_WEB || typeof env.IUMRAH_WEB.fetch !== "function") return json({ error: "IUMRAH_WEB_BINDING_MISSING" }, 503);
  const response = await env.IUMRAH_WEB.fetch(new Request(`https://iumrah-web.internal${path}`, {
    method: "GET",
    headers: { accept: "image/*", "x-booking-token": context.token },
    redirect: "manual",
  }));
  if (!response.ok) return json({ error: `CARE_ATTACHMENT_${response.status}` }, response.status || 502);
  const headers = new Headers();
  headers.set("content-type", response.headers.get("content-type") || "image/jpeg");
  headers.set("cache-control", "private, max-age=300");
  return new Response(response.body, { status: 200, headers });
}

async function miniSnapshot(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return json({ error: "INVALID_REQUEST" }, 400); }
  const user = await validateTelegramInitData(env, clean(body.initData, 8192));
  if (!user) return json({ error: "TELEGRAM_AUTH_FAILED" }, 401);
  const bookingID = clean(body.bookingId, 64);
  if (!validBookingID(bookingID)) return json({ error: "INVALID_BOOKING" }, 400);
  const row = await env.DB.prepare(
    `SELECT telegram_user_id, chat_id, booking_id, booking_token_ciphertext, booking_token_iv, language,
            last_status, last_payment_status, last_confirmation_number, notifications_enabled
     FROM telegram_bookings WHERE telegram_user_id=?1 AND booking_id=?2 LIMIT 1`,
  ).bind(user.id, bookingID).first<LinkedBookingRow>();
  if (!row) return json({ error: "BOOKING_NOT_LINKED" }, 404);
  try {
    const token = await decryptSecret(env, row.booking_token_ciphertext, row.booking_token_iv);
    const payload = await fetchTrip(env, bookingID, token);
    return json({
      ok: true,
      reference: bookingReference(payload.trip),
      trip: payload.trip,
      lifecycle: lifecycle(payload),
      copy: statusCopy(normalizeLocale(row.language || user.language_code || "ru"), payload.trip.status, payload.trip.paymentStatus),
    });
  } catch { return json({ error: "BOOKING_REFRESH_FAILED" }, 502); }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      await env.DB.prepare("INSERT INTO bot_config(key,value,updated_at) VALUES ('public_base_url',?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at")
        .bind(url.origin, new Date().toISOString()).run();
    } catch { /* The health endpoint can still respond before a first migration in local development. */ }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "iumrah-telegram-bot", version: "1.7.0", apiOrigin: serverOrigin(env), directServer: true, packageBinding: Boolean(env.IUMRAH_PACKAGE_API), iumrahWebReadFallback: Boolean(env.IUMRAH_WEB) });
    }
    if (request.method === "GET" && /^\/status-image\/[a-z_]+\.webp$/.test(url.pathname)) {
      const key = url.pathname.split("/").pop()?.replace(/\.webp$/, "") || "";
      return serveStatusImage(key);
    }
    if (request.method === "GET" && /^\/mini-asset\/[a-z0-9-]+\.(png|jpeg|jpg|ttf)$/.test(url.pathname)) {
      const filename = url.pathname.split("/").pop() || "";
      const key = filename.replace(/\.(png|jpeg|jpg|ttf)$/, "").replace(/-/g, "_");
      return serveMiniAsset(key);
    }
    if (request.method === "GET" && url.pathname === "/mini") {
      return new Response(miniHTML(), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (request.method === "POST" && url.pathname === "/mini/bootstrap") return miniBootstrap(request, env);
    if (request.method === "POST" && url.pathname === "/mini/hotels") return miniHotels(request, env);
    if (request.method === "POST" && url.pathname === "/mini/hotel") return miniHotel(request, env);
    if (request.method === "POST" && url.pathname === "/mini/action") return miniAction(request, env);
    if (request.method === "POST" && url.pathname === "/mini/care/call") return miniCareCall(request, env);
    if (request.method === "POST" && url.pathname === "/mini/snapshot") return miniSnapshot(request, env);
    if (request.method === "POST" && url.pathname === "/internal/link-token") return createLinkToken(request, env);
    if (request.method === "POST" && url.pathname === "/internal/booking-event") return bookingEvent(request, env);

    if (request.method !== "POST" || url.pathname !== "/webhook") return new Response("Not found", { status: 404 });
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) return new Response("Unauthorized", { status: 401 });

    let update: TelegramUpdate;
    try { update = (await request.json()) as TelegramUpdate; } catch { return new Response("Bad request", { status: 400 }); }
    try { await handleUpdate(env, update, url.origin); }
    catch (error) { console.error("update failed", error); return json({ ok: false }, 500); }
    return json({ ok: true });
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await reconcileAll(env);
  },
};
