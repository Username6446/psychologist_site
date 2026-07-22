/**
 * worker.js
 * -----------------------------------------------------------------------
 * Cloudflare Worker: приймає заявки з контактної форми сайту та
 * пересилає їх повідомленням у Telegram.
 *
 * Як це працює:
 *   1. Фронтенд (main.js) надсилає POST-запит з JSON { name, contact, message }.
 *   2. Цей Worker перевіряє дані та формує текстове повідомлення.
 *   3. Повідомлення надсилається в Telegram через офіційний Bot API.
 *   4. Worker повертає фронтенду відповідь { success: true/false }.
 *
 * Покрокову інструкцію зі створення бота, отримання Chat ID та деплою
 * дивіться у README.md.
 * -----------------------------------------------------------------------
 */

// ============================================================================
// НАЛАШТУВАННЯ — замініть плейсхолдери на власні значення
// ============================================================================

// Токен вашого Telegram-бота (отримуєте у @BotFather)
const TELEGRAM_BOT_TOKEN = "8816447684:AAF0G30cCwK2V16bjZOxc9SIzvvOHnygC1Q";

// Chat ID — куди саме бот надсилатиме повідомлення (див. README.md)
const TELEGRAM_CHAT_ID = "798311900";

// Для продакшену рекомендується вказати конкретний домен замість "*",
// наприклад: "https://your-site.pages.dev". Це захистить Worker від того,
// щоб ним міг скористатись сторонній сайт.
const ALLOWED_ORIGIN = "*";

// Стандартні CORS-заголовки, які додаються до кожної відповіді
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request) {
    // ------------------------------------------------------------------
    // Крок 1: обробка "preflight" запиту.
    // Браузер автоматично надсилає OPTIONS-запит перед основним POST,
    // коли фронтенд і Worker знаходяться на різних доменах. Якщо не
    // відповісти на нього коректно — форма на сайті просто не запрацює.
    // ------------------------------------------------------------------
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Приймаємо тільки POST-запити, решту відхиляємо
    if (request.method !== "POST") {
      return jsonResponse({ success: false, error: "Метод не підтримується" }, 405);
    }

    try {
      // ------------------------------------------------------------------
      // Крок 2: розбираємо JSON, який надіслав main.js
      // ------------------------------------------------------------------
      const data = await request.json();
      const name = (data?.name || "").toString().trim();
      const contact = (data?.contact || "").toString().trim();
      const message = (data?.message || "").toString().trim();

      // Проста серверна валідація — ніколи не довіряємо тільки фронтенду,
      // оскільки цей Worker теоретично може викликати будь-хто напряму.
      if (!name || !contact) {
        return jsonResponse(
          { success: false, error: "Заповніть обов'язкові поля (ім'я та контакт)" },
          400
        );
      }

      // ------------------------------------------------------------------
      // Крок 3: формуємо текст повідомлення для Telegram
      // ------------------------------------------------------------------
      const telegramText =
        "📩 Нова заявка з сайту\n\n" +
        `👤 Ім'я: ${name}\n` +
        `📱 Контакт: ${contact}\n` +
        `💬 Запит: ${message || "—"}`;

      // ------------------------------------------------------------------
      // Крок 4: надсилаємо повідомлення через Telegram Bot API
      // ------------------------------------------------------------------
      const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

      const telegramResponse = await fetch(telegramApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: telegramText,
        }),
      });

      if (!telegramResponse.ok) {
        // Наприклад: невірний токен бота або невірний chat_id
        const errorDetails = await telegramResponse.text();
        console.error("Telegram API error:", errorDetails);
        return jsonResponse(
          { success: false, error: "Не вдалося надіслати повідомлення в Telegram" },
          502
        );
      }

      // ------------------------------------------------------------------
      // Крок 5: все добре — повідомляємо фронтенд про успіх
      // ------------------------------------------------------------------
      return jsonResponse({ success: true }, 200);
    } catch (error) {
      console.error("Worker error:", error);
      return jsonResponse({ success: false, error: "Внутрішня помилка сервера" }, 500);
    }
  },
};

/**
 * Допоміжна функція: формує JSON-відповідь з правильними заголовками
 * (Content-Type + CORS), щоб не дублювати цей код у кожному return.
 */
function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}