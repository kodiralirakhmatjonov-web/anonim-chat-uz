const token = process.env.TELEGRAM_BOT_TOKEN;
const workerUrl = process.env.WORKER_URL?.replace(/\/$/, "");
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token || !workerUrl || !secret) {
  console.error("Missing TELEGRAM_BOT_TOKEN, WORKER_URL or TELEGRAM_WEBHOOK_SECRET");
  process.exit(1);
}

const api = `https://api.telegram.org/bot${token}`;

async function telegram(method, payload = {}, { required = true } = {}) {
  let response;
  let body;

  try {
    response = await fetch(`${api}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    body = await response.json();
  } catch (error) {
    if (required) {
      console.error(`${method} request failed:`, error);
      process.exit(1);
    }
    console.warn(`${method} skipped because the request failed:`, error?.message || error);
    return { ok: false, error };
  }

  if (!response.ok || body.ok !== true) {
    if (required) {
      console.error(`${method} failed:`, body);
      process.exit(1);
    }

    const retryAfter = body?.parameters?.retry_after;
    const retryText = retryAfter ? ` Retry after ${retryAfter}s.` : "";
    console.warn(`${method} skipped: ${body?.description || `HTTP ${response.status}`}.${retryText}`);
    return { ok: false, body };
  }

  return { ok: true, result: body.result };
}

async function getOptional(method, payload = {}) {
  const result = await telegram(method, payload, { required: false });
  return result.ok ? result.result : null;
}

async function setOptional(method, payload) {
  return telegram(method, payload, { required: false });
}

// The webhook is deployment-critical. If this fails, the job must fail.
await telegram("setWebhook", {
  url: `${workerUrl}/webhook`,
  secret_token: secret,
  allowed_updates: ["message", "callback_query"],
  drop_pending_updates: false,
});

// Bot profile metadata is NOT deployment-critical and Telegram rate-limits
// repeated profile changes aggressively (429 with large retry_after values).
// Read current values first and only write when an actual change is needed.
const desiredName = "iumrah";
const currentName = await getOptional("getMyName");
if (currentName && currentName.name !== desiredName) {
  await setOptional("setMyName", { name: desiredName });
}

const desiredShortDescription = "Статус бронирования iumrah, живой таймер и уведомления.";
const currentShortDescription = await getOptional("getMyShortDescription");
if (currentShortDescription && currentShortDescription.short_description !== desiredShortDescription) {
  await setOptional("setMyShortDescription", {
    short_description: desiredShortDescription,
  });
}

const desiredDescription =
  "Подключите свою бронь iumrah одним безопасным deep link. Бот показывает текущий статус, серверные дедлайны и присылает изменения автоматически.";
const currentDescription = await getOptional("getMyDescription");
if (currentDescription && currentDescription.description !== desiredDescription) {
  await setOptional("setMyDescription", { description: desiredDescription });
}

const desiredCommands = [
  { command: "start", description: "Мои бронирования" },
  { command: "status", description: "Обновить статус" },
  { command: "booking", description: "Открыть бронь" },
  { command: "help", description: "Помощь" },
];
const currentCommands = await getOptional("getMyCommands");
const commandsMatch =
  Array.isArray(currentCommands) &&
  JSON.stringify(currentCommands) === JSON.stringify(desiredCommands);
if (!commandsMatch) {
  await setOptional("setMyCommands", { commands: desiredCommands });
}

// Verify only the deployment-critical part.
const infoResponse = await telegram("getWebhookInfo", {});
const info = infoResponse.result;
const expected = `${workerUrl}/webhook`;
if (info?.url !== expected) {
  console.error(`Webhook verification failed. Expected ${expected}, got ${info?.url || "empty"}`);
  process.exit(1);
}

console.log(`iumrah Telegram webhook configured: ${expected}`);
console.log("Telegram profile metadata checked (rate-limit failures are non-fatal).");
