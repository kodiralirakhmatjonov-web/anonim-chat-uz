# Anonymous Telegram Chat Bot

Serverless anonymous 1-to-1 Telegram chat on Cloudflare Workers + D1.

## MVP behavior

- `/start` asks the user to choose **Мужчина** or **Женщина**.
- The choice is stored in D1 and can be changed later from the menu.
- **Найти собеседника** pairs a man with a woman.
- Messages are copied through the bot; normal Telegram forwarding is not used.
- Message bodies are **not persisted** in D1.
- Contacts and geolocation are blocked for privacy.
- Copied chat messages use Telegram `protect_content`.
- **Следующий** ends the current session and immediately searches again.
- **Завершить** ends the chat.
- **Пожаловаться** stores only technical user/session IDs, blocks that pair from matching again, and ends the chat.

## Required GitHub Actions secrets

Only three secrets are required:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `TELEGRAM_BOT_TOKEN`

The Cloudflare token needs permission to edit Workers and D1 databases.

You do **not** need to create D1 manually. The workflow finds or creates `anonymous-chat-db`, injects its UUID, applies migrations, deploys the Worker, generates a webhook secret, stores Worker secrets, discovers the workers.dev URL, performs a health check, and configures/validates the Telegram webhook.

## First launch

1. Create a Telegram bot in `@BotFather` and copy its token.
2. Create a Cloudflare API token with Workers edit and D1 write permissions.
3. Find your Cloudflare Account ID.
4. Add the three GitHub Actions secrets listed above.
5. Push to `main` or run **Deploy Telegram Bot** manually.
6. Open the bot in Telegram and send `/start`.

## Local development

Copy `.env.example` to `.dev.vars` and fill in secrets. For remote D1 operations, replace `__D1_DATABASE_ID__` in `wrangler.jsonc` with a real database UUID.

```bash
npm install
npm run db:migrate:local
npm run dev
```

## Privacy notes

Telegram still provides the bot with each user's numeric Telegram user ID; this is required for routing. That ID is never shown to the matched partner by this code. Users can still voluntarily reveal identifying information in text, photos, audio, video, usernames, or other content, so "anonymous" means the bot does not expose Telegram profile identity by design, not that users are technically prevented from self-identifying.
