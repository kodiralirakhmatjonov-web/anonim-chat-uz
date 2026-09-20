type ScheduledController = { cron?: string; scheduledTime?: number; noRetry?: () => void };

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  IUMRAH_TELEGRAM_BRIDGE_SECRET?: string;
  IUMRAH_API_ORIGIN?: string;
  TELEGRAM_BOT_USERNAME?: string;
  PUBLIC_BASE_URL?: string;
  LINK_ENCRYPTION_KEY?: string;
  DB: D1Database;
}

type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

type TelegramChat = { id: number; type: string };
type TelegramMessage = { message_id: number; from?: TelegramUser; chat: TelegramChat; text?: string };
type TelegramCallbackQuery = { id: string; from: TelegramUser; data?: string; message?: TelegramMessage };
type TelegramUpdate = { update_id: number; message?: TelegramMessage; callback_query?: TelegramCallbackQuery };

type ClientTripSnapshot = {
  bookingID: string;
  bookingNumber?: number | null;
  bookingDisplayNumber?: string | null;
  pilgrimID?: string | null;
  status: string;
  paymentStatus?: string | null;
  confirmationNumber?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
  availabilityStartedAt?: string | null;
  availabilityDeadlineAt?: string | null;
  priceLockStartedAt?: string | null;
  priceLockExpiresAt?: string | null;
  paymentReceivedAt?: string | null;
  paymentConfirmationDeadlineAt?: string | null;
  documentsStartedAt?: string | null;
  documentsDeadlineAt?: string | null;
};

type StatusHistoryEntry = { oldStatus?: string | null; newStatus: string; createdAt: string };
type ClientTripResponse = { ok?: boolean; trip: ClientTripSnapshot; statusHistory?: StatusHistoryEntry[] | null };
type Lifecycle = {
  kind: "availability" | "price_lock" | "payment_confirmation" | "documents" | "none";
  deadlineAt: string | null;
  title: string;
};

type LinkedBookingRow = {
  telegram_user_id: number;
  chat_id: number;
  booking_id: string;
  booking_token_ciphertext: string;
  booking_token_iv: string;
  language: string | null;
  last_status: string | null;
  last_payment_status: string | null;
  last_confirmation_number: string | null;
  notifications_enabled: number;
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const LINK_TTL_SECONDS = 10 * 60;
const MINI_INIT_MAX_AGE_SECONDS = 60 * 60;
const encoder = new TextEncoder();

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function normalizeOrigin(raw: string | undefined): string {
  const value = raw?.trim().replace(/\/+$/, "");
  return value || "https://iumrah.app";
}

function apiOrigin(env: Env): string {
  return normalizeOrigin(env.IUMRAH_API_ORIGIN);
}

function validBookingID(value: string): boolean {
  return /^IUM-\d{4}-[A-Z2-9]{7}$/.test(value);
}

function clean(value: unknown, max = 256): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullableString(value: unknown): string | null {
  const text = clean(value);
  return text || null;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function encryptionKey(env: Env): Promise<CryptoKey> {
  const secret = clean(env.LINK_ENCRYPTION_KEY || env.IUMRAH_TELEGRAM_BRIDGE_SECRET || env.TELEGRAM_BOT_TOKEN, 1024);
  if (secret.length < 24) throw new Error("LINK_ENCRYPTION_KEY_NOT_CONFIGURED");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptSecret(env: Env, value: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(env), encoder.encode(value));
  return { ciphertext: base64Url(new Uint8Array(encrypted)), iv: base64Url(iv) };
}

async function decryptSecret(env: Env, ciphertext: string, iv: string): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(iv) },
    await encryptionKey(env),
    base64UrlToBytes(ciphertext),
  );
  return new TextDecoder().decode(plain);
}

function telegramApi(env: Env, method: string): string {
  return `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;
}

async function telegramCall<T = unknown>(env: Env, method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(telegramApi(env, method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as { ok?: boolean; result?: T; description?: string };
  if (!response.ok || body.ok !== true) throw new Error(`Telegram ${method} failed: ${body.description ?? response.statusText}`);
  return body.result as T;
}

async function sendMessage(env: Env, chatId: number, text: string, replyMarkup?: Record<string, unknown>): Promise<TelegramMessage> {
  return telegramCall<TelegramMessage>(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    protect_content: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function editMessage(env: Env, chatId: number, messageId: number, text: string, replyMarkup?: Record<string, unknown>): Promise<void> {
  await telegramCall(env, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function answerCallback(env: Env, callbackId: string, text?: string): Promise<void> {
  await telegramCall(env, "answerCallbackQuery", { callback_query_id: callbackId, ...(text ? { text } : {}) });
}

function parseTripPayload(value: unknown): ClientTripResponse | null {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;
  const tripValue = root.trip;
  if (!tripValue || typeof tripValue !== "object") return null;
  const trip = tripValue as Record<string, unknown>;
  const bookingID = clean(trip.bookingID);
  const status = clean(trip.status);
  if (!bookingID || !status) return null;
  const number = typeof trip.bookingNumber === "number" && Number.isFinite(trip.bookingNumber) ? trip.bookingNumber : null;
  const parsed: ClientTripSnapshot = {
    bookingID,
    bookingNumber: number,
    bookingDisplayNumber: nullableString(trip.bookingDisplayNumber),
    pilgrimID: nullableString(trip.pilgrimID),
    status,
    paymentStatus: nullableString(trip.paymentStatus),
    confirmationNumber: nullableString(trip.confirmationNumber),
    startDate: nullableString(trip.startDate),
    endDate: nullableString(trip.endDate),
    createdAt: nullableString(trip.createdAt),
    updatedAt: nullableString(trip.updatedAt),
    completedAt: nullableString(trip.completedAt),
    availabilityStartedAt: nullableString(trip.availabilityStartedAt),
    availabilityDeadlineAt: nullableString(trip.availabilityDeadlineAt),
    priceLockStartedAt: nullableString(trip.priceLockStartedAt),
    priceLockExpiresAt: nullableString(trip.priceLockExpiresAt),
    paymentReceivedAt: nullableString(trip.paymentReceivedAt),
    paymentConfirmationDeadlineAt: nullableString(trip.paymentConfirmationDeadlineAt),
    documentsStartedAt: nullableString(trip.documentsStartedAt),
    documentsDeadlineAt: nullableString(trip.documentsDeadlineAt),
  };
  const history = Array.isArray(root.statusHistory)
    ? root.statusHistory.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const newStatus = clean(row.newStatus);
        const createdAt = clean(row.createdAt);
        return newStatus && createdAt ? [{ oldStatus: nullableString(row.oldStatus), newStatus, createdAt }] : [];
      })
    : [];
  return { ok: root.ok === true, trip: parsed, statusHistory: history };
}

function parseWebBookingPayload(value: unknown): ClientTripResponse | null {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;
  const rawBooking = root.booking;
  if (!rawBooking || typeof rawBooking !== "object") return null;
  const booking = rawBooking as Record<string, unknown>;
  const bookingID = clean(booking.id ?? booking.bookingID, 64);
  const status = clean(booking.status, 64);
  if (!bookingID || !status) return null;
  const input = booking.input && typeof booking.input === "object" ? booking.input as Record<string, unknown> : {};
  const trip: ClientTripSnapshot = {
    bookingID,
    bookingNumber: null,
    bookingDisplayNumber: nullableString(booking.bookingDisplayNumber),
    status,
    paymentStatus: nullableString(booking.paymentStatus),
    confirmationNumber: nullableString(booking.confirmationNumber),
    startDate: nullableString(booking.startDate) ?? nullableString(input.startDate),
    endDate: nullableString(booking.endDate) ?? nullableString(input.endDate),
    createdAt: nullableString(booking.createdAt),
    updatedAt: nullableString(booking.updatedAt) ?? nullableString(booking.createdAt),
    completedAt: nullableString(booking.completedAt),
    availabilityStartedAt: nullableString(booking.availabilityStartedAt),
    availabilityDeadlineAt: nullableString(booking.availabilityDeadlineAt),
    priceLockStartedAt: nullableString(booking.priceLockStartedAt),
    priceLockExpiresAt: nullableString(booking.priceLockExpiresAt),
    paymentReceivedAt: nullableString(booking.paymentReceivedAt),
    paymentConfirmationDeadlineAt: nullableString(booking.paymentConfirmationDeadlineAt),
    documentsStartedAt: nullableString(booking.documentsStartedAt),
    documentsDeadlineAt: nullableString(booking.documentsDeadlineAt),
  };
  return { ok: true, trip, statusHistory: [] };
}

async function fetchTrip(env: Env, bookingID: string, bookingToken: string): Promise<ClientTripResponse> {
  const headers = { accept: "application/json", "x-booking-token": bookingToken };
  let operationalStatus = 0;

  try {
    const response = await fetch(`${apiOrigin(env)}/api/catalog/hotels/client/trips/${encodeURIComponent(bookingID)}`, {
      method: "GET",
      headers,
      redirect: "manual",
    });
    operationalStatus = response.status;
    if (response.ok) {
      const payload = parseTripPayload(await response.json());
      if (payload && payload.trip.bookingID === bookingID) return payload;
    }
  } catch (error) {
    console.error("operational trip lookup failed; trying web booking fallback", bookingID, error);
  }

  // A web booking exists immediately after checkout, while the operational trip
  // mirror may still be synchronizing. Validate the same high-entropy token
  // against the authenticated web booking endpoint so Telegram can be linked
  // immediately without weakening authorization.
  try {
    const fallback = await fetch(`${apiOrigin(env)}/api/bookings/${encodeURIComponent(bookingID)}`, {
      method: "GET",
      headers,
      redirect: "manual",
    });
    if (fallback.ok) {
      const payload = parseWebBookingPayload(await fallback.json());
      if (payload && payload.trip.bookingID === bookingID) return payload;
      throw new Error("INVALID_WEB_BOOKING_RESPONSE");
    }
    if (fallback.status === 404 || fallback.status === 401) throw new Error("BOOKING_NOT_FOUND");
    throw new Error(`IUMRAH_WEB_API_${fallback.status}`);
  } catch (error) {
    if (error instanceof Error && error.message !== "BOOKING_NOT_FOUND" && operationalStatus && operationalStatus !== 404 && operationalStatus !== 401) {
      throw new Error(`IUMRAH_API_${operationalStatus}`);
    }
    throw error instanceof Error ? error : new Error("BOOKING_NOT_FOUND");
  }
}

function dateMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function transitionDate(history: StatusHistoryEntry[] | null | undefined, status: string): string | null {
  const target = status.trim().toLowerCase();
  const matches = (history ?? []).filter((item) => item.newStatus.trim().toLowerCase() === target);
  return matches.length ? matches[matches.length - 1].createdAt : null;
}

function deadline(explicit: string | null | undefined, start: string | null | undefined, seconds: number): string | null {
  const explicitMs = dateMs(explicit);
  if (explicitMs !== null) return new Date(explicitMs).toISOString();
  const startMs = dateMs(start);
  return startMs === null ? null : new Date(startMs + seconds * 1000).toISOString();
}

function lifecycle(payload: ClientTripResponse): Lifecycle {
  const trip = payload.trip;
  const status = trip.status.trim().toUpperCase();
  if (status === "NEW" || status === "AVAILABILITY_CHECK") {
    return {
      kind: "availability",
      deadlineAt: deadline(trip.availabilityDeadlineAt, trip.availabilityStartedAt || trip.createdAt, 6 * 60 * 60),
      title: "До максимального срока проверки",
    };
  }
  if (status === "PAYMENT_PENDING") {
    if (trip.paymentReceivedAt) {
      return {
        kind: "payment_confirmation",
        deadlineAt: deadline(trip.paymentConfirmationDeadlineAt, trip.paymentReceivedAt, 10 * 60),
        title: "Проверка оплаты",
      };
    }
    return {
      kind: "price_lock",
      deadlineAt: deadline(
        trip.priceLockExpiresAt,
        trip.priceLockStartedAt || transitionDate(payload.statusHistory, "payment_pending") || trip.updatedAt,
        30 * 60,
      ),
      title: "Цена зафиксирована ещё",
    };
  }
  if (status === "PAID" || status === "BOOKING_CONFIRMED") {
    return {
      kind: "documents",
      deadlineAt: deadline(
        trip.documentsDeadlineAt,
        trip.documentsStartedAt || transitionDate(payload.statusHistory, "booking_confirmed") || trip.updatedAt,
        24 * 60 * 60,
      ),
      title: "Подготовка документов",
    };
  }
  return { kind: "none", deadlineAt: null, title: "" };
}

function countdown(deadlineAt: string | null, now = Date.now()): string | null {
  const end = dateMs(deadlineAt);
  if (end === null) return null;
  const total = Math.max(0, Math.floor((end - now) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((item) => String(item).padStart(2, "0")).join(":");
}

function bookingReference(trip: ClientTripSnapshot): string {
  if (trip.bookingDisplayNumber) return trip.bookingDisplayNumber;
  if (typeof trip.bookingNumber === "number") return `#${String(Math.trunc(trip.bookingNumber)).padStart(4, "0")}`;
  return trip.bookingID;
}

function statusCopy(status: string, paymentStatus?: string | null): { title: string; body: string } {
  switch (status.trim().toUpperCase()) {
    case "NEW":
    case "AVAILABILITY_CHECK":
      return { title: "Проверяем доступность", body: "iumrah проверяет рейсы, отели и остальные компоненты вашей поездки." };
    case "PAYMENT_PENDING":
      if (paymentStatus && /received|review|checking|submitted/i.test(paymentStatus)) {
        return { title: "Оплата получена", body: "Платёж получен и сейчас проходит подтверждение." };
      }
      return { title: "Можно переходить к оплате", body: "Наличие подтверждено. Цена удерживается на ограниченное время." };
    case "PAID":
    case "BOOKING_CONFIRMED":
      return { title: "Бронирование подтверждено", body: "Мы готовим документы и подтверждения по вашей поездке." };
    case "DOCUMENTS_READY":
    case "READY_TO_TRAVEL":
      return { title: "Всё готово к поездке", body: "Документы и основные подтверждения готовы." };
    case "IN_TRIP":
      return { title: "Поездка началась", body: "Ваша активная Umrah доступна в iumrah." };
    case "COMPLETED":
      return { title: "Umrah завершена", body: "Бронирование завершено. Пусть Аллах примет вашу Umrah." };
    default:
      return { title: "Статус бронирования", body: `Текущий статус: ${status}` };
  }
}

function bookingKeyboard(env: Env, bookingID: string, runtimeBaseURL?: string): Record<string, unknown> {
  const rows: Record<string, unknown>[][] = [[{ text: "Обновить статус", callback_data: `refresh:${bookingID}` }]];
  const configuredBase = clean(runtimeBaseURL || env.PUBLIC_BASE_URL, 512).replace(/\/+$/, "");
  if (configuredBase) rows.push([{ text: "Живой таймер", web_app: { url: `${configuredBase}/mini?booking=${encodeURIComponent(bookingID)}` } }]);
  rows.push([{ text: "Открыть iumrah", url: "https://iumrah.app/account" }]);
  return { inline_keyboard: rows };
}

function bookingMessage(env: Env, payload: ClientTripResponse): string {
  const trip = payload.trip;
  const phase = lifecycle(payload);
  const left = countdown(phase.deadlineAt);
  const copy = statusCopy(trip.status, trip.paymentStatus);
  const lines = [
    `<b>${escapeHtml(copy.title)}</b>`,
    "",
    `Бронь: <code>${escapeHtml(bookingReference(trip))}</code>`,
    trip.startDate && trip.endDate ? `Даты: ${escapeHtml(trip.startDate)} — ${escapeHtml(trip.endDate)}` : "",
    trip.confirmationNumber ? `Подтверждение: <code>${escapeHtml(trip.confirmationNumber)}</code>` : "",
    "",
    escapeHtml(copy.body),
  ].filter(Boolean);
  if (phase.kind !== "none" && left) {
    const expired = dateMs(phase.deadlineAt) !== null && (dateMs(phase.deadlineAt) as number) <= Date.now();
    lines.push("", `<b>${escapeHtml(expired ? "Срок этапа завершён" : phase.title)}</b>`, `<code>${left}</code>`);
  }
  lines.push("", `<i>Статус синхронизирован с единой системой iumrah.</i>`);
  return lines.join("\n");
}

function requireBridge(request: Request, env: Env): boolean {
  const secret = clean(env.IUMRAH_TELEGRAM_BRIDGE_SECRET, 1024);
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}` || request.headers.get("x-iumrah-bridge-secret") === secret;
}

async function createLinkToken(request: Request, env: Env): Promise<Response> {
  // The existing high-entropy booking token is the authorization proof for linking.
  // The Worker validates it against the canonical iUmrah trip API before creating a one-time Telegram link.
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return json({ error: "INVALID_REQUEST" }, 400); }
  const bookingID = clean(body.bookingId ?? body.bookingID, 64);
  const bookingToken = clean(body.bookingToken ?? body.accessToken, 256);
  const language = clean(body.language, 16) || "ru";
  if (!validBookingID(bookingID) || bookingToken.length < 24) return json({ error: "INVALID_BOOKING" }, 400);

  let snapshot: ClientTripResponse;
  try { snapshot = await fetchTrip(env, bookingID, bookingToken); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "BOOKING_VALIDATION_FAILED" }, 404); }

  const raw = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(raw);
  const encrypted = await encryptSecret(env, bookingToken);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + LINK_TTL_SECONDS * 1000).toISOString();
  await env.DB.prepare(
    `INSERT OR REPLACE INTO telegram_link_tokens
      (token_hash, booking_id, booking_token_ciphertext, booking_token_iv, language, created_at, expires_at, used_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL)`,
  ).bind(tokenHash, bookingID, encrypted.ciphertext, encrypted.iv, language, createdAt, expiresAt).run();

  let username = clean(env.TELEGRAM_BOT_USERNAME, 64).replace(/^@/, "");
  if (!username) {
    try {
      const me = await telegramCall<{ username?: string }>(env, "getMe", {});
      username = clean(me?.username, 64).replace(/^@/, "");
    } catch {
      username = "";
    }
  }
  const startParameter = `link_${raw}`;
  const linkUrl = username ? `https://t.me/${username}?start=${startParameter}` : null;
  return json({ ok: true, booking: { bookingID, bookingDisplayNumber: snapshot.trip.bookingDisplayNumber ?? null }, startParameter, linkUrl, expiresAt });
}

async function claimLinkToken(env: Env, message: TelegramMessage, user: TelegramUser, rawToken: string, runtimeBaseURL?: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{32,60}$/.test(rawToken)) return false;
  const hash = await sha256Hex(rawToken);
  const row = await env.DB.prepare(
    `SELECT token_hash, booking_id, booking_token_ciphertext, booking_token_iv, language, expires_at, used_at
     FROM telegram_link_tokens WHERE token_hash=?1 LIMIT 1`,
  ).bind(hash).first<{
    token_hash: string; booking_id: string; booking_token_ciphertext: string; booking_token_iv: string;
    language: string | null; expires_at: string; used_at: string | null;
  }>();
  if (!row || row.used_at || Date.parse(row.expires_at) <= Date.now()) return false;

  const bookingToken = await decryptSecret(env, row.booking_token_ciphertext, row.booking_token_iv);
  let payload: ClientTripResponse;
  try { payload = await fetchTrip(env, row.booking_id, bookingToken); }
  catch { return false; }
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO telegram_bookings
        (telegram_user_id, chat_id, booking_id, booking_token_ciphertext, booking_token_iv, language,
         last_status, last_payment_status, last_confirmation_number, notifications_enabled, linked_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?10)
       ON CONFLICT(telegram_user_id, booking_id) DO UPDATE SET
         chat_id=excluded.chat_id,
         booking_token_ciphertext=excluded.booking_token_ciphertext,
         booking_token_iv=excluded.booking_token_iv,
         language=excluded.language,
         last_status=excluded.last_status,
         last_payment_status=excluded.last_payment_status,
         last_confirmation_number=excluded.last_confirmation_number,
         notifications_enabled=1,
         updated_at=excluded.updated_at`,
    ).bind(
      user.id, message.chat.id, row.booking_id, row.booking_token_ciphertext, row.booking_token_iv, row.language || user.language_code || "ru",
      payload.trip.status, payload.trip.paymentStatus ?? null, payload.trip.confirmationNumber ?? null, now,
    ),
    env.DB.prepare("UPDATE telegram_link_tokens SET used_at=?1 WHERE token_hash=?2 AND used_at IS NULL").bind(now, hash),
  ]);

  await sendMessage(
    env,
    message.chat.id,
    `<b>Telegram подключён к iumrah</b>\n\nБронь <code>${escapeHtml(bookingReference(payload.trip))}</code> привязана. Теперь изменения статуса будут приходить сюда автоматически.`,
  );
  await sendMessage(env, message.chat.id, bookingMessage(env, payload), bookingKeyboard(env, row.booking_id, runtimeBaseURL));
  return true;
}

async function linkedRowsForUser(env: Env, userID: number): Promise<LinkedBookingRow[]> {
  const result = await env.DB.prepare(
    `SELECT telegram_user_id, chat_id, booking_id, booking_token_ciphertext, booking_token_iv, language,
            last_status, last_payment_status, last_confirmation_number, notifications_enabled
     FROM telegram_bookings WHERE telegram_user_id=?1 ORDER BY updated_at DESC LIMIT 10`,
  ).bind(userID).all<LinkedBookingRow>();
  return result.results ?? [];
}

async function showBookings(env: Env, chatId: number, userID: number, runtimeBaseURL?: string): Promise<void> {
  const rows = await linkedRowsForUser(env, userID);
  if (!rows.length) {
    await sendMessage(env, chatId, `<b>Бронь ещё не подключена</b>\n\nОткройте свою бронь в iumrah и нажмите <b>«Подключить Telegram»</b>. Ссылка действует 10 минут и связывает Telegram без пароля.`);
    return;
  }
  for (const row of rows.slice(0, 3)) {
    try {
      const token = await decryptSecret(env, row.booking_token_ciphertext, row.booking_token_iv);
      const payload = await fetchTrip(env, row.booking_id, token);
      await sendMessage(env, chatId, bookingMessage(env, payload), bookingKeyboard(env, row.booking_id, runtimeBaseURL));
    } catch {
      await sendMessage(env, chatId, `<b>Не удалось обновить бронь</b>\n\n<code>${escapeHtml(row.booking_id)}</code>\nОткройте iumrah и переподключите Telegram.`);
    }
  }
}

async function refreshBooking(env: Env, callback: TelegramCallbackQuery, bookingID: string, runtimeBaseURL?: string): Promise<void> {
  const message = callback.message;
  if (!message) return;
  const row = await env.DB.prepare(
    `SELECT telegram_user_id, chat_id, booking_id, booking_token_ciphertext, booking_token_iv, language,
            last_status, last_payment_status, last_confirmation_number, notifications_enabled
     FROM telegram_bookings WHERE telegram_user_id=?1 AND booking_id=?2 LIMIT 1`,
  ).bind(callback.from.id, bookingID).first<LinkedBookingRow>();
  if (!row) { await answerCallback(env, callback.id, "Бронь не подключена"); return; }
  try {
    const token = await decryptSecret(env, row.booking_token_ciphertext, row.booking_token_iv);
    const payload = await fetchTrip(env, bookingID, token);
    await editMessage(env, message.chat.id, message.message_id, bookingMessage(env, payload), bookingKeyboard(env, bookingID, runtimeBaseURL));
    await env.DB.prepare(
      `UPDATE telegram_bookings SET last_status=?1,last_payment_status=?2,last_confirmation_number=?3,updated_at=?4
       WHERE telegram_user_id=?5 AND booking_id=?6`,
    ).bind(payload.trip.status, payload.trip.paymentStatus ?? null, payload.trip.confirmationNumber ?? null, new Date().toISOString(), callback.from.id, bookingID).run();
    await answerCallback(env, callback.id, "Статус обновлён");
  } catch {
    await answerCallback(env, callback.id, "Не удалось обновить");
  }
}

async function handleCallback(env: Env, callback: TelegramCallbackQuery, runtimeBaseURL?: string): Promise<void> {
  const data = clean(callback.data, 128);
  if (data.startsWith("refresh:")) {
    await refreshBooking(env, callback, data.slice("refresh:".length), runtimeBaseURL);
    return;
  }
  await answerCallback(env, callback.id);
}

async function handleMessage(env: Env, message: TelegramMessage, runtimeBaseURL?: string): Promise<void> {
  const text = message.text?.trim();
  if (!text || !message.from) return;
  const start = text.match(/^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]+))?$/i);
  if (start) {
    const parameter = start[1] ?? "";
    if (parameter.startsWith("link_")) {
      const ok = await claimLinkToken(env, message, message.from, parameter.slice(5), runtimeBaseURL);
      if (!ok) {
        await sendMessage(env, message.chat.id, `<b>Ссылка больше не действует</b>\n\nОткройте бронь в iumrah и создайте новую ссылку «Подключить Telegram».`);
      }
      return;
    }
    await showBookings(env, message.chat.id, message.from.id, runtimeBaseURL);
    return;
  }
  if (/^\/(booking|status)(?:@\w+)?$/i.test(text)) {
    await showBookings(env, message.chat.id, message.from.id, runtimeBaseURL);
    return;
  }
  if (/^\/help(?:@\w+)?$/i.test(text)) {
    await sendMessage(env, message.chat.id, `<b>iumrah Telegram</b>\n\n/status — статус бронирования\n/start — мои бронирования\n\nДля первой привязки используйте кнопку «Подключить Telegram» внутри iumrah.`);
    return;
  }
  await showBookings(env, message.chat.id, message.from.id, runtimeBaseURL);
}

async function handleUpdate(env: Env, update: TelegramUpdate, runtimeBaseURL?: string): Promise<void> {
  if (update.callback_query) return handleCallback(env, update.callback_query, runtimeBaseURL);
  if (update.message) return handleMessage(env, update.message, runtimeBaseURL);
}

function changed(row: LinkedBookingRow, trip: ClientTripSnapshot): boolean {
  return (row.last_status ?? "") !== trip.status ||
    (row.last_payment_status ?? "") !== (trip.paymentStatus ?? "") ||
    (row.last_confirmation_number ?? "") !== (trip.confirmationNumber ?? "");
}

async function reconcileRow(env: Env, row: LinkedBookingRow, force = false, runtimeBaseURL?: string): Promise<void> {
  if (!row.notifications_enabled) return;
  const token = await decryptSecret(env, row.booking_token_ciphertext, row.booking_token_iv);
  const payload = await fetchTrip(env, row.booking_id, token);
  if (force || changed(row, payload.trip)) {
    await sendMessage(env, row.chat_id, bookingMessage(env, payload), bookingKeyboard(env, row.booking_id, runtimeBaseURL));
  }
  await env.DB.prepare(
    `UPDATE telegram_bookings SET last_status=?1,last_payment_status=?2,last_confirmation_number=?3,updated_at=?4
     WHERE telegram_user_id=?5 AND booking_id=?6`,
  ).bind(
    payload.trip.status,
    payload.trip.paymentStatus ?? null,
    payload.trip.confirmationNumber ?? null,
    new Date().toISOString(),
    row.telegram_user_id,
    row.booking_id,
  ).run();
}

async function reconcileAll(env: Env): Promise<void> {
  await env.DB.prepare("DELETE FROM telegram_link_tokens WHERE expires_at<?1 OR used_at IS NOT NULL").bind(new Date(Date.now() - 86400000).toISOString()).run();
  const config = await env.DB.prepare("SELECT value FROM bot_config WHERE key='public_base_url' LIMIT 1").first<{ value: string }>();
  const runtimeBaseURL = clean(env.PUBLIC_BASE_URL || config?.value, 512).replace(/\/+$/, "");
  const result = await env.DB.prepare(
    `SELECT telegram_user_id, chat_id, booking_id, booking_token_ciphertext, booking_token_iv, language,
            last_status, last_payment_status, last_confirmation_number, notifications_enabled
     FROM telegram_bookings WHERE notifications_enabled=1 ORDER BY updated_at ASC LIMIT 100`,
  ).all<LinkedBookingRow>();
  for (const row of result.results ?? []) {
    try { await reconcileRow(env, row, false, runtimeBaseURL); } catch (error) { console.error("reconcile failed", row.booking_id, error); }
  }
}

async function bookingEvent(request: Request, env: Env): Promise<Response> {
  if (!requireBridge(request, env)) return json({ error: "UNAUTHORIZED" }, 401);
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return json({ error: "INVALID_REQUEST" }, 400); }
  const bookingID = clean(body.bookingId ?? body.bookingID, 64);
  if (!validBookingID(bookingID)) return json({ error: "INVALID_BOOKING" }, 400);
  const result = await env.DB.prepare(
    `SELECT telegram_user_id, chat_id, booking_id, booking_token_ciphertext, booking_token_iv, language,
            last_status, last_payment_status, last_confirmation_number, notifications_enabled
     FROM telegram_bookings WHERE booking_id=?1 AND notifications_enabled=1`,
  ).bind(bookingID).all<LinkedBookingRow>();
  let sent = 0;
  for (const row of result.results ?? []) {
    try { await reconcileRow(env, row, false, new URL(request.url).origin); sent += 1; } catch (error) { console.error("booking event failed", bookingID, error); }
  }
  return json({ ok: true, bookingID, sent });
}

async function hmac(keyBytes: ArrayBuffer | Uint8Array, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function validateTelegramInitData(env: Env, initData: string): Promise<TelegramUser | null> {
  if (!initData || initData.length > 8192) return null;
  const params = new URLSearchParams(initData);
  const expectedHash = params.get("hash")?.toLowerCase() ?? "";
  if (!/^[0-9a-f]{64}$/.test(expectedHash)) return null;
  const entries = Array.from(params.entries()).filter(([key]) => key !== "hash").sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join("\n");
  const secretKey = await hmac(encoder.encode("WebAppData"), env.TELEGRAM_BOT_TOKEN);
  const actualHash = bytesToHex(await hmac(secretKey, dataCheckString));
  if (actualHash !== expectedHash) return null;
  const authDate = Number(params.get("auth_date") ?? 0);
  if (!Number.isFinite(authDate) || Math.abs(Date.now() / 1000 - authDate) > MINI_INIT_MAX_AGE_SECONDS) return null;
  const rawUser = params.get("user");
  if (!rawUser) return null;
  try {
    const user = JSON.parse(rawUser) as TelegramUser;
    return typeof user.id === "number" && Number.isFinite(user.id) ? user : null;
  } catch { return null; }
}

function miniHTML(): string {
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>iumrah</title><script src="https://telegram.org/js/telegram-web-app.js?63"></script>
<style>
:root{color-scheme:light dark;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif}*{box-sizing:border-box}body{margin:0;background:var(--tg-theme-secondary-bg-color,#f3f4f6);color:var(--tg-theme-text-color,#111);padding:18px 16px calc(24px + env(safe-area-inset-bottom))}.wrap{max-width:620px;margin:0 auto}.brand{font-weight:800;font-size:14px;letter-spacing:-.03em;margin:4px 2px 18px}.card{background:var(--tg-theme-bg-color,#fff);border-radius:28px;padding:24px;box-shadow:0 14px 40px rgba(0,0,0,.07)}.eyebrow{font-size:10px;font-weight:800;letter-spacing:.1em;opacity:.48}.ref{font-size:15px;font-weight:750;margin-top:5px}.title{font-size:30px;line-height:1.02;letter-spacing:-.055em;margin:28px 0 10px;font-weight:780}.body{font-size:14px;line-height:1.48;opacity:.58}.timer{margin-top:24px;padding:19px;border-radius:22px;background:var(--tg-theme-secondary-bg-color,#f3f4f6)}.timer span{font-size:10px;font-weight:800;letter-spacing:.07em;opacity:.5}.timer strong{display:block;font:780 42px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.06em;margin-top:9px}.meta{display:grid;gap:9px;margin-top:18px;font-size:12px}.meta div{display:flex;justify-content:space-between;gap:16px;padding-top:9px;border-top:1px solid rgba(127,127,127,.14)}.meta span{opacity:.5}.status{margin:18px 2px 0;font-size:11px;opacity:.48;text-align:center}.error{padding:28px 20px;text-align:center;line-height:1.5}.hidden{display:none}</style></head>
<body><div class="wrap"><div class="brand">iumrah</div><section id="card" class="card hidden"><div class="eyebrow">БРОНИРОВАНИЕ</div><div id="ref" class="ref"></div><h1 id="title" class="title"></h1><p id="body" class="body"></p><div id="timer" class="timer hidden"><span id="timerTitle"></span><strong id="countdown">00:00:00</strong></div><div class="meta"><div><span>Статус</span><b id="status"></b></div><div id="datesRow"><span>Даты</span><b id="dates"></b></div></div></section><div id="error" class="error">Загружаем вашу бронь…</div><div class="status">Данные синхронизируются с единой системой iumrah.</div></div>
<script>
const tg=window.Telegram?.WebApp;tg?.ready();tg?.expand();const booking=new URLSearchParams(location.search).get('booking')||'';let deadline=null;
function tick(){if(!deadline)return;const total=Math.max(0,Math.floor((Date.parse(deadline)-Date.now())/1000));const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;document.getElementById('countdown').textContent=[h,m,s].map(v=>String(v).padStart(2,'0')).join(':')}
async function load(){try{if(!tg?.initData)throw new Error('Откройте этот экран внутри Telegram.');const r=await fetch('/mini/snapshot',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({initData:tg.initData,bookingId:booking})});const x=await r.json();if(!r.ok)throw new Error(x.error||'Не удалось загрузить бронь.');document.getElementById('ref').textContent=x.reference;document.getElementById('title').textContent=x.copy.title;document.getElementById('body').textContent=x.copy.body;document.getElementById('status').textContent=x.trip.status;const dates=[x.trip.startDate,x.trip.endDate].filter(Boolean).join(' — ');document.getElementById('dates').textContent=dates||'—';deadline=x.lifecycle.deadlineAt;if(deadline){document.getElementById('timer').classList.remove('hidden');document.getElementById('timerTitle').textContent=x.lifecycle.title;tick();setInterval(tick,1000)}document.getElementById('error').classList.add('hidden');document.getElementById('card').classList.remove('hidden')}catch(e){document.getElementById('error').textContent=e?.message||'Ошибка'}}load();
</script></body></html>`;
}

async function miniSnapshot(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return json({ error: "INVALID_REQUEST" }, 400); }
  const user = await validateTelegramInitData(env, clean(body.initData, 8192));
  if (!user) return json({ error: "TELEGRAM_AUTH_FAILED" }, 401);
  const bookingID = clean(body.bookingId, 64);
  if (!validBookingID(bookingID)) return json({ error: "INVALID_BOOKING" }, 400);
  const row = await env.DB.prepare(
    `SELECT telegram_user_id, chat_id, booking_id, booking_token_ciphertext, booking_token_iv, language,
            last_status, last_payment_status, last_confirmation_number, notifications_enabled
     FROM telegram_bookings WHERE telegram_user_id=?1 AND booking_id=?2 LIMIT 1`,
  ).bind(user.id, bookingID).first<LinkedBookingRow>();
  if (!row) return json({ error: "BOOKING_NOT_LINKED" }, 404);
  try {
    const token = await decryptSecret(env, row.booking_token_ciphertext, row.booking_token_iv);
    const payload = await fetchTrip(env, bookingID, token);
    return json({
      ok: true,
      reference: bookingReference(payload.trip),
      trip: payload.trip,
      lifecycle: lifecycle(payload),
      copy: statusCopy(payload.trip.status, payload.trip.paymentStatus),
    });
  } catch { return json({ error: "BOOKING_REFRESH_FAILED" }, 502); }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      await env.DB.prepare("INSERT INTO bot_config(key,value,updated_at) VALUES ('public_base_url',?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at")
        .bind(url.origin, new Date().toISOString()).run();
    } catch { /* The health endpoint can still respond before a first migration in local development. */ }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "iumrah-telegram-bot", version: "1.0.0", apiOrigin: apiOrigin(env) });
    }
    if (request.method === "GET" && url.pathname === "/mini") {
      return new Response(miniHTML(), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (request.method === "POST" && url.pathname === "/mini/snapshot") return miniSnapshot(request, env);
    if (request.method === "POST" && url.pathname === "/internal/link-token") return createLinkToken(request, env);
    if (request.method === "POST" && url.pathname === "/internal/booking-event") return bookingEvent(request, env);

    if (request.method !== "POST" || url.pathname !== "/webhook") return new Response("Not found", { status: 404 });
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) return new Response("Unauthorized", { status: 401 });

    let update: TelegramUpdate;
    try { update = (await request.json()) as TelegramUpdate; } catch { return new Response("Bad request", { status: 400 }); }
    try { await handleUpdate(env, update, url.origin); }
    catch (error) { console.error("update failed", error); return json({ ok: false }, 500); }
    return json({ ok: true });
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await reconcileAll(env);
  },
};
