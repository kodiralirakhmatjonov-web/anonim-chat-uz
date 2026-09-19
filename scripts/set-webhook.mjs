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

await telegram("setMyName", { name: "WiFi Terminal" });
await telegram("setMyShortDescription", {
  short_description: "Восстановление доступа и безопасный аудит вашего Wi‑Fi."
});
await telegram("setMyDescription", {
  description: "WiFi Terminal — owner security lab для своих сетей: восстановление доступа, аудит настроек роутера, WPA2/WPA3 объяснения и Local Password Lab без отправки пароля на сервер."
});

await telegram("setMyCommands", {
  commands: [
    { command: "start", description: "Открыть WiFi Terminal" },
    { command: "recover", description: "Восстановить доступ к своей сети" },
    { command: "audit", description: "Проверить безопасность Wi‑Fi" },
    { command: "strength", description: "Локально проверить пароль" },
    { command: "router", description: "Защитить настройки роутера" },
    { command: "visibility", description: "Что бот может видеть" },
    { command: "wpa", description: "Как работает WPA2/WPA3" }
  ]
});

const info = await telegram("getWebhookInfo", {});
const expected = `${workerUrl}/webhook`;
if (info?.url !== expected) {
  console.error(`Webhook verification failed. Expected ${expected}, got ${info?.url || "empty"}`);
  process.exit(1);
}

console.log(`WiFi Terminal webhook configured: ${expected}`);
