interface Env {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
}

type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
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

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'"
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

async function answerCallback(env: Env, callbackId: string, text?: string): Promise<void> {
  await telegramCall(env, "answerCallbackQuery", {
    callback_query_id: callbackId,
    ...(text ? { text } : {})
  });
}

function terminalBlock(lines: string[]): string {
  return `<pre>${lines.map(escapeHtml).join("\n")}</pre>`;
}

function mainKeyboard(origin: string): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: "🔐 Восстановить доступ", callback_data: "recover" }],
      [{ text: "🛡 Аудит Wi‑Fi", callback_data: "audit:start" }],
      [{ text: "🧪 Local Password Lab", url: `${origin}/strength` }],
      [
        { text: "⚙️ Защитить роутер", callback_data: "router" },
        { text: "📡 Что видит бот?", callback_data: "visibility" }
      ],
      [{ text: "🧠 Как работает WPA", callback_data: "wpa" }]
    ]
  };
}

function backKeyboard(): Record<string, unknown> {
  return { inline_keyboard: [[{ text: "← Главное меню", callback_data: "home" }]] };
}

function recoverKeyboard(): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: " iPhone / iPad", callback_data: "recover:ios" }],
      [{ text: "🤖 Android", callback_data: "recover:android" }],
      [{ text: "📶 Через роутер", callback_data: "recover:router" }],
      [{ text: "🧯 Нигде не подключён", callback_data: "recover:offline" }],
      [{ text: "← Главное меню", callback_data: "home" }]
    ]
  };
}

const AUDIT_QUESTIONS = [
  {
    title: "Шифрование",
    question: "Сеть использует WPA3 или WPA2‑AES (не WEP/WPA/TKIP)?",
    recommendation: "Включи WPA3‑Personal, а если его нет — WPA2‑AES. Отключи WEP, WPA и TKIP."
  },
  {
    title: "WPS",
    question: "WPS на роутере отключён?",
    recommendation: "Отключи WPS (PIN / push-button), если он тебе не нужен."
  },
  {
    title: "Пароль администратора",
    question: "Пароль панели роутера уникальный и не совпадает с паролем Wi‑Fi?",
    recommendation: "Поставь отдельный уникальный пароль для панели администратора роутера."
  },
  {
    title: "Прошивка",
    question: "Прошивка роутера обновляется автоматически или недавно обновлялась?",
    recommendation: "Обнови firmware роутера и включи автообновления, если производитель их поддерживает."
  },
  {
    title: "Гостевая сеть",
    question: "Для гостей/клиентов используется отдельная сеть с изоляцией от локальных устройств?",
    recommendation: "Создай guest network и включи client/LAN isolation для гостей."
  },
  {
    title: "Пароль Wi‑Fi",
    question: "Пароль Wi‑Fi уникальный и длинный (ориентир — 16+ символов)?",
    recommendation: "Используй уникальную длинную фразу или случайный пароль. Не отправляй реальный пароль этому боту."
  }
] as const;

function auditKeyboard(step: number, mask: number): Record<string, unknown> {
  return {
    inline_keyboard: [
      [
        { text: "✅ Да", callback_data: `audit:${step}:1:${mask}` },
        { text: "❌ Нет / не знаю", callback_data: `audit:${step}:0:${mask}` }
      ],
      [{ text: "✖️ Завершить аудит", callback_data: "home" }]
    ]
  };
}

function startText(firstName?: string): string {
  const hello = firstName ? `, ${escapeHtml(firstName)}` : "";
  return [
    `<b>WiFi Terminal${hello}</b>`,
    terminalBlock([
      "SYSTEM: CLOUDFLARE EDGE ONLINE",
      "LOCAL RADIO: NOT AVAILABLE",
      "MODE: OWNER SECURITY LAB",
      "STATUS: READY"
    ]),
    "Это бот для <b>своих сетей и сетей, на аудит которых у тебя есть разрешение</b>.",
    "Он помогает восстановить доступ, проверить настройки роутера и провести безопасный аудит. Сам Telegram‑бот не получает доступ к Wi‑Fi‑радио iPhone и не перехватывает пакеты."
  ].join("\n\n");
}

function recoverText(): string {
  return [
    "<b>ACCESS RECOVERY</b>",
    terminalBlock([
      "TARGET: YOUR NETWORK",
      "CAPTURE: DISABLED",
      "BRUTE FORCE: DISABLED",
      "RECOVERY CHANNELS: AVAILABLE"
    ]),
    "Выбери, где хочешь восстановить доступ. Бот не просит отправлять пароль и не хранит учётные данные."
  ].join("\n\n");
}

function routerHardeningText(): string {
  return [
    "<b>ROUTER HARDENING</b>",
    terminalBlock([
      "01  WPA3-PERSONAL / WPA2-AES",
      "02  WPS -> OFF",
      "03  ADMIN PASSWORD -> UNIQUE",
      "04  FIRMWARE -> CURRENT",
      "05  REMOTE ADMIN -> OFF (unless required)",
      "06  GUEST LAN -> ISOLATED",
      "07  UPnP -> OFF if unused",
      "08  DNS / DHCP -> VERIFY"
    ]),
    "Адрес панели роутера часто указан на наклейке устройства или в информации о текущем Wi‑Fi соединении. Не вводи логин/пароль роутера в этого бота."
  ].join("\n\n");
}

function visibilityText(): string {
  return [
    "<b>BOT VISIBILITY</b>",
    terminalBlock([
      "TELEGRAM USER ID: visible to bot",
      "MESSAGE CONTENT: visible when you send it",
      "iPHONE Wi-Fi RADIO: unavailable",
      "SSID / BSSID: unavailable",
      "WPA HANDSHAKE: unavailable",
      "LOCAL LAN: unavailable",
      "SAVED PASSWORDS: unavailable"
    ]),
    "Cloudflare Worker находится в интернете, а не внутри твоего iPhone. Поэтому он физически не может включить monitor mode или прослушивать локальный эфир Wi‑Fi.",
    "<b>Важно:</b> не отправляй боту реальные Wi‑Fi пароли, seed-фразы, API‑ключи или пароли администратора."
  ].join("\n\n");
}

function wpaText(): string {
  return [
    "<b>WPA2 / WPA3 LAB</b>",
    terminalBlock([
      "CLIENT -> ACCESS POINT",
      "AUTHENTICATION -> KEY DERIVATION",
      "SESSION KEYS -> ENCRYPTED TRAFFIC",
      "PASSWORD -> NOT SENT AS PLAIN TEXT"
    ]),
    "При WPA2/WPA3 пароль не передаётся по воздуху открытым текстом. Устройства доказывают знание общего секрета и получают ключи сеанса.",
    "Поэтому облачный Telegram‑бот без доступа к Wi‑Fi адаптеру не может просто «прочитать пароль из эфира». Для легального лабораторного пентеста нужен локальный радио‑интерфейс, а этот бот намеренно ограничен восстановлением доступа и защитным аудитом."
  ].join("\n\n");
}

function iosRecoveryText(): string {
  return [
    "<b>RECOVERY / iPhone</b>",
    terminalBlock(["SOURCE 1: PASSWORDS APP", "SOURCE 2: SAVED WI-FI", "SOURCE 3: ANOTHER APPLE DEVICE"]),
    "1. Открой приложение <b>«Пароли»</b> → <b>Wi‑Fi</b> → найди нужную сеть → Face ID.",
    "2. Либо: <b>Настройки → Wi‑Fi → Изменить</b> → Face ID → нужная сеть → поле пароля (если версия iOS показывает его).",
    "3. Если рядом есть другой твой Apple‑девайс, на котором сеть сохранена, можно использовать системный шаринг пароля.",
    "Даже после «Забыть эту сеть» запись иногда остаётся в связке ключей/приложении «Пароли», если она синхронизировалась ранее."
  ].join("\n\n");
}

function androidRecoveryText(): string {
  return [
    "<b>RECOVERY / Android</b>",
    terminalBlock(["SOURCE: SAVED NETWORK", "METHOD: SHARE / QR"]),
    "На большинстве современных Android: <b>Настройки → Wi‑Fi → Сохранённые сети → нужная сеть → Поделиться</b>. После разблокировки система обычно показывает QR‑код, а на некоторых оболочках — и пароль.",
    "Название пунктов отличается у Samsung, Pixel, Xiaomi и других производителей."
  ].join("\n\n");
}

function routerRecoveryText(): string {
  return [
    "<b>RECOVERY / ROUTER</b>",
    terminalBlock(["REQUIRES: OWNER ACCESS", "CREDENTIAL INPUT TO BOT: NEVER"]),
    "Если хотя бы одно твоё устройство всё ещё подключено, открой панель управления роутером через его gateway‑адрес. Частые варианты — <code>192.168.1.1</code> и <code>192.168.0.1</code>, но правильный адрес лучше посмотреть в свойствах текущей сети или на наклейке роутера.",
    "В панели ищи раздел Wi‑Fi / Wireless / WLAN. Там владелец сети может сменить пароль на новый."
  ].join("\n\n");
}

function offlineRecoveryText(): string {
  return [
    "<b>RECOVERY / NO CONNECTED DEVICE</b>",
    terminalBlock(["PATH 1: ROUTER LABEL", "PATH 2: ISP / OWNER APP", "PATH 3: FACTORY RESET"]),
    "Если ни одно твоё устройство больше не подключено: проверь наклейку роутера, приложение/личный кабинет провайдера или документацию устройства.",
    "Последний вариант для <b>собственного</b> роутера — factory reset и повторная настройка. Это удалит текущую конфигурацию, поэтому сначала убедись, что знаешь параметры подключения провайдера."
  ].join("\n\n");
}

async function beginAudit(env: Env, chatId: number): Promise<void> {
  const q = AUDIT_QUESTIONS[0];
  await sendMessage(
    env,
    chatId,
    [
      "<b>SECURITY AUDIT / 1 of 6</b>",
      terminalBlock([`MODULE: ${q.title.toUpperCase()}`]),
      q.question
    ].join("\n\n"),
    auditKeyboard(0, 0)
  );
}

async function continueAudit(env: Env, chatId: number, step: number, yes: boolean, mask: number): Promise<void> {
  const newMask = yes ? (mask | (1 << step)) : mask;
  const next = step + 1;

  if (next < AUDIT_QUESTIONS.length) {
    const q = AUDIT_QUESTIONS[next];
    await sendMessage(
      env,
      chatId,
      [
        `<b>SECURITY AUDIT / ${next + 1} of ${AUDIT_QUESTIONS.length}</b>`,
        terminalBlock([`MODULE: ${q.title.toUpperCase()}`]),
        q.question
      ].join("\n\n"),
      auditKeyboard(next, newMask)
    );
    return;
  }

  const passed = AUDIT_QUESTIONS.reduce((sum, _q, index) => sum + (((newMask >> index) & 1) ? 1 : 0), 0);
  const fixes = AUDIT_QUESTIONS
    .map((q, index) => (((newMask >> index) & 1) ? null : `• ${q.recommendation}`))
    .filter((value): value is string => value !== null);

  const status = passed === 6 ? "HARDENED" : passed >= 4 ? "REVIEW" : "ACTION REQUIRED";
  await sendMessage(
    env,
    chatId,
    [
      "<b>AUDIT COMPLETE</b>",
      terminalBlock([`CHECKS PASSED: ${passed}/6`, `STATUS: ${status}`]),
      fixes.length ? `<b>Что стоит изменить:</b>\n${fixes.join("\n")}` : "Базовые проверки пройдены. Периодически повторяй аудит после обновлений роутера.",
      "Это конфигурационный аудит по твоим ответам, а не сканирование сети."
    ].join("\n\n"),
    backKeyboard()
  );
}

async function handleCallback(env: Env, query: TelegramCallbackQuery, origin: string): Promise<void> {
  const data = query.data ?? "";
  const chatId = query.message?.chat.id ?? query.from.id;
  await answerCallback(env, query.id);

  if (data === "home") {
    await sendMessage(env, chatId, startText(query.from.first_name), mainKeyboard(origin));
    return;
  }
  if (data === "recover") {
    await sendMessage(env, chatId, recoverText(), recoverKeyboard());
    return;
  }
  if (data === "recover:ios") {
    await sendMessage(env, chatId, iosRecoveryText(), backKeyboard());
    return;
  }
  if (data === "recover:android") {
    await sendMessage(env, chatId, androidRecoveryText(), backKeyboard());
    return;
  }
  if (data === "recover:router") {
    await sendMessage(env, chatId, routerRecoveryText(), backKeyboard());
    return;
  }
  if (data === "recover:offline") {
    await sendMessage(env, chatId, offlineRecoveryText(), backKeyboard());
    return;
  }
  if (data === "router") {
    await sendMessage(env, chatId, routerHardeningText(), backKeyboard());
    return;
  }
  if (data === "visibility") {
    await sendMessage(env, chatId, visibilityText(), backKeyboard());
    return;
  }
  if (data === "wpa") {
    await sendMessage(env, chatId, wpaText(), backKeyboard());
    return;
  }
  if (data === "audit:start") {
    await beginAudit(env, chatId);
    return;
  }
  if (data.startsWith("audit:")) {
    const parts = data.split(":");
    if (parts.length === 4) {
      const step = Number(parts[1]);
      const yes = parts[2] === "1";
      const mask = Number(parts[3]);
      if (Number.isInteger(step) && step >= 0 && step < AUDIT_QUESTIONS.length && Number.isInteger(mask) && mask >= 0) {
        await continueAudit(env, chatId, step, yes, mask);
        return;
      }
    }
  }

  await sendMessage(env, chatId, "Команда не распознана.", backKeyboard());
}

async function handleMessage(env: Env, message: TelegramMessage, origin: string): Promise<void> {
  const chatId = message.chat.id;
  const text = (message.text ?? "").trim();
  const command = text.split(/\s+/)[0].toLowerCase().split("@")[0];

  if (command === "/start" || command === "/menu") {
    await sendMessage(env, chatId, startText(message.from?.first_name), mainKeyboard(origin));
    return;
  }
  if (command === "/recover") {
    await sendMessage(env, chatId, recoverText(), recoverKeyboard());
    return;
  }
  if (command === "/audit") {
    await beginAudit(env, chatId);
    return;
  }
  if (command === "/router") {
    await sendMessage(env, chatId, routerHardeningText(), backKeyboard());
    return;
  }
  if (command === "/visibility") {
    await sendMessage(env, chatId, visibilityText(), backKeyboard());
    return;
  }
  if (command === "/wpa") {
    await sendMessage(env, chatId, wpaText(), backKeyboard());
    return;
  }
  if (command === "/strength") {
    await sendMessage(
      env,
      chatId,
      "<b>LOCAL PASSWORD LAB</b>\n\nПароль проверяется JavaScript‑кодом прямо в браузере и не отправляется Worker'у.",
      { inline_keyboard: [[{ text: "Открыть локальную проверку", url: `${origin}/strength` }], [{ text: "← Меню", callback_data: "home" }]] }
    );
    return;
  }

  if (text && !text.startsWith("/")) {
    await sendMessage(
      env,
      chatId,
      [
        "Я не использую свободный текст как пароль или учётные данные.",
        "<b>Не отправляй сюда реальные Wi‑Fi пароли.</b> Для проверки открой Local Password Lab — анализ выполняется локально на устройстве."
      ].join("\n\n"),
      mainKeyboard(origin)
    );
    return;
  }

  await sendMessage(env, chatId, startText(message.from?.first_name), mainKeyboard(origin));
}

function strengthPage(): Response {
  const html = String.raw`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="color-scheme" content="dark" />
<title>Local Password Lab</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;background:#050505;color:#f5f5f7}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% -20%,#222 0,#080808 42%,#030303 100%);padding:env(safe-area-inset-top) 18px env(safe-area-inset-bottom)}
.wrap{max-width:620px;margin:0 auto;padding:34px 0 50px}.eyebrow{font:700 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;color:#8e8e93}.hero{font-size:40px;line-height:.98;letter-spacing:-.045em;margin:14px 0 12px}.sub{color:#a1a1a6;font-size:17px;line-height:1.45;margin:0 0 26px}.card{border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.055);backdrop-filter:blur(24px);border-radius:28px;padding:18px;box-shadow:0 20px 80px rgba(0,0,0,.35)}
label{display:block;font-weight:700;margin:2px 2px 10px}.field{display:flex;gap:10px}.field input{width:100%;min-width:0;background:#0b0b0c;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:18px;padding:16px;font:600 16px ui-monospace,SFMono-Regular,Menlo,monospace;outline:none}.field input:focus{border-color:#6e6e73}.btn{border:0;border-radius:18px;background:#f5f5f7;color:#050505;padding:0 16px;font-weight:800;font-size:15px}.meter{height:10px;background:#1b1b1e;border-radius:999px;overflow:hidden;margin:18px 0 10px}.meter>i{display:block;height:100%;width:0;background:#f5f5f7;border-radius:inherit;transition:width .25s ease}.row{display:flex;justify-content:space-between;gap:12px;align-items:baseline}.score{font-size:30px;font-weight:900;letter-spacing:-.04em}.muted{color:#8e8e93}.checks{display:grid;gap:9px;margin:18px 0 0}.check{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.045)}.ok{color:#fff}.bad{color:#777}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.actions button{min-height:52px;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:#fff;font-weight:800;font-size:15px}.notice{font:600 12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:#777;margin:18px 2px 0}.generated{margin-top:14px;padding:14px;border-radius:18px;background:#0a0a0b;border:1px solid rgba(255,255,255,.1);font:700 15px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;display:none}.generated.show{display:block}
@media(max-width:420px){.hero{font-size:34px}.actions{grid-template-columns:1fr}.wrap{padding-top:22px}}
</style>
</head>
<body>
<main class="wrap">
<div class="eyebrow">WIFI TERMINAL / LOCAL MODE</div>
<h1 class="hero">Password Lab</h1>
<p class="sub">Проверка и генерация выполняются только на этом устройстве. Страница не содержит формы отправки, сетевых запросов или аналитики.</p>
<section class="card">
<label for="p">Пароль или тестовая фраза</label>
<div class="field"><input id="p" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Введите локально"/><button class="btn" id="toggle" type="button">Показать</button></div>
<div class="meter"><i id="bar"></i></div>
<div class="row"><div class="score" id="score">0/100</div><div class="muted" id="verdict">ожидание</div></div>
<div class="checks" id="checks"></div>
<div class="actions"><button id="generate" type="button">Сгенерировать 24 символа</button><button id="clear" type="button">Очистить</button></div>
<div class="generated" id="generated"></div>
<p class="notice">CONNECT-SRC: NONE · STORAGE: NONE · SERVER SUBMIT: NONE<br/>Не используй один пароль для Wi‑Fi и панели администратора роутера.</p>
</section>
</main>
<script>
const input=document.getElementById('p'),bar=document.getElementById('bar'),scoreEl=document.getElementById('score'),verdict=document.getElementById('verdict'),checks=document.getElementById('checks'),generated=document.getElementById('generated');
function calc(s){
  const categories=[/[a-z]/.test(s),/[A-Z]/.test(s),/\d/.test(s),/[^A-Za-z0-9]/.test(s)].filter(Boolean).length;
  let score=Math.min(55,s.length*3)+categories*8;
  if(s.length>=16) score+=8;if(s.length>=20) score+=5;
  if(/(.)\1\1/.test(s)) score-=15;
  if(/(?:1234|abcd|qwerty|password|пароль|wifi|admin)/i.test(s)) score-=25;
  if(/^\d+$/.test(s)||/^[a-z]+$/i.test(s)) score-=15;
  score=Math.max(0,Math.min(100,score));
  return {score,categories};
}
function render(){
  const s=input.value,{score,categories}=calc(s);bar.style.width=score+'%';scoreEl.textContent=score+'/100';
  verdict.textContent=!s?'ожидание':score>=85?'сильный':score>=65?'хороший':score>=45?'средний':'слабый';
  const data=[['16+ символов',s.length>=16],['20+ символов',s.length>=20],['3+ типа символов',categories>=3],['Нет очевидного шаблона',!/(?:1234|abcd|qwerty|password|пароль|wifi|admin)/i.test(s)&&!/(.)\1\1/.test(s)],['Не только цифры/буквы',s.length>0&&!(/^\d+$/.test(s)||/^[a-z]+$/i.test(s))]];
  checks.innerHTML=data.map(([t,ok])=>'<div class="check"><span>'+t+'</span><strong class="'+(ok?'ok':'bad')+'">'+(ok?'PASS':'CHECK')+'</strong></div>').join('');
}
input.addEventListener('input',render);document.getElementById('toggle').addEventListener('click',e=>{const show=input.type==='password';input.type=show?'text':'password';e.currentTarget.textContent=show?'Скрыть':'Показать'});
document.getElementById('clear').addEventListener('click',()=>{input.value='';generated.textContent='';generated.className='generated';render();input.focus()});
document.getElementById('generate').addEventListener('click',()=>{const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=';const a=new Uint32Array(24);crypto.getRandomValues(a);const p=Array.from(a,n=>chars[n%chars.length]).join('');generated.textContent=p;generated.className='generated show';input.value=p;input.type='text';document.getElementById('toggle').textContent='Скрыть';render()});
render();
</script>
</body>
</html>`;
  return new Response(html, { status: 200, headers: HTML_HEADERS });
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const expected = env.TELEGRAM_WEBHOOK_SECRET;
  const received = request.headers.get("x-telegram-bot-api-secret-token");
  if (!expected || !received || received !== expected) {
    return json({ ok: false }, 403);
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return json({ ok: false, error: "invalid json" }, 400);
  }

  const origin = new URL(request.url).origin;
  try {
    if (update.callback_query) {
      await handleCallback(env, update.callback_query, origin);
    } else if (update.message) {
      await handleMessage(env, update.message, origin);
    }
  } catch (error) {
    console.error("Update failed", error instanceof Error ? error.message : String(error));
  }

  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "wifi-terminal-bot", mode: "owner-security-lab" });
    }
    if (request.method === "GET" && url.pathname === "/strength") {
      return strengthPage();
    }
    if (request.method === "POST" && url.pathname === "/webhook") {
      return handleWebhook(request, env);
    }
    if (request.method === "GET" && url.pathname === "/") {
      return new Response("WiFi Terminal Bot is online.", { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
    }

    return json({ ok: false, error: "not found" }, 404);
  },

  async scheduled(_controller: ScheduledController, _env: Env, _ctx: ExecutionContext): Promise<void> {
    // The inherited repository still has a cron trigger. WiFi Terminal is stateless,
    // so scheduled executions intentionally do nothing.
  }
};
