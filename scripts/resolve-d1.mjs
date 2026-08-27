const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const databaseName = process.env.D1_DATABASE_NAME || "anonymous-chat-db";

if (!accountId || !apiToken) {
  console.error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN");
  process.exit(1);
}

const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`;
const headers = {
  Authorization: `Bearer ${apiToken}`,
  "Content-Type": "application/json"
};

async function cloudflare(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok || body.success !== true) {
    console.error(JSON.stringify(body));
    process.exit(1);
  }
  return body;
}

const list = await cloudflare(`${base}?name=${encodeURIComponent(databaseName)}&per_page=100`);
const existing = Array.isArray(list.result)
  ? list.result.find((db) => db.name === databaseName)
  : null;

if (existing) {
  const id = existing.uuid || existing.id;
  if (!id) {
    console.error("Existing D1 database has no uuid/id");
    process.exit(1);
  }
  process.stdout.write(String(id));
  process.exit(0);
}

const created = await cloudflare(base, {
  method: "POST",
  body: JSON.stringify({
    name: databaseName,
    primary_location_hint: "apac"
  })
});

const id = created.result?.uuid || created.result?.id;
if (!id) {
  console.error("Created D1 database has no uuid/id");
  process.exit(1);
}

process.stdout.write(String(id));
