const token = process.env.TELEGRAM_BOT_TOKEN;
const workerUrl = process.env.WORKER_URL?.replace(/\/$/, "");
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token || !workerUrl || !secret) {
  console.error("Missing TELEGRAM_BOT_TOKEN, WORKER_URL or TELEGRAM_WEBHOOK_SECRET");
  process.exit(1);
}

const api = `https://api.telegram.org/bot${token}`;

async function telegram(method, payload) {
  const response = await fetch(`${api}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  if (!response.ok || body.ok !== true) {
    console.error(`${method} failed:`, body);
    process.exit(1);
  }
  return body.result;
}

await telegram("setWebhook", {
  url: `${workerUrl}/webhook`,
  secret_token: secret,
  allowed_updates: ["message", "callback_query"],
  drop_pending_updates: false
});

await telegram("setMyName", { name: "Sirdosh" });
await telegram("setMyShortDescription", {
  short_description: "Разговоры без имени. Ismsiz suhbatlar."
});
await telegram("setMyDescription", {
  description: "Sirdosh — безопасные анонимные разговоры без показа Telegram-профиля. Найдите собеседника сейчас, оставьте анонимную заявку или присоединитесь к вечернему чату. Только 18+."
});

await telegram("setMyCommands", {
  commands: [
    { command: "start", description: "Открыть Sirdosh" },
    { command: "find", description: "Найти разговор сейчас" },
    { command: "inbox", description: "Анонимные входящие" },
    { command: "evening", description: "Вечерний чат" },
    { command: "safety", description: "Безопасность" },
    { command: "next", description: "Следующий разговор" },
    { command: "stop", description: "Завершить разговор" }
  ]
});

await telegram("setMyCommands", {
  language_code: "uz",
  commands: [
    { command: "start", description: "Sirdosh menyusi" },
    { command: "find", description: "Hozir suhbat topish" },
    { command: "inbox", description: "Anonim kiruvchilar" },
    { command: "evening", description: "Kechki suhbat" },
    { command: "safety", description: "Xavfsizlik" },
    { command: "next", description: "Keyingi suhbat" },
    { command: "stop", description: "Suhbatni tugatish" }
  ]
});

const info = await telegram("getWebhookInfo", {});
const expected = `${workerUrl}/webhook`;
if (info?.url !== expected) {
  console.error(`Webhook verification failed. Expected ${expected}, got ${info?.url || "empty"}`);
  process.exit(1);
}

console.log(`Sirdosh webhook configured: ${expected}`);
