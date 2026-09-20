# IUMRAH TELEGRAM BOT — V6 STATUS UI + 4-LANGUAGE LOCALIZATION

## Что обновлено

### 1) Визуальные статусы
Для каждого статуса бронирования бот теперь отправляет отдельную визуальную карточку со статусным изображением:
- `NEW` / `AVAILABILITY_CHECK` → new.webp
- `PAYMENT_PENDING` → payment_pending.webp
- `PAID` / `BOOKING_CONFIRMED` → paid.webp
- `DOCUMENTS_READY` / `READY_TO_TRAVEL` → docs.webp
- `IN_TRIP` → in_trip.webp
- `COMPLETED` → completed.webp

### 2) Более аккуратное оформление
- статус приходит как image card + caption
- caption показывает бронь, даты, confirmation, таймер этапа и пояснение
- inline buttons стали аккуратнее и локализованы

### 3) Локализация 4 языка
Поддержаны языки:
- `ru`
- `en`
- `uz`
- `uz_cyrl`

Локализованы:
- success / error / help-сообщения
- кнопки
- статусы
- подписи таймеров

### 4) Публичные status-image routes
Worker теперь отдаёт изображения по маршруту:
- `/status-image/new.webp`
- `/status-image/payment_pending.webp`
- `/status-image/paid.webp`
- `/status-image/docs.webp`
- `/status-image/in_trip.webp`
- `/status-image/completed.webp`

Telegram использует эти URL как photo source.

## Изменённые файлы
- `src/index.ts`
- `src/status-assets.ts`

## Версия health
`1.1.0`
