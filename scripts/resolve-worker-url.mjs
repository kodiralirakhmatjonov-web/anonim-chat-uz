const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const workerName = process.env.WORKER_NAME || "anonymous-chat-bot";

if (!accountId || !apiToken) {
  console.error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN");
  process.exit(1);
}

const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`,
  { headers: { Authorization: `Bearer ${apiToken}` } }
);
const body = await response.json();

if (!response.ok || body.success !== true || !body.result?.subdomain) {
  console.error(JSON.stringify(body));
  process.exit(1);
}

process.stdout.write(`https://${workerName}.${body.result.subdomain}.workers.dev`);
