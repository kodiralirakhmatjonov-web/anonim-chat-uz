interface Env {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
}

type Gender = "male" | "female";

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
  contact?: unknown;
  location?: unknown;
  venue?: unknown;
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
  status: "idle" | "waiting" | "chatting";
};

type SessionRow = {
  id: number;
  male_user_id: number;
  female_user_id: number;
};

type ClaimedQueueRow = {
  user_id: number;
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
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

function genderKeyboard(): Record<string, unknown> {
  return {
    inline_keyboard: [
      [
        { text: "👨 Мужчина", callback_data: "gender:male" },
        { text: "👩 Женщина", callback_data: "gender:female" }
      ]
    ]
  };
}

function mainKeyboard(): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: "🔎 Найти собеседника", callback_data: "find" }],
      [{ text: "⚙️ Изменить пол", callback_data: "change_gender" }]
    ]
  };
}

function waitingKeyboard(): Record<string, unknown> {
  return {
    inline_keyboard: [[{ text: "✖️ Отменить поиск", callback_data: "cancel_search" }]]
  };
}

function activeChatKeyboard(): Record<string, unknown> {
  return {
    inline_keyboard: [
      [
        { text: "🔀 Следующий", callback_data: "next" },
        { text: "✖️ Завершить", callback_data: "stop" }
      ],
      [{ text: "⚠️ Пожаловаться", callback_data: "report" }]
    ]
  };
}

function genderLabel(gender: Gender): string {
  return gender === "male" ? "Мужчина" : "Женщина";
}

async function ensureUser(env: Env, userId: number): Promise<UserRow> {
  await env.DB.prepare(
    `INSERT INTO users (user_id) VALUES (?) ON CONFLICT(user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`
  )
    .bind(userId)
    .run();

  const user = await env.DB.prepare(
    `SELECT user_id, gender, status FROM users WHERE user_id = ? LIMIT 1`
  )
    .bind(userId)
    .first<UserRow>();

  if (!user) throw new Error("Failed to load user after upsert");
  return user;
}

async function getUser(env: Env, userId: number): Promise<UserRow | null> {
  return env.DB.prepare(`SELECT user_id, gender, status FROM users WHERE user_id = ? LIMIT 1`)
    .bind(userId)
    .first<UserRow>();
}

async function getActiveSession(env: Env, userId: number): Promise<SessionRow | null> {
  return env.DB.prepare(
    `SELECT id, male_user_id, female_user_id
     FROM sessions
     WHERE status = 'active' AND (male_user_id = ? OR female_user_id = ?)
     ORDER BY id DESC
     LIMIT 1`
  )
    .bind(userId, userId)
    .first<SessionRow>();
}

function partnerOf(session: SessionRow, userId: number): number {
  return session.male_user_id === userId ? session.female_user_id : session.male_user_id;
}

async function setGender(env: Env, userId: number, gender: Gender): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM queue WHERE user_id = ?`).bind(userId),
    env.DB.prepare(
      `INSERT INTO users (user_id, gender, status, updated_at)
       VALUES (?, ?, 'idle', CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         gender = excluded.gender,
         status = 'idle',
         updated_at = CURRENT_TIMESTAMP`
    ).bind(userId, gender)
  ]);
}

async function showStart(env: Env, userId: number): Promise<void> {
  const user = await ensureUser(env, userId);
  const session = await getActiveSession(env, userId);

  if (session) {
    await sendMessage(
      env,
      userId,
      "💬 <b>Анонимный чат активен</b>\n\nПишите сообщение — я передам его собеседнику без показа вашего Telegram-профиля.",
      activeChatKeyboard()
    );
    return;
  }

  if (!user.gender) {
    await sendMessage(
      env,
      userId,
      "👋 <b>Добро пожаловать в анонимный чат</b>\n\nДля начала выберите ваш пол. Эта информация нужна только для подбора собеседника и не показывается другому пользователю.",
      genderKeyboard()
    );
    return;
  }

  if (user.status === "waiting") {
    await sendMessage(
      env,
      userId,
      "⏳ <b>Ищем собеседника…</b>\n\nВы уже в очереди. Как только найдётся подходящий человек, чат начнётся автоматически.",
      waitingKeyboard()
    );
    return;
  }

  await sendMessage(
    env,
    userId,
    `🎭 <b>Анонимный чат</b>\n\nВаш пол: <b>${genderLabel(user.gender)}</b>\nСейчас подбор соединяет мужчину с женщиной.\n\nМы не сохраняем текст вашей переписки.`,
    mainKeyboard()
  );
}

async function claimOppositeGenderUser(
  env: Env,
  userId: number,
  gender: Gender
): Promise<number | null> {
  const opposite: Gender = gender === "male" ? "female" : "male";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const claimed = await env.DB.prepare(
      `DELETE FROM queue
       WHERE user_id = (
         SELECT q.user_id
         FROM queue q
         WHERE q.gender = ?
           AND q.user_id != ?
           AND NOT EXISTS (
             SELECT 1 FROM blocks b
             WHERE (b.blocker_user_id = ? AND b.blocked_user_id = q.user_id)
                OR (b.blocker_user_id = q.user_id AND b.blocked_user_id = ?)
           )
         ORDER BY q.created_at ASC
         LIMIT 1
       )
       RETURNING user_id`
    )
      .bind(opposite, userId, userId, userId)
      .first<ClaimedQueueRow>();

    if (!claimed) return null;

    const alreadyBusy = await getActiveSession(env, claimed.user_id);
    if (!alreadyBusy) return claimed.user_id;

    await env.DB.prepare(`UPDATE users SET status = 'chatting', updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`)
      .bind(claimed.user_id)
      .run();
  }

  return null;
}

async function createSession(
  env: Env,
  userId: number,
  partnerId: number,
  gender: Gender
): Promise<SessionRow> {
  const maleId = gender === "male" ? userId : partnerId;
  const femaleId = gender === "female" ? userId : partnerId;

  const session = await env.DB.prepare(
    `INSERT INTO sessions (male_user_id, female_user_id, status)
     VALUES (?, ?, 'active')
     RETURNING id, male_user_id, female_user_id`
  )
    .bind(maleId, femaleId)
    .first<SessionRow>();

  if (!session) throw new Error("Failed to create session");

  await env.DB.batch([
    env.DB.prepare(`DELETE FROM queue WHERE user_id IN (?, ?)`).bind(userId, partnerId),
    env.DB.prepare(
      `UPDATE users SET status = 'chatting', updated_at = CURRENT_TIMESTAMP WHERE user_id IN (?, ?)`
    ).bind(userId, partnerId)
  ]);

  return session;
}

async function queueUser(env: Env, userId: number, gender: Gender): Promise<void> {
  if (await getActiveSession(env, userId)) {
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM queue WHERE user_id = ?`).bind(userId),
      env.DB.prepare(
        `UPDATE users SET status = 'chatting', updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
      ).bind(userId)
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

async function startSearch(env: Env, userId: number): Promise<void> {
  const user = await ensureUser(env, userId);
  if (!user.gender) {
    await sendMessage(env, userId, "Сначала выберите ваш пол.", genderKeyboard());
    return;
  }

  const currentSession = await getActiveSession(env, userId);
  if (currentSession) {
    await sendMessage(env, userId, "У вас уже есть активный чат.", activeChatKeyboard());
    return;
  }

  await env.DB.prepare(`DELETE FROM queue WHERE user_id = ?`).bind(userId).run();

  const partnerId = await claimOppositeGenderUser(env, userId, user.gender);
  if (!partnerId) {
    await queueUser(env, userId, user.gender);
    await sendMessage(
      env,
      userId,
      "⏳ <b>Ищем собеседника…</b>\n\nВы в очереди. Как только найдётся подходящий человек, чат начнётся автоматически.",
      waitingKeyboard()
    );
    return;
  }

  try {
    await createSession(env, userId, partnerId, user.gender);
  } catch (error) {
    console.error("createSession failed", error);
    const partner = await getUser(env, partnerId);
    if (partner?.gender && !(await getActiveSession(env, partnerId))) {
      await queueUser(env, partnerId, partner.gender);
    }

    const existingSession = await getActiveSession(env, userId);
    if (existingSession) {
      await env.DB.prepare(`DELETE FROM queue WHERE user_id = ?`).bind(userId).run();
      await sendMessage(env, userId, "У вас уже есть активный чат.", activeChatKeyboard());
      return;
    }

    await queueUser(env, userId, user.gender);
    await sendMessage(env, userId, "⏳ Поиск продолжается…", waitingKeyboard());
    return;
  }

  const text =
    "✅ <b>Собеседник найден</b>\n\nВы ничего не знаете друг о друге. Просто поговорите.\n\nПишите сообщение — я передам его анонимно.";

  const [userNotice, partnerNotice] = await Promise.allSettled([
    sendMessage(env, userId, text, activeChatKeyboard()),
    sendMessage(env, partnerId, text, activeChatKeyboard())
  ]);

  if (partnerNotice.status === "rejected") {
    console.error("Partner notification failed", partnerNotice.reason);
    await endSession(env, userId, { notifyPartner: false });
    if (userNotice.status === "fulfilled") {
      await sendMessage(
        env,
        userId,
        "Собеседник оказался недоступен. Продолжаем поиск.",
        waitingKeyboard()
      );
    }
    await startSearch(env, userId);
  }
}

async function cancelSearch(env: Env, userId: number): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM queue WHERE user_id = ?`).bind(userId),
    env.DB.prepare(
      `UPDATE users SET status = 'idle', updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status = 'waiting'`
    ).bind(userId)
  ]);
  await sendMessage(env, userId, "Поиск отменён.", mainKeyboard());
}

async function endSession(
  env: Env,
  userId: number,
  options: { notifyPartner: boolean; reporter?: boolean } = { notifyPartner: true }
): Promise<number | null> {
  const session = await getActiveSession(env, userId);
  if (!session) {
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM queue WHERE user_id = ?`).bind(userId),
      env.DB.prepare(
        `UPDATE users SET status = 'idle', updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
      ).bind(userId)
    ]);
    return null;
  }

  const partnerId = partnerOf(session, userId);

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP, ended_by = ? WHERE id = ? AND status = 'active'`
    ).bind(userId, session.id),
    env.DB.prepare(`DELETE FROM queue WHERE user_id IN (?, ?)`).bind(userId, partnerId),
    env.DB.prepare(
      `UPDATE users SET status = 'idle', updated_at = CURRENT_TIMESTAMP WHERE user_id IN (?, ?)`
    ).bind(userId, partnerId)
  ]);

  if (options.notifyPartner) {
    const partnerText = options.reporter
      ? "Собеседник завершил чат."
      : "Собеседник завершил чат.";
    await Promise.allSettled([sendMessage(env, partnerId, partnerText, mainKeyboard())]);
  }

  return partnerId;
}

async function reportPartner(env: Env, userId: number): Promise<void> {
  const session = await getActiveSession(env, userId);
  if (!session) {
    await sendMessage(env, userId, "Активного чата уже нет.", mainKeyboard());
    return;
  }

  const partnerId = partnerOf(session, userId);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT OR IGNORE INTO blocks (blocker_user_id, blocked_user_id) VALUES (?, ?)`
    ).bind(userId, partnerId),
    env.DB.prepare(
      `INSERT INTO reports (reporter_user_id, reported_user_id, session_id) VALUES (?, ?, ?)`
    ).bind(userId, partnerId, session.id)
  ]);

  await endSession(env, userId, { notifyPartner: true, reporter: true });
  await sendMessage(
    env,
    userId,
    "⚠️ <b>Жалоба принята</b>\n\nЭтот пользователь больше не попадётся вам при поиске.",
    mainKeyboard()
  );
}

async function relayMessage(env: Env, message: TelegramMessage): Promise<void> {
  const userId = message.from?.id;
  if (!userId || message.chat.type !== "private") return;

  if (message.contact || message.location || message.venue) {
    await sendMessage(
      env,
      userId,
      "🔒 Для вашей приватности контакты и геолокацию через анонимный чат отправлять нельзя."
    );
    return;
  }

  const session = await getActiveSession(env, userId);
  if (!session) {
    const user = await ensureUser(env, userId);
    if (!user.gender) {
      await sendMessage(env, userId, "Сначала выберите ваш пол.", genderKeyboard());
    } else if (user.status === "waiting") {
      await sendMessage(env, userId, "⏳ Вы всё ещё в очереди. Ищем собеседника…", waitingKeyboard());
    } else {
      await sendMessage(env, userId, "Сначала найдите собеседника.", mainKeyboard());
    }
    return;
  }

  const partnerId = partnerOf(session, userId);

  try {
    await telegramCall(env, "copyMessage", {
      chat_id: partnerId,
      from_chat_id: message.chat.id,
      message_id: message.message_id,
      protect_content: true
    });
  } catch (error) {
    console.error("copyMessage failed", error);
    const errorText = error instanceof Error ? error.message : String(error);
    const partnerUnavailable = /blocked by the user|chat not found|user is deactivated|bot can't initiate/i.test(errorText);

    if (partnerUnavailable) {
      await endSession(env, userId, { notifyPartner: false });
      await sendMessage(
        env,
        userId,
        "Собеседник сейчас недоступен. Чат завершён — можно найти нового.",
        mainKeyboard()
      );
      return;
    }

    await sendMessage(
      env,
      userId,
      "Не удалось отправить именно это сообщение. Попробуйте текст, фото, видео, голосовое или стикер."
    );
  }
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
    case "/next":
      await endSession(env, userId, { notifyPartner: true });
      await startSearch(env, userId);
      return true;
    case "/stop":
      await endSession(env, userId, { notifyPartner: true });
      await sendMessage(env, userId, "Чат завершён.", mainKeyboard());
      return true;
    default:
      await showStart(env, userId);
      return true;
  }
}

async function handleCallback(env: Env, query: TelegramCallbackQuery): Promise<void> {
  const userId = query.from.id;
  const data = query.data ?? "";

  try {
    await answerCallback(env, query.id);
  } catch (error) {
    console.error("answerCallbackQuery failed", error);
  }

  if (data === "gender:male" || data === "gender:female") {
    if (await getActiveSession(env, userId)) {
      await sendMessage(env, userId, "Сначала завершите текущий чат.", activeChatKeyboard());
      return;
    }

    const gender: Gender = data === "gender:male" ? "male" : "female";
    await setGender(env, userId, gender);
    await sendMessage(
      env,
      userId,
      `Готово. Вы выбрали: <b>${genderLabel(gender)}</b>.`,
      mainKeyboard()
    );
    return;
  }

  switch (data) {
    case "change_gender":
      if (await getActiveSession(env, userId)) {
        await sendMessage(env, userId, "Сначала завершите текущий чат.", activeChatKeyboard());
      } else {
        await sendMessage(env, userId, "Выберите ваш пол:", genderKeyboard());
      }
      break;
    case "find":
      await startSearch(env, userId);
      break;
    case "cancel_search":
      await cancelSearch(env, userId);
      break;
    case "next":
      await endSession(env, userId, { notifyPartner: true });
      await startSearch(env, userId);
      break;
    case "stop":
      await endSession(env, userId, { notifyPartner: true });
      await sendMessage(env, userId, "Чат завершён.", mainKeyboard());
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
  if (!message || message.chat.type !== "private" || message.from?.is_bot) return;

  if (await handleCommand(env, message)) return;
  await relayMessage(env, message);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "anonymous-chat-bot" });
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
  }
};
