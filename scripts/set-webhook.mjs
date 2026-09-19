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

await telegram("setMyName", { name: "WiFi Target" });
await telegram("setMyShortDescription", {
  short_description: "Enter Wi‑Fi target. Operation starts immediately."
});
await telegram("setMyDescription", {
  description: "Minimal Wi‑Fi owner recovery bot: send the SSID of your own/authorized network and the operation starts immediately."
});
await telegram("setMyCommands", {
  commands: [
    { command: "start", description: "Enter Wi‑Fi target" },
    { command: "target", description: "Set a new Wi‑Fi target" }
  ]
});

const info = await telegram("getWebhookInfo", {});
const expected = `${workerUrl}/webhook`;
if (info?.url !== expected) {
  console.error(`Webhook verification failed. Expected ${expected}, got ${info?.url || "empty"}`);
  process.exit(1);
}

console.log(`WiFi Target webhook configured: ${expected}`);
