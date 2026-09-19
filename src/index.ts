interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
}

type TelegramUser = { id: number; first_name?: string };
type TelegramChat = { id: number; type: string };
type TelegramMessage = { message_id: number; from?: TelegramUser; chat: TelegramChat; text?: string };
type TelegramCallbackQuery = { id: string; from: TelegramUser; data?: string; message?: TelegramMessage };
type TelegramUpdate = { update_id: number; message?: TelegramMessage; callback_query?: TelegramCallbackQuery };

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function terminal(lines: string[]): string {
  return `<pre>${lines.map(escapeHtml).join("\n")}</pre>`;
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
  if (!response.ok || body.ok !== true) {
    throw new Error(`Telegram ${method} failed: ${body.description ?? response.statusText}`);
  }
  return body.result as T;
}

async function sendMessage(
  env: Env,
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>
): Promise<TelegramMessage> {
  return telegramCall<TelegramMessage>(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    protect_content: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

async function editMessage(
  env: Env,
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: Record<string, unknown>
): Promise<void> {
  await telegramCall(env, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

async function answerCallback(env: Env, callbackId: string, text?: string): Promise<void> {
  await telegramCall(env, "answerCallbackQuery", {
    callback_query_id: callbackId,
    ...(text ? { text } : {})
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validSsid(raw: string): { ok: true; ssid: string } | { ok: false; reason: string } {
  const ssid = raw.trim();
  if (!ssid) return { ok: false, reason: "Имя Wi‑Fi пустое." };

  const bytes = new TextEncoder().encode(ssid).length;
  if (bytes > 32) {
    return { ok: false, reason: "SSID Wi‑Fi должен занимать не больше 32 байт." };
  }

  return { ok: true, ssid };
}

async function showTargetPrompt(env: Env, chatId: number): Promise<void> {
  await sendMessage(
    env,
    chatId,
    `${terminal(["WIFI TERMINAL", "TARGET: WAITING"])}\nОтправь <b>имя своей Wi‑Fi сети</b>. Больше ничего.`
  );
}

async function runOperation(env: Env, chatId: number, ssid: string): Promise<void> {
  const safe = escapeHtml(ssid);

  const status = await sendMessage(
    env,
    chatId,
    terminal([
      `TARGET: ${ssid}`,
      "STATUS: LOCKED",
      "OPERATION: INITIALIZING"
    ])
  );

  await sleep(450);
  await editMessage(
    env,
    chatId,
    status.message_id,
    terminal([
      `TARGET: ${ssid}`,
      "STATUS: LOCKED",
      "OPERATION: RUNNING",
      "01  TARGET VALIDATION .... OK",
      "02  CLIENT CAPABILITY .... CHECKING"
    ])
  );

  await sleep(450);
  await editMessage(
    env,
    chatId,
    status.message_id,
    terminal([
      `TARGET: ${ssid}`,
      "STATUS: LOCKED",
      "OPERATION: RUNNING",
      "01  TARGET VALIDATION .... OK",
      "02  CLIENT CAPABILITY .... OK",
      "03  RECOVERY ROUTE ....... SELECTING"
    ])
  );

  await sleep(450);
  await editMessage(
    env,
    chatId,
    status.message_id,
    `${terminal([
      `TARGET: ${ssid}`,
      "OPERATION: READY",
      "ROUTE: IPHONE LOCAL RECOVERY",
      "REMOTE WIFI RADIO: NOT AVAILABLE"
    ])}\n` +
      `Telegram/Cloudflare не имеют доступа к Wi‑Fi‑радио твоего iPhone, поэтому реальный удалённый перехват или подбор отсюда не запускается. Для своей сети операция автоматически переходит к локальному восстановлению.\n\n` +
      `<b>Сейчас:</b> открой <b>Пароли → Wi‑Fi → ${safe}</b> и пройди Face ID.`,
    {
      inline_keyboard: [
        [{ text: "ПАРОЛЬ НАЙДЕН", callback_data: "found" }],
        [{ text: "НЕ НАЙДЕН", callback_data: "not_found" }],
        [{ text: "НОВЫЙ TARGET", callback_data: "new_target" }]
      ]
    }
  );
}

async function handleCallback(env: Env, callback: TelegramCallbackQuery): Promise<void> {
  const message = callback.message;
  if (!message) {
    await answerCallback(env, callback.id);
    return;
  }

  const data = callback.data ?? "";
  await answerCallback(env, callback.id);

  if (data === "new_target") {
    await showTargetPrompt(env, message.chat.id);
    return;
  }

  if (data === "found") {
    await sendMessage(
      env,
      message.chat.id,
      terminal(["OPERATION: COMPLETE", "RESULT: ACCESS RECOVERED"])
    );
    return;
  }

  if (data === "not_found") {
    await sendMessage(
      env,
      message.chat.id,
      `${terminal(["OPERATION: CONTINUE", "ROUTE: ROUTER OWNER PANEL"])}\n` +
        `Следующий путь для своей сети: открой в Safari <code>192.168.1.1</code> или <code>192.168.0.1</code>, войди в панель владельца роутера и открой настройки Wi‑Fi. Если адрес другой, он обычно указан как <b>Router</b> в деталях текущей сети или на наклейке роутера.`,
      {
        inline_keyboard: [[{ text: "НОВЫЙ TARGET", callback_data: "new_target" }]]
      }
    );
  }
}

async function handleMessage(env: Env, message: TelegramMessage): Promise<void> {
  const text = message.text?.trim();
  if (!text) return;

  if (/^\/(start|target)(?:@\w+)?(?:\s|$)/i.test(text)) {
    await showTargetPrompt(env, message.chat.id);
    return;
  }

  if (text.startsWith("/")) {
    await showTargetPrompt(env, message.chat.id);
    return;
  }

  const parsed = validSsid(text);
  if (parsed.ok === false) {
    await sendMessage(env, message.chat.id, `${escapeHtml(parsed.reason)}\n\nОтправь имя Wi‑Fi ещё раз.`);
    return;
  }

  await runOperation(env, message.chat.id, parsed.ssid);
}

async function handleUpdate(env: Env, update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallback(env, update.callback_query);
    return;
  }
  if (update.message) {
    await handleMessage(env, update.message);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "wifi-target-bot", version: "3.0.0" });
    }

    if (request.method !== "POST" || url.pathname !== "/webhook") {
      return new Response("Not found", { status: 404 });
    }

    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    let update: TelegramUpdate;
    try {
      update = (await request.json()) as TelegramUpdate;
    } catch {
      return new Response("Bad request", { status: 400 });
    }

    try {
      await handleUpdate(env, update);
    } catch (error) {
      console.error("update failed", error);
      return json({ ok: false }, 500);
    }

    return json({ ok: true });
  },

  async scheduled(): Promise<void> {
    // Existing repository has a cron trigger; this bot intentionally needs no scheduled work.
  }
};
