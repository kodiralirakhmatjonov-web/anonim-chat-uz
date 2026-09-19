# WiFi Terminal Bot

A Telegram bot running on Cloudflare Workers for **owner-authorized Wi-Fi recovery and security auditing**.

The project intentionally does not capture Wi-Fi traffic, crack handshakes, brute-force passwords, scan third-party networks, or request router/Wi-Fi credentials. A Cloudflare Worker has no access to the iPhone Wi-Fi radio anyway.

## Features

- `Access Recovery` guides for iPhone/iPad, Android, and router-owner recovery paths.
- Interactive 6-step Wi-Fi configuration audit.
- Router hardening checklist.
- `What can the bot see?` technical visibility explanation.
- WPA2/WPA3 educational lab.
- `/strength` Local Password Lab served by the Worker.
  - Password analysis is done entirely in browser JavaScript.
  - `connect-src 'none'` blocks network requests from the page.
  - No form submit endpoint, analytics, storage, or password persistence.
  - Includes a cryptographically random 24-character password generator using `crypto.getRandomValues()`.

## Existing Cloudflare architecture

This update intentionally preserves the original infrastructure identifiers so the repository's already-configured GitHub Actions workflow keeps working without migration:

- Worker name: `anonymous-chat-bot`
- D1 database: `anonymous-chat-db`
- D1 migrations remain present, though WiFi Terminal itself is stateless and does not use D1.
- Existing cron remains configured; the Worker's scheduled handler is a no-op.

That lets you repurpose the existing deployment without rebuilding Cloudflare infrastructure.

## GitHub Secrets

For the existing deployment workflow you should already have:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Create a new bot in `@BotFather`, copy its token, then add/update this GitHub Actions secret:

- `TELEGRAM_BOT_TOKEN`

You **do not** need to create `TELEGRAM_WEBHOOK_SECRET`. The GitHub Actions deployment generates a fresh secret on every deploy, uploads it to the Worker, and passes it to Telegram when configuring the webhook.

## Deploy

### Fast path using the repository's existing ZIP updater

Upload a ZIP named like:

```text
anonymous-chat-bot-wifi-v1.zip
```

to the repository root and commit it to `main`.

The existing `Apply bot ZIP update` workflow extracts the update into the repository, removes the ZIP, commits the result, and the existing `Deploy Telegram Bot` workflow deploys the Worker and configures the webhook.

### GitHub secret path

GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Name:

```text
TELEGRAM_BOT_TOKEN
```

Value: the token returned by `@BotFather`.

## Endpoints

- `GET /health` — deployment health check.
- `POST /webhook` — Telegram webhook protected by `X-Telegram-Bot-Api-Secret-Token`.
- `GET /strength` — local-only password analysis UI.
- `GET /` — simple online status.

## Local checks

```bash
npm install
npm run typecheck
npx wrangler deploy --dry-run
```
