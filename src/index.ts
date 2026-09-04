interface Env {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
}

type Gender = "male" | "female";
type Lang = "ru" | "uz";
type UserStatus = "idle" | "waiting" | "chatting";
type Intent = "talk" | "meet" | "vent" | "night" | "random";
type OfferKind = "live" | "inbox";

type TelegramUser = {
  id: number;
  is_bot?: boolean;
};

type TelegramChat = {
  id: number;
  type: string;
};

type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  caption?: string;
  contact?: unknown;
  location?: unknown;
  venue?: unknown;
  photo?: unknown[];
  video?: unknown;
  video_note?: unknown;
  voice?: unknown;
  audio?: unknown;
  animation?: unknown;
  document?: unknown;
  sticker?: unknown;
};

type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: TelegramMessage;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type UserRow = {
  user_id: number;
  gender: Gender | null;
  status: UserStatus;
  language: Lang;
  language_selected: number;
  age_confirmed: number;
  intent: Intent | null;
  intro_text: string | null;
  pending_action: string | null;
  last_active_at: string;
  trust_score: number;
};

type SessionRow = {
  id: number;
  male_user_id: number;
  female_user_id: number;
  text_message_count: number;
  media_unlocked: number;
};

type QueueClaimRow = {
  user_id: number;
};

type OfferRow = {
  id: number;
  kind: OfferKind;
  user_a_id: number;
  user_b_id: number;
  user_a_accepted: number;
  user_b_accepted: number;
  user_a_accepted_at: string | null;
  user_b_accepted_at: string | null;
  status: "pending" | "matched" | "declined" | "expired" | "cancelled";
  created_at: string;
  expires_at: string;
};

type IntroCardRow = {
  id: number;
  owner_user_id: number;
  language: Lang;
  intent: Intent;
  intro_text: string;
};

type MediaConsentRow = {
  total: number;
};

type CountRow = {
  count: number;
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const LIVE_QUEUE_HOURS = 6;
const LIVE_OFFER_MINUTES = 15;
const INBOX_OFFER_HOURS = 2;
const CARD_HOURS = 12;
const MEDIA_TEXT_THRESHOLD = 5;
const MAX_PENDING_INBOX_REQUESTS = 3;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function normalizeLang(value: string | null | undefined): Lang {
  return value === "uz" ? "uz" : "ru";
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function containsContactHint(value: string): boolean {
  return /@\w{3,}|t\.me\/|(?:\+?\d[\d\s().-]{6,}\d)/i.test(value);
}

function telegramApi(env: Env, method: string): string {
  return `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;
}

async function telegramCall<T = unknown>(
  env: Env,
  method: string,
  payload: Record<string, unknown>
): Promise<T> {
  const response = await fetch(telegramApi(env, method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  const body = (await response.json()) as { ok?: boolean; result?: T; description?: string };
  if (!response.ok || !body.ok) {
    throw new Error(`Telegram ${method} failed: ${body.description ?? response.statusText}`);
  }
  return body.result as T;
}

async function sendMessage(
  env: Env,
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>
): Promise<void> {
  await telegramCall(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    protect_content: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

async function answerCallback(
  env: Env,
  callbackId: string,
  text?: string,
  showAlert = false
): Promise<void> {
  await telegramCall(env, "answerCallbackQuery", {
    callback_query_id: callbackId,
    ...(text ? { text } : {}),
    show_alert: showAlert
  });
}

function langKeyboard(): Record<string, unknown> {
  return {
    inline_keyboard: [[
      { text: "🇷🇺 Русский", callback_data: "lang:ru" },
      { text: "🇺🇿 O‘zbekcha", callback_data: "lang:uz" }
    ]]
  };
}

function ageKeyboard(lang: Lang): Record<string, unknown> {
  return {
    inline_keyboard: [[
      { text: lang === "uz" ? "18 yoshdan kattaman" : "Мне есть 18", callback_data: "age:yes" },
      { text: lang === "uz" ? "Yo‘q" : "Нет", callback_data: "age:no" }
    ]]
  };
}

function genderKeyboard(lang: Lang): Record<string, unknown> {
  return {
    inline_keyboard: [[
      { text: lang === "uz" ? "👨 Erkak" : "👨 Мужчина", callback_data: "gender:male" },
      { text: lang === "uz" ? "👩 Ayol" : "👩 Женщина", callback_data: "gender:female" }
    ]]
  };
}

function mainKeyboard(lang: Lang): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: lang === "uz" ? "⚡ Hozir suhbat topish" : "⚡ Найти сейчас", callback_data: "find" }],
      [
        { text: lang === "uz" ? "💌 Kiruvchi" : "💌 Входящие", callback_data: "inbox" },
        { text: lang === "uz" ? "✨ Ariza qoldirish" : "✨ Оставить заявку", callback_data: "card:publish" }
      ],
      [{ text: lang === "uz" ? "🌙 Kechki suhbat" : "🌙 Вечерний чат", callback_data: "evening" }],
      [
        { text: lang === "uz" ? "⚙️ Sozlamalar" : "⚙️ Настройки", callback_data: "settings" },
        { text: lang === "uz" ? "🛡 Xavfsizlik" : "🛡 Безопасность", callback_data: "safety" }
      ]
    ]
  };
}

function waitingKeyboard(lang: Lang): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: lang === "uz" ? "💌 Kiruvchilarni ko‘rish" : "💌 Посмотреть входящие", callback_data: "inbox" }],
      [{ text: lang === "uz" ? "✖️ Qidiruvni bekor qilish" : "✖️ Отменить поиск", callback_data: "cancel_search" }]
    ]
  };
}

function activeChatKeyboard(lang: Lang, mediaUnlocked = false): Record<string, unknown> {
  return {
    inline_keyboard: [
      [
        { text: lang === "uz" ? "🔀 Keyingi" : "🔀 Следующий", callback_data: "next" },
        { text: lang === "uz" ? "✖️ Tugatish" : "✖️ Завершить", callback_data: "stop" }
      ],
      [{
        text: mediaUnlocked
          ? (lang === "uz" ? "🔓 Media ochiq" : "🔓 Медиа открыты")
          : (lang === "uz" ? "🔒 Mediani ochish" : "🔒 Открыть медиа"),
        callback_data: "media:consent"
      }],
      [{ text: lang === "uz" ? "⚠️ Shikoyat qilish" : "⚠️ Пожаловаться", callback_data: "report" }]
    ]
  };
}

function offerKeyboard(lang: Lang, offerId: number): Record<string, unknown> {
  return {
    inline_keyboard: [[
      { text: lang === "uz" ? "💬 Suhbatni ochish" : "💬 Открыть разговор", callback_data: `offer:accept:${offerId}` },
      { text: lang === "uz" ? "O‘tkazib yuborish" : "Пропустить", callback_data: `offer:decline:${offerId}` }
    ]]
  };
}

function cardKeyboard(lang: Lang, cardId: number, ownerId: number): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: lang === "uz" ? "💬 Gaplashmoqchiman" : "💬 Хочу поговорить", callback_data: `card:request:${cardId}` }],
      [
        { text: lang === "uz" ? "➡️ Keyingi" : "➡️ Следующая", callback_data: `card:next:${ownerId}` },
        { text: lang === "uz" ? "🏠 Menyu" : "🏠 Меню", callback_data: "menu" }
      ]
    ]
  };
}

function settingsKeyboard(lang: Lang): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: lang === "uz" ? "🌐 Til" : "🌐 Язык", callback_data: "settings:language" }],
      [{ text: lang === "uz" ? "🎭 Jins" : "🎭 Пол", callback_data: "settings:gender" }],
      [{ text: lang === "uz" ? "💭 Suhbat mavzusi" : "💭 Тема разговора", callback_data: "settings:intent" }],
      [{ text: lang === "uz" ? "✍️ Anonim kirish" : "✍️ Анонимная фраза", callback_data: "settings:intro" }],
      [{ text: lang === "uz" ? "🏠 Menyu" : "🏠 Меню", callback_data: "menu" }]
    ]
  };
}

function intentKeyboard(lang: Lang, context: "find" | "card" | "settings"): Record<string, unknown> {
  const rows: [Intent, string, string][] = [
    ["talk", "💬 Просто поговорить", "💬 Shunchaki suhbat"],
    ["meet", "✨ Познакомиться", "✨ Tanishish"],
    ["vent", "🫶 Выговориться", "🫶 Dardlashish"],
    ["night", "🌙 Ночной разговор", "🌙 Tungi suhbat"],
    ["random", "🎲 Случайная тема", "🎲 Tasodifiy mavzu"]
  ];
  return {
    inline_keyboard: [
      ...rows.map(([value, ru, uz]) => [{ text: lang === "uz" ? uz : ru, callback_data: `intent:${context}:${value}` }]),
      [{ text: lang === "uz" ? "🏠 Menyu" : "🏠 Меню", callback_data: "menu" }]
    ]
  };
}

function genderLabel(gender: Gender, lang: Lang): string {
  if (lang === "uz") return gender === "male" ? "Erkak" : "Ayol";
  return gender === "male" ? "Мужчина" : "Женщина";
}

function intentLabel(intent: Intent | null, lang: Lang): string {
  const labels: Record<Intent, { ru: string; uz: string }> = {
    talk: { ru: "Просто поговорить", uz: "Shunchaki suhbat" },
    meet: { ru: "Познакомиться", uz: "Tanishish" },
    vent: { ru: "Выговориться", uz: "Dardlashish" },
    night: { ru: "Ночной разговор", uz: "Tungi suhbat" },
    random: { ru: "Случайная тема", uz: "Tasodifiy mavzu" }
  };
  if (!intent) return lang === "uz" ? "Erkin suhbat" : "Свободный разговор";
  return labels[intent][lang];
}

function languageLabel(lang: Lang): string {
  return lang === "uz" ? "O‘zbekcha" : "Русский";
}

async function ensureUser(env: Env, userId: number): Promise<UserRow> {
  await env.DB.prepare(
    `INSERT INTO users (user_id, last_active_at) VALUES (?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       updated_at = CURRENT_TIMESTAMP,
       last_active_at = CURRENT_TIMESTAMP`
  ).bind(userId).run();

  const user = await env.DB.prepare(
    `SELECT user_id, gender, status, language, language_selected, age_confirmed,
            intent, intro_text, pending_action, last_active_at, trust_score
     FROM users WHERE user_id = ? LIMIT 1`
  ).bind(userId).first<UserRow>();

  if (!user) throw new Error("Failed to load user after upsert");
  user.language = normalizeLang(user.language);
  return user;
}

async function getUser(env: Env, userId: number): Promise<UserRow | null> {
  const user = await env.DB.prepare(
    `SELECT user_id, gender, status, language, language_selected, age_confirmed,
            intent, intro_text, pending_action, last_active_at, trust_score
     FROM users WHERE user_id = ? LIMIT 1`
  ).bind(userId).first<UserRow>();
  if (user) user.language = normalizeLang(user.language);
  return user;
}

async function getActiveSession(env: Env, userId: number): Promise<SessionRow | null> {
  return env.DB.prepare(
    `SELECT id, male_user_id, female_user_id, text_message_count, media_unlocked
     FROM sessions
     WHERE status = 'active' AND (male_user_id = ? OR female_user_id = ?)
     ORDER BY id DESC LIMIT 1`
  ).bind(userId, userId).first<SessionRow>();
}

function partnerOf(session: SessionRow, userId: number): number {
  return session.male_user_id === userId ? session.female_user_id : session.male_user_id;
}

async function setLanguage(env: Env, userId: number, lang: Lang): Promise<void> {
  await env.DB.prepare(
    `UPDATE users SET language = ?, language_selected = 1, pending_action = NULL,
      updated_at = CURRENT_TIMESTAMP, last_active_at = CURRENT_TIMESTAMP WHERE user_id = ?`
  ).bind(lang, userId).run();
}

async function setGender(env: Env, userId: number, gender: Gender): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM queue WHERE user_id = ?`).bind(userId),
    env.DB.prepare(
      `UPDATE users SET gender = ?, status = 'idle', pending_action = NULL,
       updated_at = CURRENT_TIMESTAMP, last_active_at = CURRENT_TIMESTAMP WHERE user_id = ?`
    ).bind(gender, userId)
  ]);
}

async function setIntent(env: Env, userId: number, intent: Intent): Promise<void> {
  await env.DB.prepare(
    `UPDATE users SET intent = ?, pending_action = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
  ).bind(intent, userId).run();
}

async function setPendingAction(env: Env, userId: number, action: string | null): Promise<void> {
  await env.DB.prepare(`UPDATE users SET pending_action = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`)
    .bind(action, userId).run();
}

async function showStart(env: Env, userId: number): Promise<void> {
  const user = await ensureUser(env, userId);
  const session = await getActiveSession(env, userId);

  if (session) {
    await sendMessage(
      env,
      userId,
      user.language === "uz"
        ? "💬 <b>Sirdosh suhbati ochiq</b>\n\nXabaringiz suhbatdoshingizga Telegram profilingiz ko‘rsatilmasdan yetkaziladi."
        : "💬 <b>Разговор в Sirdosh открыт</b>\n\nСообщение будет передано собеседнику без показа вашего Telegram-профиля.",
      activeChatKeyboard(user.language, session.media_unlocked === 1)
    );
    return;
  }

  if (!user.language_selected) {
    await sendMessage(
      env,
      userId,
      "<b>Sirdosh</b>\n\nРазговоры без имени.\nIsmsiz suhbatlar.\n\nВыберите язык · Tilni tanlang",
      langKeyboard()
    );
    return;
  }

  if (!user.age_confirmed) {
    await sendMessage(
      env,
      userId,
      user.language === "uz"
        ? "🛡 <b>Sirdosh — faqat 18+</b>\n\nAnonim suhbatlarda xavfsizlik uchun xizmatdan faqat voyaga yetgan foydalanuvchilar foydalanishi mumkin.\n\n18 yoshga to‘lganmisiz?"
        : "🛡 <b>Sirdosh — только 18+</b>\n\nДля безопасности анонимного общения сервис предназначен только для совершеннолетних пользователей.\n\nВам уже исполнилось 18 лет?",
      ageKeyboard(user.language)
    );
    return;
  }

  if (!user.gender) {
    await sendMessage(
      env,
      userId,
      user.language === "uz"
        ? "🎭 <b>Siz kimsiz?</b>\n\nBu faqat mos suhbatdosh topish uchun kerak. Qarshi tomonga ko‘rsatilmaydi."
        : "🎭 <b>Кто вы?</b>\n\nЭто нужно только для подбора собеседника. Другой стороне ваш выбор не показывается.",
      genderKeyboard(user.language)
    );
    return;
  }

  if (user.status === "waiting") {
    await sendMessage(
      env,
      userId,
      user.language === "uz"
        ? "⏳ <b>Qidiruv ishlayapti</b>\n\nTelegramni yopishingiz mumkin. Mos odam paydo bo‘lsa, Sirdosh o‘zi yozadi. Eski navbatdan avtomatik chat ochilmaydi — avval suhbat tasdiqlanadi."
        : "⏳ <b>Поиск работает</b>\n\nTelegram можно закрыть. Когда появится подходящий человек, Sirdosh сам напишет. Из старой очереди чат не откроется молча — сначала будет подтверждение.",
      waitingKeyboard(user.language)
    );
    return;
  }

  await showMain(env, user);
}

async function showMain(env: Env, user: UserRow): Promise<void> {
  const intro = user.language === "uz"
    ? "<b>Sirdosh</b>\n<em>Ismsiz suhbatlar.</em>\n\nBu yerda profil, obunachilar va ommaviy reyting yo‘q. Suhbat ochilishidan oldin siz tanlaysiz."
    : "<b>Sirdosh</b>\n<em>Разговоры без имени.</em>\n\nЗдесь нет профилей, подписчиков и публичных рейтингов. Перед открытием разговора вы сами выбираете.";
  await sendMessage(env, user.user_id, intro, mainKeyboard(user.language));
}

async function requireDiscoveryReady(env: Env, userId: number): Promise<UserRow | null> {
  const user = await ensureUser(env, userId);
  if (!user.language_selected || !user.age_confirmed || !user.gender) {
    await showStart(env, userId);
    return null;
  }
  return user;
}

async function cancelPendingLiveOffers(env: Env, userId: number): Promise<void> {
  const offers = await env.DB.prepare(
    `SELECT id, kind, user_a_id, user_b_id, user_a_accepted, user_b_accepted,
            user_a_accepted_at, user_b_accepted_at, status, created_at, expires_at
     FROM match_offers
     WHERE kind = 'live' AND status = 'pending' AND (user_a_id = ? OR user_b_id = ?)`
  ).bind(userId, userId).all<OfferRow>();

  for (const offer of offers.results ?? []) {
    await env.DB.prepare(
      `UPDATE match_offers SET status = 'cancelled', decided_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'pending'`
    ).bind(offer.id).run();
    const otherId = offer.user_a_id === userId ? offer.user_b_id : offer.user_a_id;
    const other = await getUser(env, otherId);
    if (other?.gender && other.status === "waiting" && !(await getActiveSession(env, otherId))) {
      await queueUser(env, otherId, other.gender);
    }
  }
}

async function claimQueueCandidate(env: Env, user: UserRow): Promise<number | null> {
  if (!user.gender) return null;
  const opposite: Gender = user.gender === "male" ? "female" : "male";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const claimed = await env.DB.prepare(
      `DELETE FROM queue
       WHERE user_id = (
         SELECT q.user_id
         FROM queue q
         JOIN users u ON u.user_id = q.user_id
         WHERE q.gender = ?
           AND q.user_id != ?
           AND q.created_at >= datetime('now', ?)
           AND u.age_confirmed = 1
           AND u.trust_score >= 20
           AND NOT EXISTS (
             SELECT 1 FROM sessions s
             WHERE s.status = 'active' AND (s.male_user_id = q.user_id OR s.female_user_id = q.user_id)
           )
           AND NOT EXISTS (
             SELECT 1 FROM match_offers o
             WHERE o.status = 'pending' AND (o.user_a_id = q.user_id OR o.user_b_id = q.user_id)
           )
           AND NOT EXISTS (
             SELECT 1 FROM blocks b
             WHERE (b.blocker_user_id = ? AND b.blocked_user_id = q.user_id)
                OR (b.blocker_user_id = q.user_id AND b.blocked_user_id = ?)
           )
           AND NOT EXISTS (
             SELECT 1 FROM match_skips ms
             WHERE ms.user_id = ? AND ms.skipped_user_id = q.user_id AND ms.expires_at > CURRENT_TIMESTAMP
           )
         ORDER BY
           CASE WHEN u.language = ? THEN 0 ELSE 1 END,
           CASE WHEN COALESCE(u.intent, '') = COALESCE(?, '') THEN 0 ELSE 1 END,
           u.trust_score DESC,
           q.created_at ASC
         LIMIT 1
       )
       RETURNING user_id`
    ).bind(
      opposite,
      user.user_id,
      `-${LIVE_QUEUE_HOURS} hours`,
      user.user_id,
      user.user_id,
      user.user_id,
      user.language,
      user.intent
    ).first<QueueClaimRow>();

    if (!claimed) return null;
    if (!(await getActiveSession(env, claimed.user_id))) return claimed.user_id;
  }
  return null;
}

async function queueUser(env: Env, userId: number, gender: Gender): Promise<void> {
  if (await getActiveSession(env, userId)) {
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM queue WHERE user_id = ?`).bind(userId),
      env.DB.prepare(`UPDATE users SET status = 'chatting', updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`).bind(userId)
    ]);
    return;
  }

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO queue (user_id, gender, created_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET gender = excluded.gender, created_at = CURRENT_TIMESTAMP`
    ).bind(userId, gender),
    env.DB.prepare(
      `UPDATE users SET status = 'waiting', updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
    ).bind(userId)
  ]);
}

function profileSnippet(user: UserRow, viewerLang: Lang): string {
  const intent = intentLabel(user.intent, viewerLang);
  const intro = user.intro_text?.trim();
  if (!intro) {
    return viewerLang === "uz"
      ? `💭 Mavzu: <b>${escapeHtml(intent)}</b>`
      : `💭 Тема: <b>${escapeHtml(intent)}</b>`;
  }
  return viewerLang === "uz"
    ? `💭 Mavzu: <b>${escapeHtml(intent)}</b>\n\n“${escapeHtml(intro)}”`
    : `💭 Тема: <b>${escapeHtml(intent)}</b>\n\n«${escapeHtml(intro)}»`;
}

async function createLiveOffer(env: Env, user: UserRow, partnerId: number): Promise<OfferRow | null> {
  const offer = await env.DB.prepare(
    `INSERT INTO match_offers (
       kind, user_a_id, user_b_id, user_a_accepted, user_b_accepted,
       user_a_accepted_at, expires_at
     ) VALUES ('live', ?, ?, 1, 0, CURRENT_TIMESTAMP, datetime('now', ?))
     RETURNING id, kind, user_a_id, user_b_id, user_a_accepted, user_b_accepted,
               user_a_accepted_at, user_b_accepted_at, status, created_at, expires_at`
  ).bind(user.user_id, partnerId, `+${LIVE_OFFER_MINUTES} minutes`).first<OfferRow>();

  if (!offer) return null;

  await env.DB.prepare(
    `UPDATE users SET status = 'waiting', updated_at = CURRENT_TIMESTAMP WHERE user_id IN (?, ?)`
  ).bind(user.user_id, partnerId).run();

  const partner = await getUser(env, partnerId);
  if (!partner) return offer;

  const notices = await Promise.allSettled([
    sendMessage(
      env,
      user.user_id,
      user.language === "uz"
        ? `✨ <b>Mos suhbatdosh topildi</b>\n\n${profileSnippet(partner, user.language)}\n\nSirdosh unga taklif yubordi. U tasdiqlasa, suhbat ochiladi.`
        : `✨ <b>Подходящий человек найден</b>\n\n${profileSnippet(partner, user.language)}\n\nSirdosh отправил ему приглашение. Разговор откроется после подтверждения.`,
      waitingKeyboard(user.language)
    ),
    sendMessage(
      env,
      partnerId,
      partner.language === "uz"
        ? `💫 <b>Kimdir hozir suhbatlashmoqchi</b>\n\n${profileSnippet(user, partner.language)}\n\nProfil va username ko‘rsatilmaydi. Suhbatni ochishni o‘zingiz hal qilasiz.`
        : `💫 <b>Кто-то хочет поговорить сейчас</b>\n\n${profileSnippet(user, partner.language)}\n\nПрофиль и username не показываются. Вы сами решаете, открывать ли разговор.`,
      offerKeyboard(partner.language, offer.id)
    )
  ]);

  if (notices.some((result) => result.status === "rejected")) {
    await env.DB.prepare(
      `UPDATE match_offers SET status = 'cancelled', decided_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`
    ).bind(offer.id).run();
    if (notices[1]?.status === "rejected") {
      await env.DB.prepare(`UPDATE users SET status = 'idle', updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`).bind(partnerId).run();
      if (user.gender) await queueUser(env, user.user_id, user.gender);
      if (notices[0]?.status === "fulfilled") {
        await sendMessage(env, user.user_id, user.language === "uz" ? "U foydalanuvchi hozir mavjud emas. Siz qidiruvda qoldingiz." : "Этот пользователь сейчас недоступен. Вы остались в поиске.", waitingKeyboard(user.language));
      }
    } else if (partner.gender) {
      await queueUser(env, partnerId, partner.gender);
    }
  }

  return offer;
}

async function startSearch(env: Env, userId: number): Promise<void> {
  const user = await requireDiscoveryReady(env, userId);
  if (!user || !user.gender) return;

  if (await getActiveSession(env, userId)) {
    await sendMessage(
      env,
      userId,
      user.language === "uz" ? "Sizda allaqachon faol suhbat bor." : "У вас уже есть активный разговор.",
      activeChatKeyboard(user.language)
    );
    return;
  }

  if (!user.intent) {
    await sendMessage(
      env,
      userId,
      user.language === "uz" ? "💭 <b>Bugun qanday suhbat xohlaysiz?</b>" : "💭 <b>Какого разговора хочется сегодня?</b>",
      intentKeyboard(user.language, "find")
    );
    return;
  }

  await cancelPendingLiveOffers(env, userId);
  await env.DB.prepare(`DELETE FROM queue WHERE user_id = ?`).bind(userId).run();

  const partnerId = await claimQueueCandidate(env, user);
  if (!partnerId) {
    await queueUser(env, userId, user.gender);
    await sendMessage(
      env,
      userId,
      user.language === "uz"
        ? `⏳ <b>Qidiruv yoqildi</b>\n\nHozir mos odam bo‘lmasa ham kutib o‘tirishingiz shart emas. Telegramni yoping — keyingi mos foydalanuvchi paydo bo‘lsa, Sirdosh sizga xabar beradi.\n\nNavbat <b>${LIVE_QUEUE_HOURS} soat</b>gacha faol.`
        : `⏳ <b>Поиск включён</b>\n\nДаже если прямо сейчас никого нет, ждать в боте не нужно. Закройте Telegram — когда появится следующий подходящий человек, Sirdosh пришлёт уведомление.\n\nПоиск активен до <b>${LIVE_QUEUE_HOURS} часов</b>.`,
      waitingKeyboard(user.language)
    );
    return;
  }

  try {
    await createLiveOffer(env, user, partnerId);
  } catch (error) {
    console.error("createLiveOffer failed", error);
    const partner = await getUser(env, partnerId);
    if (partner?.gender && !(await getActiveSession(env, partnerId))) {
      await queueUser(env, partnerId, partner.gender);
    }
    await queueUser(env, userId, user.gender);
    await sendMessage(
      env,
      userId,
      user.language === "uz" ? "⏳ Qidiruv davom etmoqda." : "⏳ Поиск продолжается.",
      waitingKeyboard(user.language)
    );
  }
}

async function cancelSearch(env: Env, userId: number): Promise<void> {
  const user = await ensureUser(env, userId);
  await cancelPendingLiveOffers(env, userId);
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM queue WHERE user_id = ?`).bind(userId),
    env.DB.prepare(
      `UPDATE users SET status = 'idle', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND status = 'waiting'`
    ).bind(userId)
  ]);
  await sendMessage(
    env,
    userId,
    user.language === "uz" ? "Qidiruv bekor qilindi." : "Поиск отменён.",
    mainKeyboard(user.language)
  );
}

async function createSession(env: Env, userAId: number, userBId: number): Promise<SessionRow> {
  const a = await getUser(env, userAId);
  const b = await getUser(env, userBId);
  if (!a?.gender || !b?.gender || a.gender === b.gender) throw new Error("Invalid pair genders");
  if (await getActiveSession(env, userAId)) throw new Error("User A already busy");
  if (await getActiveSession(env, userBId)) throw new Error("User B already busy");

  const maleId = a.gender === "male" ? userAId : userBId;
  const femaleId = a.gender === "female" ? userAId : userBId;

  const session = await env.DB.prepare(
    `INSERT INTO sessions (male_user_id, female_user_id, status, text_message_count, media_unlocked)
     VALUES (?, ?, 'active', 0, 0)
     RETURNING id, male_user_id, female_user_id, text_message_count, media_unlocked`
  ).bind(maleId, femaleId).first<SessionRow>();
  if (!session) throw new Error("Failed to create session");

  await env.DB.batch([
    env.DB.prepare(`DELETE FROM queue WHERE user_id IN (?, ?)`).bind(userAId, userBId),
    env.DB.prepare(
      `UPDATE users SET status = 'chatting', pending_action = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE user_id IN (?, ?)`
    ).bind(userAId, userBId),
    env.DB.prepare(
      `INSERT OR REPLACE INTO session_media_consents (session_id, user_id, consented, updated_at)
       VALUES (?, ?, 0, CURRENT_TIMESTAMP)`
    ).bind(session.id, userAId),
    env.DB.prepare(
      `INSERT OR REPLACE INTO session_media_consents (session_id, user_id, consented, updated_at)
       VALUES (?, ?, 0, CURRENT_TIMESTAMP)`
    ).bind(session.id, userBId)
  ]);

  return session;
}

async function getOffer(env: Env, offerId: number): Promise<OfferRow | null> {
  return env.DB.prepare(
    `SELECT id, kind, user_a_id, user_b_id, user_a_accepted, user_b_accepted,
            user_a_accepted_at, user_b_accepted_at, status, created_at, expires_at
     FROM match_offers WHERE id = ? LIMIT 1`
  ).bind(offerId).first<OfferRow>();
}

async function pairBlocked(env: Env, a: number, b: number): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM blocks
     WHERE (blocker_user_id = ? AND blocked_user_id = ?)
        OR (blocker_user_id = ? AND blocked_user_id = ?)`
  ).bind(a, b, b, a).first<CountRow>();
  return (row?.count ?? 0) > 0;
}

async function finalizeOffer(env: Env, offer: OfferRow): Promise<void> {
  if (offer.status !== "pending") return;
  const a = await getUser(env, offer.user_a_id);
  const b = await getUser(env, offer.user_b_id);
  if (!a || !b) return;

  if (await pairBlocked(env, offer.user_a_id, offer.user_b_id)) {
    await env.DB.prepare(
      `UPDATE match_offers SET status = 'cancelled', decided_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(offer.id).run();
    return;
  }

  if (await getActiveSession(env, offer.user_a_id) || await getActiveSession(env, offer.user_b_id)) {
    await env.DB.prepare(
      `UPDATE match_offers SET status = 'cancelled', decided_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(offer.id).run();
    await Promise.allSettled([
      sendMessage(env, offer.user_a_id, a.language === "uz" ? "Taklif yopildi: suhbatlardan biri allaqachon band." : "Предложение закрыто: один из вас уже занят другим разговором.", mainKeyboard(a.language)),
      sendMessage(env, offer.user_b_id, b.language === "uz" ? "Taklif yopildi: suhbatlardan biri allaqachon band." : "Предложение закрыто: один из вас уже занят другим разговором.", mainKeyboard(b.language))
    ]);
    return;
  }

  try {
    const session = await createSession(env, offer.user_a_id, offer.user_b_id);
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE match_offers SET status = 'matched', decided_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).bind(offer.id),
      env.DB.prepare(
        `UPDATE match_offers SET status = 'cancelled', decided_at = CURRENT_TIMESTAMP
         WHERE status = 'pending' AND id != ?
           AND (user_a_id IN (?, ?) OR user_b_id IN (?, ?))`
      ).bind(offer.id, offer.user_a_id, offer.user_b_id, offer.user_a_id, offer.user_b_id)
    ]);

    const ru = "✅ <b>Разговор открыт</b>\n\nВы ничего не обязаны раскрывать о себе. Начните с обычного сообщения. Первые сообщения — только текст; медиа откроются лишь по взаимному согласию.";
    const uz = "✅ <b>Suhbat ochildi</b>\n\nO‘zingiz haqingizda hech narsa oshkor qilishga majbur emassiz. Oddiy xabardan boshlang. Avval faqat matn; media faqat ikki tomon roziligidan keyin ochiladi.";

    await Promise.allSettled([
      sendMessage(env, offer.user_a_id, a.language === "uz" ? uz : ru, activeChatKeyboard(a.language, session.media_unlocked === 1)),
      sendMessage(env, offer.user_b_id, b.language === "uz" ? uz : ru, activeChatKeyboard(b.language, session.media_unlocked === 1))
    ]);
  } catch (error) {
    console.error("finalizeOffer createSession failed", error);
    await env.DB.prepare(
      `UPDATE match_offers SET status = 'cancelled', decided_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(offer.id).run();
  }
}

function minutesBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const da = Date.parse(a.endsWith("Z") ? a : `${a.replace(" ", "T")}Z`);
  const db = Date.parse(b.endsWith("Z") ? b : `${b.replace(" ", "T")}Z`);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return null;
  return Math.abs(da - db) / 60000;
}

async function acceptOffer(env: Env, userId: number, offerId: number): Promise<void> {
  const user = await ensureUser(env, userId);
  let offer = await getOffer(env, offerId);
  if (!offer || (offer.user_a_id !== userId && offer.user_b_id !== userId)) {
    await sendMessage(env, userId, user.language === "uz" ? "Bu taklif topilmadi." : "Это предложение уже недоступно.", mainKeyboard(user.language));
    return;
  }

  if (offer.status !== "pending") {
    await sendMessage(env, userId, user.language === "uz" ? "Bu taklif allaqachon yopilgan." : "Это предложение уже закрыто.", mainKeyboard(user.language));
    return;
  }

  const expired = await env.DB.prepare(
    `SELECT CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END AS count FROM match_offers WHERE id = ?`
  ).bind(offerId).first<CountRow>();
  if ((expired?.count ?? 0) === 1) {
    await env.DB.prepare(`UPDATE match_offers SET status = 'expired', decided_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(offerId).run();
    await sendMessage(env, userId, user.language === "uz" ? "Taklifning vaqti tugagan." : "Срок этого предложения истёк.", mainKeyboard(user.language));
    return;
  }

  if (await getActiveSession(env, userId)) {
    await sendMessage(env, userId, user.language === "uz" ? "Avval hozirgi suhbatni tugating." : "Сначала завершите текущий разговор.", activeChatKeyboard(user.language));
    return;
  }

  const isA = offer.user_a_id === userId;
  if (isA) {
    await env.DB.prepare(
      `UPDATE match_offers SET user_a_accepted = 1, user_a_accepted_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`
    ).bind(offerId).run();
  } else {
    await env.DB.prepare(
      `UPDATE match_offers SET user_b_accepted = 1, user_b_accepted_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`
    ).bind(offerId).run();
  }

  offer = await getOffer(env, offerId);
  if (!offer || offer.status !== "pending") return;

  if (offer.user_a_accepted && offer.user_b_accepted) {
    const gap = minutesBetween(offer.user_a_accepted_at, offer.user_b_accepted_at);
    const allowedGap = offer.kind === "live" ? 10 : 30;
    if (gap !== null && gap > allowedGap) {
      const olderIsA = Date.parse(`${(offer.user_a_accepted_at ?? "").replace(" ", "T")}Z`) < Date.parse(`${(offer.user_b_accepted_at ?? "").replace(" ", "T")}Z`);
      const staleId = olderIsA ? offer.user_a_id : offer.user_b_id;
      const freshId = olderIsA ? offer.user_b_id : offer.user_a_id;
      const stale = await getUser(env, staleId);
      const fresh = await getUser(env, freshId);

      if (olderIsA) {
        await env.DB.prepare(`UPDATE match_offers SET user_a_accepted = 0, user_a_accepted_at = NULL WHERE id = ?`).bind(offerId).run();
      } else {
        await env.DB.prepare(`UPDATE match_offers SET user_b_accepted = 0, user_b_accepted_at = NULL WHERE id = ?`).bind(offerId).run();
      }

      if (stale) {
        await sendMessage(
          env,
          staleId,
          stale.language === "uz"
            ? "✨ <b>Suhbatdoshingiz tayyor</b>\n\nSizning oldingi tasdig‘ingiz ancha oldin bo‘lgan. Hali ham suhbatni ochmoqchi bo‘lsangiz, tasdiqlang."
            : "✨ <b>Собеседник готов</b>\n\nВаше прошлое подтверждение было давно. Если вы всё ещё хотите открыть разговор, подтвердите ещё раз.",
          offerKeyboard(stale.language, offerId)
        );
      }
      if (fresh) {
        await sendMessage(env, freshId, fresh.language === "uz" ? "Tasdiq yuborildi. Ikkinchi tomon javobini kutamiz." : "Подтверждение отправлено. Ждём вторую сторону.");
      }
      return;
    }

    await finalizeOffer(env, offer);
    return;
  }

  const otherId = isA ? offer.user_b_id : offer.user_a_id;
  const other = await getUser(env, otherId);
  if (other) {
    await sendMessage(
      env,
      userId,
      user.language === "uz" ? "Tasdiqlandi. Ikkinchi tomon javobini kutamiz." : "Подтверждено. Ждём вторую сторону."
    );
    await sendMessage(
      env,
      otherId,
      other.language === "uz"
        ? "✨ Ikkinchi tomon suhbatga tayyor. Siz ham tayyor bo‘lsangiz, oching."
        : "✨ Вторая сторона готова к разговору. Если вы тоже готовы — откройте его.",
      offerKeyboard(other.language, offerId)
    );
  }
}

async function addSkip(env: Env, userId: number, skippedUserId: number, hours = 12): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO match_skips (user_id, skipped_user_id, expires_at, created_at)
     VALUES (?, ?, datetime('now', ?), CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, skipped_user_id) DO UPDATE SET expires_at = excluded.expires_at, created_at = CURRENT_TIMESTAMP`
  ).bind(userId, skippedUserId, `+${hours} hours`).run();
}

async function declineOffer(env: Env, userId: number, offerId: number): Promise<void> {
  const user = await ensureUser(env, userId);
  const offer = await getOffer(env, offerId);
  if (!offer || offer.status !== "pending" || (offer.user_a_id !== userId && offer.user_b_id !== userId)) {
    await sendMessage(env, userId, user.language === "uz" ? "Taklif allaqachon yopilgan." : "Предложение уже закрыто.", mainKeyboard(user.language));
    return;
  }

  await env.DB.prepare(
    `UPDATE match_offers SET status = 'declined', decided_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`
  ).bind(offerId).run();
  const otherId = offer.user_a_id === userId ? offer.user_b_id : offer.user_a_id;
  await Promise.all([addSkip(env, userId, otherId, 12), addSkip(env, otherId, userId, 12)]);

  if (offer.kind === "live") {
    for (const id of [offer.user_a_id, offer.user_b_id]) {
      const u = await getUser(env, id);
      if (u?.gender && u.status === "waiting" && !(await getActiveSession(env, id))) {
        await queueUser(env, id, u.gender);
      }
    }
    const other = await getUser(env, otherId);
    if (other) {
      await sendMessage(env, otherId, other.language === "uz" ? "Taklif o‘tkazib yuborildi. Qidiruv davom etadi." : "Предложение пропущено. Поиск продолжается.", waitingKeyboard(other.language));
    }
    await sendMessage(env, userId, user.language === "uz" ? "O‘tkazib yuborildi. Siz navbatda qoldingiz." : "Пропущено. Вы остались в поиске.", waitingKeyboard(user.language));
  } else {
    await sendMessage(env, userId, user.language === "uz" ? "So‘rov o‘tkazib yuborildi." : "Запрос пропущен.", mainKeyboard(user.language));
    const other = await getUser(env, otherId);
    if (other) {
      await sendMessage(env, otherId, other.language === "uz" ? "Bu so‘rov ochilmadi. Boshqa suhbatni tanlashingiz mumkin." : "Этот запрос не был открыт. Можно выбрать другой разговор.", mainKeyboard(other.language));
    }
  }
}

async function publishCard(env: Env, userId: number): Promise<void> {
  const user = await requireDiscoveryReady(env, userId);
  if (!user) return;

  if (!user.intent) {
    await sendMessage(env, userId, user.language === "uz" ? "💭 <b>Arizangiz nimaga mos?</b>" : "💭 <b>Для какого разговора ваша заявка?</b>", intentKeyboard(user.language, "card"));
    return;
  }

  if (!user.intro_text || user.intro_text.trim().length < 10) {
    await setPendingAction(env, userId, "card_intro");
    await sendMessage(
      env,
      userId,
      user.language === "uz"
        ? "✍️ <b>Bitta anonim jumla yozing</b>\n\nMasalan: “Bugun notanish odam bilan sokin gaplashgim kelyapti.”\n\n10–180 belgi. Ism, @username, telefon yoki boshqa shaxsiy ma’lumot yozmaslikni tavsiya qilamiz."
        : "✍️ <b>Напишите одну анонимную фразу</b>\n\nНапример: «Сегодня хочется спокойно поговорить с совершенно незнакомым человеком».\n\n10–180 символов. Лучше без имени, @username, телефона и других личных данных."
    );
    return;
  }

  await env.DB.prepare(
    `INSERT INTO intro_cards (owner_user_id, language, intent, intro_text, status, created_at, expires_at)
     VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, datetime('now', ?))
     ON CONFLICT(owner_user_id) DO UPDATE SET
       language = excluded.language,
       intent = excluded.intent,
       intro_text = excluded.intro_text,
       status = 'active',
       created_at = CURRENT_TIMESTAMP,
       expires_at = excluded.expires_at`
  ).bind(userId, user.language, user.intent, user.intro_text.trim(), `+${CARD_HOURS} hours`).run();

  await sendMessage(
    env,
    userId,
    user.language === "uz"
      ? `✨ <b>Anonim ariza faol</b>\n\n${profileSnippet(user, user.language)}\n\nU <b>${CARD_HOURS} soat</b> ishlaydi. Kimdir suhbatni tanlasa, sizga kiruvchi so‘rov keladi — ochish yoki o‘tkazib yuborish o‘zingizga bog‘liq.`
      : `✨ <b>Анонимная заявка активна</b>\n\n${profileSnippet(user, user.language)}\n\nОна работает <b>${CARD_HOURS} часов</b>. Если кто-то выберет её, вы получите входящий запрос и сами решите — открыть разговор или пропустить.`,
    mainKeyboard(user.language)
  );
}

async function getInboxCard(env: Env, viewer: UserRow): Promise<IntroCardRow | null> {
  if (!viewer.gender) return null;
  const opposite: Gender = viewer.gender === "male" ? "female" : "male";
  return env.DB.prepare(
    `SELECT c.id, c.owner_user_id, c.language, c.intent, c.intro_text
     FROM intro_cards c
     JOIN users u ON u.user_id = c.owner_user_id
     WHERE c.status = 'active'
       AND c.expires_at > CURRENT_TIMESTAMP
       AND c.owner_user_id != ?
       AND u.gender = ?
       AND u.age_confirmed = 1
       AND u.trust_score >= 20
       AND NOT EXISTS (
         SELECT 1 FROM sessions s
         WHERE s.status = 'active' AND (s.male_user_id = c.owner_user_id OR s.female_user_id = c.owner_user_id)
       )
       AND NOT EXISTS (
         SELECT 1 FROM blocks b
         WHERE (b.blocker_user_id = ? AND b.blocked_user_id = c.owner_user_id)
            OR (b.blocker_user_id = c.owner_user_id AND b.blocked_user_id = ?)
       )
       AND NOT EXISTS (
         SELECT 1 FROM match_skips ms
         WHERE ms.user_id = ? AND ms.skipped_user_id = c.owner_user_id AND ms.expires_at > CURRENT_TIMESTAMP
       )
     ORDER BY
       CASE WHEN c.language = ? THEN 0 ELSE 1 END,
       CASE WHEN c.intent = COALESCE(?, c.intent) THEN 0 ELSE 1 END,
       u.trust_score DESC,
       c.created_at DESC
     LIMIT 1`
  ).bind(viewer.user_id, opposite, viewer.user_id, viewer.user_id, viewer.user_id, viewer.language, viewer.intent).first<IntroCardRow>();
}

async function showInbox(env: Env, userId: number): Promise<void> {
  const user = await requireDiscoveryReady(env, userId);
  if (!user) return;
  if (await getActiveSession(env, userId)) {
    await sendMessage(env, userId, user.language === "uz" ? "Avval hozirgi suhbatni tugating." : "Сначала завершите текущий разговор.", activeChatKeyboard(user.language));
    return;
  }

  const card = await getInboxCard(env, user);
  if (!card) {
    await sendMessage(
      env,
      userId,
      user.language === "uz"
        ? "💌 <b>Hozir yangi anonim ariza yo‘q</b>\n\nBu bo‘sh ekran emas: o‘zingiz ariza qoldirishingiz yoki qidiruvni yoqib Telegramni yopishingiz mumkin. Sirdosh mos odam chiqqanda xabar beradi."
        : "💌 <b>Сейчас новых анонимных заявок нет</b>\n\nЭто не тупик: можно оставить свою заявку или включить поиск и закрыть Telegram. Sirdosh напишет, когда появится подходящий человек.",
      mainKeyboard(user.language)
    );
    return;
  }

  await sendMessage(
    env,
    userId,
    user.language === "uz"
      ? `💌 <b>Ismsiz kiruvchi</b>\n\n💭 Mavzu: <b>${escapeHtml(intentLabel(card.intent, user.language))}</b>\n🌐 Til: ${escapeHtml(languageLabel(card.language))}\n\n“${escapeHtml(card.intro_text)}”\n\nSiz faqat suhbatning o‘zini tanlaysiz — Telegram profili ochilmaydi.`
      : `💌 <b>Входящее без имени</b>\n\n💭 Тема: <b>${escapeHtml(intentLabel(card.intent, user.language))}</b>\n🌐 Язык: ${escapeHtml(languageLabel(card.language))}\n\n«${escapeHtml(card.intro_text)}»\n\nВы выбираете только сам разговор — Telegram-профиль не раскрывается.`,
    cardKeyboard(user.language, card.id, card.owner_user_id)
  );
}

async function requestCard(env: Env, requesterId: number, cardId: number): Promise<void> {
  const requester = await requireDiscoveryReady(env, requesterId);
  if (!requester) return;
  if (await getActiveSession(env, requesterId)) {
    await sendMessage(env, requesterId, requester.language === "uz" ? "Avval hozirgi suhbatni tugating." : "Сначала завершите текущий разговор.", activeChatKeyboard(requester.language));
    return;
  }

  const card = await env.DB.prepare(
    `SELECT id, owner_user_id, language, intent, intro_text
     FROM intro_cards WHERE id = ? AND status = 'active' AND expires_at > CURRENT_TIMESTAMP LIMIT 1`
  ).bind(cardId).first<IntroCardRow>();
  if (!card || card.owner_user_id === requesterId) {
    await sendMessage(env, requesterId, requester.language === "uz" ? "Bu ariza endi mavjud emas." : "Эта заявка уже недоступна.", mainKeyboard(requester.language));
    return;
  }

  if (!requester.intro_text || requester.intro_text.trim().length < 10) {
    await setPendingAction(env, requesterId, `inbox_intro:${cardId}`);
    await sendMessage(
      env,
      requesterId,
      requester.language === "uz"
        ? "✍️ <b>Javob sifatida bitta anonim jumla yozing</b>\n\nAriza egasi avval shu jumlani ko‘radi. 10–180 belgi; shaxsiy ma’lumotlarsiz yozgan ma’qul."
        : "✍️ <b>Напишите одну анонимную фразу в ответ</b>\n\nВладелец заявки сначала увидит именно её. 10–180 символов; лучше без личных данных."
    );
    return;
  }

  if (await pairBlocked(env, requesterId, card.owner_user_id)) {
    await sendMessage(env, requesterId, requester.language === "uz" ? "Bu suhbat mavjud emas." : "Этот разговор недоступен.", mainKeyboard(requester.language));
    return;
  }

  const pendingCount = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM match_offers
     WHERE kind = 'inbox' AND user_b_id = ? AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP`
  ).bind(card.owner_user_id).first<CountRow>();
  if ((pendingCount?.count ?? 0) >= MAX_PENDING_INBOX_REQUESTS) {
    await addSkip(env, requesterId, card.owner_user_id, 2);
    await sendMessage(
      env,
      requesterId,
      requester.language === "uz" ? "Bu foydalanuvchining kiruvchilari hozir band. Boshqa arizani ko‘rsataman." : "У этого пользователя сейчас заполнены входящие. Покажу другую заявку."
    );
    await showInbox(env, requesterId);
    return;
  }

  const existing = await env.DB.prepare(
    `SELECT id FROM match_offers
     WHERE kind = 'inbox' AND status = 'pending' AND user_a_id = ? AND user_b_id = ? AND expires_at > CURRENT_TIMESTAMP
     ORDER BY id DESC LIMIT 1`
  ).bind(requesterId, card.owner_user_id).first<{ id: number }>();
  if (existing) {
    await sendMessage(env, requesterId, requester.language === "uz" ? "So‘rovingiz allaqachon yuborilgan." : "Ваш запрос уже отправлен.", mainKeyboard(requester.language));
    return;
  }

  if (!requester.intent) {
    await setIntent(env, requesterId, "talk");
    requester.intent = "talk";
  }

  const offer = await env.DB.prepare(
    `INSERT INTO match_offers (
       kind, user_a_id, user_b_id, user_a_accepted, user_b_accepted,
       user_a_accepted_at, expires_at
     ) VALUES ('inbox', ?, ?, 1, 0, CURRENT_TIMESTAMP, datetime('now', ?))
     RETURNING id, kind, user_a_id, user_b_id, user_a_accepted, user_b_accepted,
               user_a_accepted_at, user_b_accepted_at, status, created_at, expires_at`
  ).bind(requesterId, card.owner_user_id, `+${INBOX_OFFER_HOURS} hours`).first<OfferRow>();
  if (!offer) throw new Error("Failed to create inbox offer");

  const owner = await getUser(env, card.owner_user_id);
  await sendMessage(
    env,
    requesterId,
    requester.language === "uz"
      ? `📨 <b>So‘rov yuborildi</b>\n\nJavobni kutib bot ichida o‘tirish shart emas. Ariza egasi suhbatni ochsa, Sirdosh sizga xabar beradi. So‘rov <b>${INBOX_OFFER_HOURS} soat</b> amal qiladi.`
      : `📨 <b>Запрос отправлен</b>\n\nСидеть в боте и ждать ответа не нужно. Если владелец заявки откроет разговор, Sirdosh пришлёт уведомление. Запрос действует <b>${INBOX_OFFER_HOURS} часа</b>.`,
    mainKeyboard(requester.language)
  );

  if (owner) {
    try {
      await sendMessage(
        env,
        owner.user_id,
        owner.language === "uz"
          ? `💌 <b>Yangi kiruvchi so‘rov</b>\n\n${profileSnippet(requester, owner.language)}\n\nBu odam sizning anonim arizangizni tanladi. Profilini ko‘rmasdan suhbatni ochishingiz yoki o‘tkazib yuborishingiz mumkin.`
          : `💌 <b>Новый входящий запрос</b>\n\n${profileSnippet(requester, owner.language)}\n\nЭтот человек выбрал вашу анонимную заявку. Можно открыть разговор, не видя его профиля, или просто пропустить.`,
        offerKeyboard(owner.language, offer.id)
      );
    } catch (error) {
      console.error("inbox owner notification failed", error);
      await env.DB.prepare(
        `UPDATE match_offers SET status = 'cancelled', decided_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`
      ).bind(offer.id).run();
      await addSkip(env, requesterId, owner.user_id, 2);
      await sendMessage(
        env,
        requesterId,
        requester.language === "uz"
          ? "Bu foydalanuvchi hozir Sirdosh xabarlarini qabul qila olmaydi. So‘rov yopildi."
          : "Этот пользователь сейчас не может получить сообщение Sirdosh. Запрос закрыт.",
        mainKeyboard(requester.language)
      );
    }
  }
}

async function endSession(
  env: Env,
  userId: number,
  options: { notifyPartner: boolean; reporter?: boolean } = { notifyPartner: true }
): Promise<number | null> {
  const session = await getActiveSession(env, userId);
  const user = await getUser(env, userId);
  if (!session) {
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM queue WHERE user_id = ?`).bind(userId),
      env.DB.prepare(`UPDATE users SET status = 'idle', updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`).bind(userId)
    ]);
    return null;
  }

  const partnerId = partnerOf(session, userId);
  const partner = await getUser(env, partnerId);
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP, ended_by = ?
       WHERE id = ? AND status = 'active'`
    ).bind(userId, session.id),
    env.DB.prepare(`DELETE FROM queue WHERE user_id IN (?, ?)`).bind(userId, partnerId),
    env.DB.prepare(
      `UPDATE users SET status = 'idle', updated_at = CURRENT_TIMESTAMP WHERE user_id IN (?, ?)`
    ).bind(userId, partnerId)
  ]);

  if (options.notifyPartner && partner) {
    await Promise.allSettled([
      sendMessage(
        env,
        partnerId,
        partner.language === "uz" ? "Suhbatdosh suhbatni yakunladi." : "Собеседник завершил разговор.",
        mainKeyboard(partner.language)
      )
    ]);
  }

  if (user) {
    await env.DB.prepare(`UPDATE users SET status = 'idle' WHERE user_id = ?`).bind(userId).run();
  }
  return partnerId;
}

async function reportPartner(env: Env, userId: number): Promise<void> {
  const user = await ensureUser(env, userId);
  const session = await getActiveSession(env, userId);
  if (!session) {
    await sendMessage(env, userId, user.language === "uz" ? "Faol suhbat yo‘q." : "Активного разговора уже нет.", mainKeyboard(user.language));
    return;
  }

  const partnerId = partnerOf(session, userId);
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO blocks (blocker_user_id, blocked_user_id) VALUES (?, ?)`).bind(userId, partnerId),
    env.DB.prepare(
      `INSERT INTO reports (reporter_user_id, reported_user_id, session_id) VALUES (?, ?, ?)`
    ).bind(userId, partnerId, session.id),
    env.DB.prepare(
      `UPDATE users SET trust_score = MAX(0, trust_score - 20), updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
    ).bind(partnerId)
  ]);

  await endSession(env, userId, { notifyPartner: true, reporter: true });
  await sendMessage(
    env,
    userId,
    user.language === "uz"
      ? "⚠️ <b>Shikoyat qabul qilindi</b>\n\nBu foydalanuvchi sizga boshqa chiqmaydi. Shikoyatlar moslashtirishdagi ichki ishonch darajasiga ham ta’sir qiladi."
      : "⚠️ <b>Жалоба принята</b>\n\nЭтот пользователь больше вам не попадётся. Жалобы также влияют на внутренний уровень доверия при подборе.",
    mainKeyboard(user.language)
  );
}

function isAnyMedia(message: TelegramMessage): boolean {
  return Boolean(
    message.photo || message.video || message.video_note || message.voice || message.audio ||
    message.animation || message.document || message.sticker
  );
}

async function incrementTextCount(env: Env, sessionId: number): Promise<number> {
  const updated = await env.DB.prepare(
    `UPDATE sessions SET text_message_count = text_message_count + 1
     WHERE id = ? AND status = 'active'
     RETURNING text_message_count AS count`
  ).bind(sessionId).first<CountRow>();
  return updated?.count ?? 0;
}

async function requestMediaConsent(env: Env, userId: number): Promise<void> {
  const user = await ensureUser(env, userId);
  const session = await getActiveSession(env, userId);
  if (!session) {
    await sendMessage(env, userId, user.language === "uz" ? "Faol suhbat yo‘q." : "Нет активного разговора.", mainKeyboard(user.language));
    return;
  }

  if (session.media_unlocked === 1) {
    await sendMessage(env, userId, user.language === "uz" ? "🔓 Media allaqachon ochiq." : "🔓 Медиа уже открыты.", activeChatKeyboard(user.language, true));
    return;
  }

  if (session.text_message_count < MEDIA_TEXT_THRESHOLD) {
    const left = MEDIA_TEXT_THRESHOLD - session.text_message_count;
    await sendMessage(
      env,
      userId,
      user.language === "uz"
        ? `🔒 Avval biroz gaplashing. Mediani ochish taklifi yana <b>${left}</b> ta matnli xabardan keyin mavjud bo‘ladi.`
        : `🔒 Сначала немного поговорите. Разблокировать медиа можно ещё через <b>${left}</b> текстовых сообщений в этом разговоре.`
    );
    return;
  }

  await env.DB.prepare(
    `INSERT INTO session_media_consents (session_id, user_id, consented, updated_at)
     VALUES (?, ?, 1, CURRENT_TIMESTAMP)
     ON CONFLICT(session_id, user_id) DO UPDATE SET consented = 1, updated_at = CURRENT_TIMESTAMP`
  ).bind(session.id, userId).run();

  const consent = await env.DB.prepare(
    `SELECT SUM(CASE WHEN consented = 1 THEN 1 ELSE 0 END) AS total
     FROM session_media_consents WHERE session_id = ?`
  ).bind(session.id).first<MediaConsentRow>();

  const partnerId = partnerOf(session, userId);
  const partner = await getUser(env, partnerId);
  if ((consent?.total ?? 0) >= 2) {
    await env.DB.prepare(`UPDATE sessions SET media_unlocked = 1 WHERE id = ? AND status = 'active'`).bind(session.id).run();
    await Promise.allSettled([
      sendMessage(env, userId, user.language === "uz" ? "🔓 <b>Media ochildi</b>\n\nIkki tomon ham rozi bo‘ldi. Endi foto, video, ovozli xabar va stiker yuborish mumkin. Kontakt va geolokatsiya baribir bloklangan." : "🔓 <b>Медиа открыты</b>\n\nОбе стороны согласились. Теперь можно отправлять фото, видео, голосовые и стикеры. Контакты и геолокация всё равно заблокированы.", activeChatKeyboard(user.language, true)),
      ...(partner ? [sendMessage(env, partnerId, partner.language === "uz" ? "🔓 <b>Media ochildi</b>\n\nIkki tomon ham rozi bo‘ldi. Endi media yuborish mumkin." : "🔓 <b>Медиа открыты</b>\n\nОбе стороны согласились. Теперь можно отправлять медиа.", activeChatKeyboard(partner.language, true))] : [])
    ]);
    return;
  }

  await sendMessage(env, userId, user.language === "uz" ? "Roziligingiz saqlandi. Ikkinchi tomon ham rozi bo‘lsa, media ochiladi." : "Ваше согласие сохранено. Медиа откроются, только если согласится и вторая сторона.");
  if (partner) {
    await sendMessage(
      env,
      partnerId,
      partner.language === "uz" ? "🔐 Suhbatdoshingiz mediani ochishga rozi. Agar siz ham xohlasangiz, tasdiqlang." : "🔐 Собеседник согласен открыть медиа. Если вы тоже хотите — подтвердите.",
      activeChatKeyboard(partner.language, false)
    );
  }
}

async function relayMessage(env: Env, message: TelegramMessage): Promise<void> {
  const userId = message.from?.id;
  if (!userId || message.chat.type !== "private") return;
  const user = await ensureUser(env, userId);

  if (message.contact || message.location || message.venue) {
    await sendMessage(
      env,
      userId,
      user.language === "uz"
        ? "🔒 Maxfiylik uchun kontakt va geolokatsiyani Sirdosh orqali yuborib bo‘lmaydi."
        : "🔒 Для приватности контакты и геолокацию через Sirdosh отправлять нельзя."
    );
    return;
  }

  const session = await getActiveSession(env, userId);
  if (!session) {
    if (!user.language_selected || !user.age_confirmed || !user.gender) {
      await showStart(env, userId);
    } else if (user.status === "waiting") {
      await sendMessage(env, userId, user.language === "uz" ? "⏳ Siz qidiruvdasiz. Telegramni yopishingiz mumkin — Sirdosh mos odam paydo bo‘lsa yozadi." : "⏳ Вы в поиске. Telegram можно закрыть — Sirdosh напишет, когда появится подходящий человек.", waitingKeyboard(user.language));
    } else {
      await sendMessage(env, userId, user.language === "uz" ? "Avval suhbatni tanlang." : "Сначала выберите разговор.", mainKeyboard(user.language));
    }
    return;
  }

  const partnerId = partnerOf(session, userId);
  if (session.media_unlocked !== 1 && isAnyMedia(message)) {
    await sendMessage(
      env,
      userId,
      user.language === "uz"
        ? "🔒 <b>Hozircha faqat matn</b>\n\nSirdosh avval suhbat qurishga vaqt beradi. Keyin media faqat ikki tomonning alohida roziligidan so‘ng ochiladi."
        : "🔒 <b>Пока только текст</b>\n\nSirdosh сначала даёт время поговорить. Затем медиа открываются только после отдельного согласия обеих сторон.",
      activeChatKeyboard(user.language, false)
    );
    return;
  }

  try {
    await telegramCall(env, "copyMessage", {
      chat_id: partnerId,
      from_chat_id: message.chat.id,
      message_id: message.message_id,
      protect_content: true
    });

    if (message.text && session.media_unlocked !== 1) {
      const count = await incrementTextCount(env, session.id);
      if (count === MEDIA_TEXT_THRESHOLD) {
        const partner = await getUser(env, partnerId);
        await Promise.allSettled([
          sendMessage(env, userId, user.language === "uz" ? "🔐 <b>Media ruxsati endi mavjud</b>\n\nAgar xohlasangiz, foto/ovoz/video almashishni taklif qilishingiz mumkin. U faqat ikki tomon roziligi bilan ochiladi." : "🔐 <b>Теперь доступно разрешение медиа</b>\n\nПри желании можно предложить обмен фото/голосовыми/видео. Он откроется только по согласию обеих сторон.", activeChatKeyboard(user.language, false)),
          ...(partner ? [sendMessage(env, partnerId, partner.language === "uz" ? "🔐 <b>Media ruxsati endi mavjud</b>\n\nU faqat ikki tomon roziligi bilan ochiladi." : "🔐 <b>Теперь доступно разрешение медиа</b>\n\nОно откроется только по согласию обеих сторон.", activeChatKeyboard(partner.language, false))] : [])
        ]);
      }
    }
  } catch (error) {
    console.error("copyMessage failed", error);
    const errorText = error instanceof Error ? error.message : String(error);
    const unavailable = /blocked by the user|chat not found|user is deactivated|bot can't initiate/i.test(errorText);
    if (unavailable) {
      await endSession(env, userId, { notifyPartner: false });
      await sendMessage(env, userId, user.language === "uz" ? "Suhbatdosh hozir mavjud emas. Suhbat yopildi — yangisini tanlashingiz mumkin." : "Собеседник сейчас недоступен. Разговор закрыт — можно выбрать новый.", mainKeyboard(user.language));
      return;
    }
    await sendMessage(env, userId, user.language === "uz" ? "Bu xabarni yuborib bo‘lmadi. Boshqa formatni sinab ko‘ring." : "Не удалось отправить именно это сообщение. Попробуйте другой формат.");
  }
}

async function handlePendingText(env: Env, message: TelegramMessage, user: UserRow): Promise<boolean> {
  const action = user.pending_action;
  if (!action || !message.text || message.text.startsWith("/")) return false;

  const value = message.text.trim().replace(/\s+/g, " ");
  if (value.length < 10 || value.length > 180) {
    await sendMessage(
      env,
      user.user_id,
      user.language === "uz" ? "Jumla 10–180 belgi bo‘lishi kerak. Qayta yozing." : "Фраза должна быть длиной 10–180 символов. Попробуйте ещё раз."
    );
    return true;
  }

  if (containsContactHint(value)) {
    await sendMessage(
      env,
      user.user_id,
      user.language === "uz"
        ? "🛡 Anonim kartada @username, t.me havolasi yoki telefon raqami bo‘lmasligi kerak. Shaxsiy ma’lumotsiz qayta yozing."
        : "🛡 В анонимной карточке нельзя указывать @username, ссылку t.me или номер телефона. Напишите фразу без контактных данных."
    );
    return true;
  }

  await env.DB.prepare(
    `UPDATE users SET intro_text = ?, pending_action = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
  ).bind(value, user.user_id).run();

  if (action === "card_intro") {
    await publishCard(env, user.user_id);
    return true;
  }
  if (action === "settings_intro") {
    const refreshed = await getUser(env, user.user_id);
    if (refreshed) {
      await sendMessage(env, user.user_id, user.language === "uz" ? "Anonim jumla yangilandi." : "Анонимная фраза обновлена.", settingsKeyboard(user.language));
    }
    return true;
  }
  if (action.startsWith("inbox_intro:")) {
    const cardId = Number(action.split(":")[1]);
    if (Number.isFinite(cardId)) await requestCard(env, user.user_id, cardId);
    return true;
  }

  return true;
}

function tashkentNow(date = new Date()): { date: string; hour: number; minute: number } {
  const ms = date.getTime() + 5 * 60 * 60 * 1000;
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return { date: `${year}-${month}-${day}`, hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

function nextEveningDate(): string {
  const now = tashkentNow();
  if (now.hour < 21) return now.date;
  const base = new Date(`${now.date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + 1);
  return base.toISOString().slice(0, 10);
}

async function showEvening(env: Env, userId: number): Promise<void> {
  const user = await requireDiscoveryReady(env, userId);
  if (!user) return;
  const now = tashkentNow();

  if (now.hour >= 21 && now.hour < 24) {
    await sendMessage(
      env,
      userId,
      user.language === "uz"
        ? "🌙 <b>Kechki suhbat ochiq</b>\n\nHozir odamlarni bir vaqtga jamlaymiz. Qidiruvni bosganingizda odatiy xavfsiz tasdiqlash ishlaydi."
        : "🌙 <b>Вечерний чат открыт</b>\n\nСейчас мы собираем людей в одно временное окно. После поиска всё равно работает безопасное подтверждение перед разговором.",
      { inline_keyboard: [[{ text: user.language === "uz" ? "🌙 Hozir qo‘shilish" : "🌙 Присоединиться сейчас", callback_data: "evening:start" }], [{ text: user.language === "uz" ? "🏠 Menyu" : "🏠 Меню", callback_data: "menu" }]] }
    );
    return;
  }

  const eventDate = nextEveningDate();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO evening_signups (user_id, event_date, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)`
  ).bind(userId, eventDate).run();
  await sendMessage(
    env,
    userId,
    user.language === "uz"
      ? `🌙 <b>Kechki suhbatga yozildingiz</b>\n\nToshkent vaqti bilan <b>21:00</b> da Sirdosh sizga eslatadi. Maqsad — kichik auditoriyani kun bo‘yi tarqatib yubormasdan, bir vaqtga jamlash.`
      : `🌙 <b>Вы записаны на вечерний чат</b>\n\nВ <b>21:00 по Ташкенту</b> Sirdosh пришлёт приглашение. Смысл режима — не размазывать маленькую аудиторию по всему дню, а собирать её в одно окно.`,
    mainKeyboard(user.language)
  );
}

async function showSettings(env: Env, userId: number): Promise<void> {
  const user = await requireDiscoveryReady(env, userId);
  if (!user) return;
  const intro = user.intro_text ? `“${escapeHtml(user.intro_text)}”` : (user.language === "uz" ? "Kiritilmagan" : "Не задана");
  await sendMessage(
    env,
    userId,
    user.language === "uz"
      ? `⚙️ <b>Sozlamalar</b>\n\n🌐 Til: <b>${languageLabel(user.language)}</b>\n🎭 Jins: <b>${genderLabel(user.gender!, user.language)}</b>\n💭 Mavzu: <b>${escapeHtml(intentLabel(user.intent, user.language))}</b>\n✍️ Jumla: ${intro}`
      : `⚙️ <b>Настройки</b>\n\n🌐 Язык: <b>${languageLabel(user.language)}</b>\n🎭 Пол: <b>${genderLabel(user.gender!, user.language)}</b>\n💭 Тема: <b>${escapeHtml(intentLabel(user.intent, user.language))}</b>\n✍️ Фраза: ${intro}`,
    settingsKeyboard(user.language)
  );
}

async function showSafety(env: Env, userId: number): Promise<void> {
  const user = await ensureUser(env, userId);
  await sendMessage(
    env,
    userId,
    user.language === "uz"
      ? `🛡 <b>Sirdosh Safety</b>\n\n• Xizmat faqat 18+.\n• Telegram profilingiz, username va telefon raqamingiz suhbatdoshga avtomatik ko‘rsatilmaydi.\n• Oddiy chat xabarlari D1 bazasida saqlanmaydi.\n• Avval faqat matn; media ikki tomonning roziligidan keyin ochiladi.\n• Kontakt va geolokatsiya bloklangan.\n• Shikoyat qilingan juftlik qayta uchrashmaydi.\n• Shaxsiy ma’lumotlarni o‘zingiz yozsangiz, anonimlik yo‘qolishi mumkin.\n\n<b>Nazorat sizda:</b> suhbatni istalgan payt tugatish yoki shikoyat qilish mumkin.`
      : `🛡 <b>Sirdosh Safety</b>\n\n• Сервис только для 18+.\n• Telegram-профиль, username и номер телефона автоматически не раскрываются собеседнику.\n• Обычные сообщения разговора не сохраняются в D1.\n• Сначала только текст; медиа открываются по взаимному согласию.\n• Контакты и геолокация заблокированы.\n• После жалобы эта пара больше не соединяется.\n• Если вы сами напишете личные данные, анонимность может быть утрачена.\n\n<b>Контроль остаётся у вас:</b> разговор можно закончить или пожаловаться в любой момент.`,
    { inline_keyboard: [[{ text: user.language === "uz" ? "🏠 Menyu" : "🏠 Меню", callback_data: "menu" }]] }
  );
}

async function handleCommand(env: Env, message: TelegramMessage): Promise<boolean> {
  const userId = message.from?.id;
  const text = message.text?.trim();
  if (!userId || !text?.startsWith("/")) return false;
  const command = text.split(/\s+/, 1)[0].split("@")[0].toLowerCase();

  switch (command) {
    case "/start":
      await showStart(env, userId);
      return true;
    case "/find":
      await startSearch(env, userId);
      return true;
    case "/inbox":
      await showInbox(env, userId);
      return true;
    case "/evening":
      await showEvening(env, userId);
      return true;
    case "/safety":
      await showSafety(env, userId);
      return true;
    case "/next": {
      const user = await ensureUser(env, userId);
      await endSession(env, userId, { notifyPartner: true });
      await sendMessage(env, userId, user.language === "uz" ? "Yangi suhbat qidiramiz." : "Ищем новый разговор.");
      await startSearch(env, userId);
      return true;
    }
    case "/stop": {
      const user = await ensureUser(env, userId);
      await endSession(env, userId, { notifyPartner: true });
      await sendMessage(env, userId, user.language === "uz" ? "Suhbat tugatildi." : "Разговор завершён.", mainKeyboard(user.language));
      return true;
    }
    default:
      await showStart(env, userId);
      return true;
  }
}

function parseIntent(value: string): Intent | null {
  return (["talk", "meet", "vent", "night", "random"] as string[]).includes(value) ? value as Intent : null;
}

async function handleCallback(env: Env, query: TelegramCallbackQuery): Promise<void> {
  const userId = query.from.id;
  const data = query.data ?? "";
  try {
    await answerCallback(env, query.id);
  } catch (error) {
    console.error("answerCallbackQuery failed", error);
  }

  if (data === "lang:ru" || data === "lang:uz") {
    const lang: Lang = data.endsWith("uz") ? "uz" : "ru";
    await setLanguage(env, userId, lang);
    await showStart(env, userId);
    return;
  }

  if (data === "age:yes") {
    const user = await ensureUser(env, userId);
    await env.DB.prepare(`UPDATE users SET age_confirmed = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`).bind(userId).run();
    await sendMessage(env, userId, user.language === "uz" ? "Tasdiqlandi." : "Подтверждено.");
    await showStart(env, userId);
    return;
  }

  if (data === "age:no") {
    const user = await ensureUser(env, userId);
    await sendMessage(
      env,
      userId,
      user.language === "uz" ? "Sirdosh faqat 18 yoshdan katta foydalanuvchilar uchun. Hozir xizmatdan foydalana olmaysiz." : "Sirdosh предназначен только для пользователей старше 18 лет. Сейчас использовать сервис нельзя."
    );
    return;
  }

  if (data === "gender:male" || data === "gender:female") {
    const user = await ensureUser(env, userId);
    if (await getActiveSession(env, userId)) {
      await sendMessage(env, userId, user.language === "uz" ? "Avval hozirgi suhbatni tugating." : "Сначала завершите текущий разговор.", activeChatKeyboard(user.language));
      return;
    }
    const gender: Gender = data === "gender:male" ? "male" : "female";
    await setGender(env, userId, gender);
    const refreshed = await getUser(env, userId);
    if (refreshed) await showMain(env, refreshed);
    return;
  }

  if (data.startsWith("intent:")) {
    const parts = data.split(":");
    const context = parts[1] as "find" | "card" | "settings";
    const intent = parseIntent(parts[2] ?? "");
    if (!intent) return;
    await setIntent(env, userId, intent);
    if (context === "find") await startSearch(env, userId);
    else if (context === "card") await publishCard(env, userId);
    else await showSettings(env, userId);
    return;
  }

  if (data.startsWith("offer:accept:")) {
    const id = Number(data.split(":")[2]);
    if (Number.isFinite(id)) await acceptOffer(env, userId, id);
    return;
  }
  if (data.startsWith("offer:decline:")) {
    const id = Number(data.split(":")[2]);
    if (Number.isFinite(id)) await declineOffer(env, userId, id);
    return;
  }
  if (data.startsWith("card:request:")) {
    const id = Number(data.split(":")[2]);
    if (Number.isFinite(id)) await requestCard(env, userId, id);
    return;
  }
  if (data.startsWith("card:next:")) {
    const ownerId = Number(data.split(":")[2]);
    if (Number.isFinite(ownerId)) await addSkip(env, userId, ownerId, 6);
    await showInbox(env, userId);
    return;
  }

  const user = await ensureUser(env, userId);
  switch (data) {
    case "menu":
      await showStart(env, userId);
      break;
    case "find":
      await startSearch(env, userId);
      break;
    case "cancel_search":
      await cancelSearch(env, userId);
      break;
    case "inbox":
      await showInbox(env, userId);
      break;
    case "card:publish":
      await publishCard(env, userId);
      break;
    case "evening":
      await showEvening(env, userId);
      break;
    case "evening:start":
      await startSearch(env, userId);
      break;
    case "settings":
      await showSettings(env, userId);
      break;
    case "settings:language":
      await sendMessage(env, userId, user.language === "uz" ? "Tilni tanlang:" : "Выберите язык:", langKeyboard());
      break;
    case "settings:gender":
      if (await getActiveSession(env, userId)) {
        await sendMessage(env, userId, user.language === "uz" ? "Avval suhbatni tugating." : "Сначала завершите разговор.", activeChatKeyboard(user.language));
      } else {
        await sendMessage(env, userId, user.language === "uz" ? "Jinsni tanlang:" : "Выберите пол:", genderKeyboard(user.language));
      }
      break;
    case "settings:intent":
      await sendMessage(env, userId, user.language === "uz" ? "Asosiy suhbat mavzusini tanlang:" : "Выберите основную тему разговора:", intentKeyboard(user.language, "settings"));
      break;
    case "settings:intro":
      await setPendingAction(env, userId, "settings_intro");
      await sendMessage(env, userId, user.language === "uz" ? "Yangi anonim jumlangizni yuboring (10–180 belgi)." : "Отправьте новую анонимную фразу (10–180 символов).");
      break;
    case "safety":
      await showSafety(env, userId);
      break;
    case "media:consent":
      await requestMediaConsent(env, userId);
      break;
    case "next":
      await endSession(env, userId, { notifyPartner: true });
      await startSearch(env, userId);
      break;
    case "stop":
      await endSession(env, userId, { notifyPartner: true });
      await sendMessage(env, userId, user.language === "uz" ? "Suhbat tugatildi." : "Разговор завершён.", mainKeyboard(user.language));
      break;
    case "report":
      await reportPartner(env, userId);
      break;
    default:
      await showStart(env, userId);
  }
}

async function handleUpdate(env: Env, update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallback(env, update.callback_query);
    return;
  }

  const message = update.message;
  if (!message || !message.from || message.chat.type !== "private" || message.from.is_bot) return;
  const user = await ensureUser(env, message.from.id);
  if (await handleCommand(env, message)) return;
  if (await handlePendingText(env, message, user)) return;
  await relayMessage(env, message);
}

async function cleanupExpiredOffers(env: Env): Promise<void> {
  const expired = await env.DB.prepare(
    `SELECT id, kind, user_a_id, user_b_id, user_a_accepted, user_b_accepted,
            user_a_accepted_at, user_b_accepted_at, status, created_at, expires_at
     FROM match_offers
     WHERE status = 'pending' AND expires_at <= CURRENT_TIMESTAMP
     ORDER BY id ASC LIMIT 100`
  ).all<OfferRow>();

  for (const offer of expired.results ?? []) {
    await env.DB.prepare(
      `UPDATE match_offers SET status = 'expired', decided_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`
    ).bind(offer.id).run();
    await Promise.all([addSkip(env, offer.user_a_id, offer.user_b_id, 1), addSkip(env, offer.user_b_id, offer.user_a_id, 1)]);

    if (offer.kind === "live") {
      for (const id of [offer.user_a_id, offer.user_b_id]) {
        const u = await getUser(env, id);
        if (u?.gender && u.status === "waiting" && !(await getActiveSession(env, id))) {
          await queueUser(env, id, u.gender);
        }
      }
    }
  }
}

async function cleanupOldDiscovery(env: Env): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`UPDATE intro_cards SET status = 'expired' WHERE status = 'active' AND expires_at <= CURRENT_TIMESTAMP`),
    env.DB.prepare(`DELETE FROM match_skips WHERE expires_at <= CURRENT_TIMESTAMP`),
    env.DB.prepare(
      `DELETE FROM queue WHERE created_at < datetime('now', ?)`
    ).bind(`-${LIVE_QUEUE_HOURS} hours`),
    env.DB.prepare(
      `UPDATE users SET status = 'idle', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'waiting'
         AND user_id NOT IN (SELECT user_id FROM queue)
         AND user_id NOT IN (
           SELECT user_a_id FROM match_offers WHERE status = 'pending'
           UNION SELECT user_b_id FROM match_offers WHERE status = 'pending'
         )
         AND user_id NOT IN (
           SELECT male_user_id FROM sessions WHERE status = 'active'
           UNION SELECT female_user_id FROM sessions WHERE status = 'active'
         )`
    )
  ]);
}

async function notifyEvening(env: Env): Promise<void> {
  const now = tashkentNow();
  if (now.hour !== 21 || now.minute >= 10) return;

  const rows = await env.DB.prepare(
    `SELECT e.user_id
     FROM evening_signups e
     JOIN users u ON u.user_id = e.user_id
     WHERE e.event_date = ? AND e.notified_at IS NULL AND u.age_confirmed = 1
     ORDER BY e.created_at ASC LIMIT 200`
  ).bind(now.date).all<{ user_id: number }>();

  for (const row of rows.results ?? []) {
    const user = await getUser(env, row.user_id);
    if (!user) continue;
    try {
      await sendMessage(
        env,
        user.user_id,
        user.language === "uz"
          ? "🌙 <b>Kechki suhbat boshlandi</b>\n\nHozir odamlar bir vaqtning o‘zida kiryapti. Agar gaplashishga tayyor bo‘lsangiz, qo‘shiling."
          : "🌙 <b>Вечерний чат начался</b>\n\nСейчас люди заходят в одно и то же время. Если готовы поговорить — присоединяйтесь.",
        { inline_keyboard: [[{ text: user.language === "uz" ? "🌙 Suhbat topish" : "🌙 Найти разговор", callback_data: "evening:start" }]] }
      );
      await env.DB.prepare(`UPDATE evening_signups SET notified_at = CURRENT_TIMESTAMP WHERE user_id = ? AND event_date = ?`)
        .bind(user.user_id, now.date).run();
    } catch (error) {
      console.error("evening notification failed", user.user_id, error);
    }
  }
}

async function scheduledMaintenance(env: Env): Promise<void> {
  await cleanupExpiredOffers(env);
  await cleanupOldDiscovery(env);
  await notifyEvening(env);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "sirdosh", version: 2 });
    }

    if (request.method !== "POST" || url.pathname !== "/webhook") {
      return json({ ok: false, error: "Not found" }, 404);
    }

    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    try {
      const update = (await request.json()) as TelegramUpdate;
      await handleUpdate(env, update);
      return json({ ok: true });
    } catch (error) {
      console.error("Webhook handling failed", error);
      return json({ ok: true });
    }
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(scheduledMaintenance(env));
  }
};
